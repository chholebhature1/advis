create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create or replace function public.set_row_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'booking_status' and typnamespace = 'public'::regnamespace) then
    create type public.booking_status as enum ('pending', 'confirmed', 'rescheduled', 'cancelled', 'completed', 'no_show');
  end if;
end $$;

create table if not exists public.booking_advisors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  display_name text not null,
  email text not null,
  timezone text not null default 'Asia/Kolkata',
  is_active boolean not null default true,
  meeting_duration_mins smallint not null default 30 check (meeting_duration_mins between 10 and 180),
  buffer_before_mins smallint not null default 0 check (buffer_before_mins between 0 and 60),
  buffer_after_mins smallint not null default 0 check (buffer_after_mins between 0 and 60),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists booking_advisors_is_active_idx on public.booking_advisors (is_active, created_at);

create table if not exists public.booking_availability_rules (
  id uuid primary key default gen_random_uuid(),
  advisor_id uuid not null references public.booking_advisors(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_minute smallint not null check (start_minute between 0 and 1439),
  end_minute smallint not null check (end_minute between 1 and 1440),
  slot_duration_mins smallint not null default 30 check (slot_duration_mins between 10 and 180),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (end_minute > start_minute)
);

create index if not exists booking_availability_rules_advisor_day_idx
  on public.booking_availability_rules (advisor_id, day_of_week, is_active);

create unique index if not exists booking_availability_rules_unique_window_idx
  on public.booking_availability_rules (advisor_id, day_of_week, start_minute, end_minute);

create table if not exists public.booking_advisor_time_off (
  id uuid primary key default gen_random_uuid(),
  advisor_id uuid not null references public.booking_advisors(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (ends_at > starts_at)
);

create index if not exists booking_advisor_time_off_range_idx
  on public.booking_advisor_time_off (advisor_id, starts_at, ends_at);

create table if not exists public.booking_meetings (
  id uuid primary key default gen_random_uuid(),
  advisor_id uuid not null references public.booking_advisors(id) on delete restrict,
  lead_name text not null check (char_length(trim(lead_name)) between 2 and 120),
  lead_email text not null check (lead_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  lead_phone_e164 text,
  notes text not null default '',
  source text not null default 'website',
  timezone text not null default 'Asia/Kolkata',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.booking_status not null default 'confirmed',
  cancel_reason text,
  reschedule_count integer not null default 0 check (reschedule_count >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (ends_at > starts_at)
);

create index if not exists booking_meetings_advisor_starts_at_idx
  on public.booking_meetings (advisor_id, starts_at);

create index if not exists booking_meetings_status_idx
  on public.booking_meetings (status, starts_at);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'booking_meetings_no_overlap'
      and conrelid = 'public.booking_meetings'::regclass
  ) then
    alter table public.booking_meetings
      add constraint booking_meetings_no_overlap
      exclude using gist (
        advisor_id with =,
        tstzrange(starts_at, ends_at, '[)') with &&
      )
      where (status in ('pending', 'confirmed', 'rescheduled'));
  end if;
end $$;

create table if not exists public.booking_reminders (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.booking_meetings(id) on delete cascade,
  channel public.communication_channel not null,
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'skipped')),
  attempt_count smallint not null default 0 check (attempt_count between 0 and 10),
  provider text,
  provider_message_id text,
  provider_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (booking_id, channel, scheduled_for)
);

create index if not exists booking_reminders_due_idx
  on public.booking_reminders (status, scheduled_for);

create table if not exists public.booking_activity_log (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.booking_meetings(id) on delete cascade,
  event_type text not null check (event_type in ('created', 'rescheduled', 'cancelled', 'reminder_sent', 'reminder_failed')),
  event_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists booking_activity_log_booking_id_idx
  on public.booking_activity_log (booking_id, created_at desc);

create or replace function public.enqueue_booking_reminders(p_booking_id uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  booking_row public.booking_meetings;
  schedule_24h timestamptz;
  schedule_1h timestamptz;
begin
  select *
  into booking_row
  from public.booking_meetings
  where id = p_booking_id;

  if not found then
    return;
  end if;

  if booking_row.status not in ('pending', 'confirmed', 'rescheduled') then
    return;
  end if;

  schedule_24h := booking_row.starts_at - interval '24 hours';
  schedule_1h := booking_row.starts_at - interval '1 hour';

  if schedule_24h > timezone('utc', now()) then
    insert into public.booking_reminders (booking_id, channel, scheduled_for)
    values (booking_row.id, 'email', schedule_24h)
    on conflict (booking_id, channel, scheduled_for) do nothing;

    if booking_row.lead_phone_e164 is not null and char_length(trim(booking_row.lead_phone_e164)) > 0 then
      insert into public.booking_reminders (booking_id, channel, scheduled_for)
      values (booking_row.id, 'sms', schedule_24h)
      on conflict (booking_id, channel, scheduled_for) do nothing;
    end if;
  end if;

  if schedule_1h > timezone('utc', now()) then
    insert into public.booking_reminders (booking_id, channel, scheduled_for)
    values (booking_row.id, 'email', schedule_1h)
    on conflict (booking_id, channel, scheduled_for) do nothing;

    if booking_row.lead_phone_e164 is not null and char_length(trim(booking_row.lead_phone_e164)) > 0 then
      insert into public.booking_reminders (booking_id, channel, scheduled_for)
      values (booking_row.id, 'sms', schedule_1h)
      on conflict (booking_id, channel, scheduled_for) do nothing;
    end if;
  end if;
end;
$$;

create or replace function public.book_meeting_slot(
  p_advisor_id uuid,
  p_lead_name text,
  p_lead_email text,
  p_lead_phone_e164 text,
  p_notes text,
  p_timezone text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_source text default 'website',
  p_metadata jsonb default '{}'::jsonb
)
returns public.booking_meetings
language plpgsql
set search_path = public
as $$
declare
  inserted_row public.booking_meetings;
begin
  if p_starts_at >= p_ends_at then
    raise exception 'Meeting end time must be after start time.';
  end if;

  insert into public.booking_meetings (
    advisor_id,
    lead_name,
    lead_email,
    lead_phone_e164,
    notes,
    timezone,
    starts_at,
    ends_at,
    source,
    metadata,
    status
  )
  values (
    p_advisor_id,
    trim(p_lead_name),
    lower(trim(p_lead_email)),
    nullif(trim(coalesce(p_lead_phone_e164, '')), ''),
    coalesce(p_notes, ''),
    coalesce(nullif(trim(coalesce(p_timezone, '')), ''), 'Asia/Kolkata'),
    p_starts_at,
    p_ends_at,
    coalesce(nullif(trim(coalesce(p_source, '')), ''), 'website'),
    coalesce(p_metadata, '{}'::jsonb),
    'confirmed'
  )
  returning * into inserted_row;

  perform public.enqueue_booking_reminders(inserted_row.id);

  insert into public.booking_activity_log (booking_id, event_type, event_payload)
  values (
    inserted_row.id,
    'created',
    jsonb_build_object('source', inserted_row.source, 'starts_at', inserted_row.starts_at, 'ends_at', inserted_row.ends_at)
  );

  return inserted_row;
end;
$$;

create or replace function public.reschedule_booking_slot(
  p_booking_id uuid,
  p_new_starts_at timestamptz,
  p_new_ends_at timestamptz,
  p_reason text default ''
)
returns public.booking_meetings
language plpgsql
set search_path = public
as $$
declare
  updated_row public.booking_meetings;
begin
  if p_new_starts_at >= p_new_ends_at then
    raise exception 'Rescheduled end time must be after start time.';
  end if;

  update public.booking_meetings
  set
    starts_at = p_new_starts_at,
    ends_at = p_new_ends_at,
    status = 'rescheduled',
    reschedule_count = reschedule_count + 1,
    cancel_reason = null,
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('last_reschedule_reason', coalesce(p_reason, '')),
    updated_at = timezone('utc', now())
  where id = p_booking_id
    and status in ('pending', 'confirmed', 'rescheduled')
  returning * into updated_row;

  if not found then
    raise exception 'Booking cannot be rescheduled in its current state.';
  end if;

  delete from public.booking_reminders
  where booking_id = updated_row.id
    and status = 'queued';

  perform public.enqueue_booking_reminders(updated_row.id);

  insert into public.booking_activity_log (booking_id, event_type, event_payload)
  values (
    updated_row.id,
    'rescheduled',
    jsonb_build_object(
      'reason', coalesce(p_reason, ''),
      'starts_at', updated_row.starts_at,
      'ends_at', updated_row.ends_at,
      'reschedule_count', updated_row.reschedule_count
    )
  );

  return updated_row;
end;
$$;

create or replace function public.cancel_booking_slot(
  p_booking_id uuid,
  p_reason text default ''
)
returns public.booking_meetings
language plpgsql
set search_path = public
as $$
declare
  updated_row public.booking_meetings;
begin
  update public.booking_meetings
  set
    status = 'cancelled',
    cancel_reason = coalesce(nullif(trim(coalesce(p_reason, '')), ''), 'Cancelled by user request'),
    updated_at = timezone('utc', now())
  where id = p_booking_id
    and status in ('pending', 'confirmed', 'rescheduled')
  returning * into updated_row;

  if not found then
    raise exception 'Booking cannot be cancelled in its current state.';
  end if;

  update public.booking_reminders
  set
    status = 'skipped',
    provider_response = provider_response || jsonb_build_object('reason', 'booking_cancelled'),
    updated_at = timezone('utc', now())
  where booking_id = updated_row.id
    and status = 'queued';

  insert into public.booking_activity_log (booking_id, event_type, event_payload)
  values (
    updated_row.id,
    'cancelled',
    jsonb_build_object('reason', updated_row.cancel_reason)
  );

  return updated_row;
end;
$$;

drop trigger if exists booking_advisors_set_updated_at on public.booking_advisors;
create trigger booking_advisors_set_updated_at
before update on public.booking_advisors
for each row
execute function public.set_row_updated_at();

drop trigger if exists booking_availability_rules_set_updated_at on public.booking_availability_rules;
create trigger booking_availability_rules_set_updated_at
before update on public.booking_availability_rules
for each row
execute function public.set_row_updated_at();

drop trigger if exists booking_advisor_time_off_set_updated_at on public.booking_advisor_time_off;
create trigger booking_advisor_time_off_set_updated_at
before update on public.booking_advisor_time_off
for each row
execute function public.set_row_updated_at();

drop trigger if exists booking_meetings_set_updated_at on public.booking_meetings;
create trigger booking_meetings_set_updated_at
before update on public.booking_meetings
for each row
execute function public.set_row_updated_at();

drop trigger if exists booking_reminders_set_updated_at on public.booking_reminders;
create trigger booking_reminders_set_updated_at
before update on public.booking_reminders
for each row
execute function public.set_row_updated_at();

alter table public.booking_advisors enable row level security;
alter table public.booking_advisors force row level security;

alter table public.booking_availability_rules enable row level security;
alter table public.booking_availability_rules force row level security;

alter table public.booking_advisor_time_off enable row level security;
alter table public.booking_advisor_time_off force row level security;

alter table public.booking_meetings enable row level security;
alter table public.booking_meetings force row level security;

alter table public.booking_reminders enable row level security;
alter table public.booking_reminders force row level security;

alter table public.booking_activity_log enable row level security;
alter table public.booking_activity_log force row level security;

drop policy if exists booking_advisors_public_read on public.booking_advisors;
create policy booking_advisors_public_read
on public.booking_advisors
for select
to anon, authenticated
using (is_active = true);

drop policy if exists booking_advisors_manage_own_rows on public.booking_advisors;
create policy booking_advisors_manage_own_rows
on public.booking_advisors
for all
to authenticated
using (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
)
with check (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
);

drop policy if exists booking_availability_rules_manage_own_rows on public.booking_availability_rules;
create policy booking_availability_rules_manage_own_rows
on public.booking_availability_rules
for all
to authenticated
using (
  exists (
    select 1
    from public.booking_advisors advisor
    where advisor.id = booking_availability_rules.advisor_id
      and advisor.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.booking_advisors advisor
    where advisor.id = booking_availability_rules.advisor_id
      and advisor.user_id = (select auth.uid())
  )
);

drop policy if exists booking_advisor_time_off_manage_own_rows on public.booking_advisor_time_off;
create policy booking_advisor_time_off_manage_own_rows
on public.booking_advisor_time_off
for all
to authenticated
using (
  exists (
    select 1
    from public.booking_advisors advisor
    where advisor.id = booking_advisor_time_off.advisor_id
      and advisor.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.booking_advisors advisor
    where advisor.id = booking_advisor_time_off.advisor_id
      and advisor.user_id = (select auth.uid())
  )
);

drop policy if exists booking_meetings_manage_own_rows on public.booking_meetings;
create policy booking_meetings_manage_own_rows
on public.booking_meetings
for all
to authenticated
using (
  exists (
    select 1
    from public.booking_advisors advisor
    where advisor.id = booking_meetings.advisor_id
      and advisor.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.booking_advisors advisor
    where advisor.id = booking_meetings.advisor_id
      and advisor.user_id = (select auth.uid())
  )
);

drop policy if exists booking_reminders_manage_own_rows on public.booking_reminders;
create policy booking_reminders_manage_own_rows
on public.booking_reminders
for all
to authenticated
using (
  exists (
    select 1
    from public.booking_meetings meeting
    join public.booking_advisors advisor on advisor.id = meeting.advisor_id
    where meeting.id = booking_reminders.booking_id
      and advisor.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.booking_meetings meeting
    join public.booking_advisors advisor on advisor.id = meeting.advisor_id
    where meeting.id = booking_reminders.booking_id
      and advisor.user_id = (select auth.uid())
  )
);

drop policy if exists booking_activity_log_manage_own_rows on public.booking_activity_log;
create policy booking_activity_log_manage_own_rows
on public.booking_activity_log
for all
to authenticated
using (
  exists (
    select 1
    from public.booking_meetings meeting
    join public.booking_advisors advisor on advisor.id = meeting.advisor_id
    where meeting.id = booking_activity_log.booking_id
      and advisor.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.booking_meetings meeting
    join public.booking_advisors advisor on advisor.id = meeting.advisor_id
    where meeting.id = booking_activity_log.booking_id
      and advisor.user_id = (select auth.uid())
  )
);
