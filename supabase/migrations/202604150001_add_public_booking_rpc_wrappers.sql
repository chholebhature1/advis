create or replace function public.get_public_booking_availability(
  p_advisor_id uuid default null,
  p_from_date date default null,
  p_days integer default 14
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  advisor_row public.booking_advisors%rowtype;
  effective_days integer := greatest(1, least(coalesce(p_days, 14), 30));
  effective_from_date date;
  effective_to_date date;
  date_cursor date;
  rule_row public.booking_availability_rules%rowtype;
  first_minute integer;
  last_start_minute integer;
  slot_duration integer;
  minute_of_day integer;
  slot_local timestamp;
  slot_start timestamptz;
  slot_end timestamptz;
  min_bookable timestamptz := timezone('utc', now()) + interval '15 minutes';
  slots jsonb;
  dates jsonb := '[]'::jsonb;
begin
  if p_advisor_id is not null then
    select *
    into advisor_row
    from public.booking_advisors
    where id = p_advisor_id
      and is_active = true
    limit 1;
  else
    select *
    into advisor_row
    from public.booking_advisors
    where is_active = true
    order by created_at asc
    limit 1;
  end if;

  if advisor_row.id is null then
    return jsonb_build_object(
      'advisor', null,
      'generatedAt', to_char(timezone('utc', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'dates', '[]'::jsonb
    );
  end if;

  effective_from_date := coalesce(p_from_date, (timezone(advisor_row.timezone, now()))::date);
  effective_to_date := effective_from_date + effective_days;

  for date_cursor in
    select generate_series(effective_from_date, effective_to_date - 1, interval '1 day')::date
  loop
    slots := '[]'::jsonb;

    for rule_row in
      select *
      from public.booking_availability_rules
      where advisor_id = advisor_row.id
        and is_active = true
        and day_of_week = extract(dow from date_cursor)::integer
      order by start_minute asc
    loop
      slot_duration := greatest(10, coalesce(nullif(rule_row.slot_duration_mins, 0), advisor_row.meeting_duration_mins));
      first_minute := greatest(0, rule_row.start_minute + advisor_row.buffer_before_mins);
      last_start_minute := least(1440, rule_row.end_minute - advisor_row.buffer_after_mins - slot_duration);

      minute_of_day := first_minute;
      while minute_of_day <= last_start_minute loop
        slot_local := date_cursor::timestamp + make_interval(mins => minute_of_day);
        slot_start := slot_local at time zone advisor_row.timezone;
        slot_end := slot_start + make_interval(mins => slot_duration);

        if slot_start > min_bookable
          and not exists (
            select 1
            from public.booking_meetings meeting
            where meeting.advisor_id = advisor_row.id
              and meeting.status in ('pending', 'confirmed', 'rescheduled')
              and tstzrange(meeting.starts_at, meeting.ends_at, '[)') && tstzrange(slot_start, slot_end, '[)')
          )
          and not exists (
            select 1
            from public.booking_advisor_time_off time_off
            where time_off.advisor_id = advisor_row.id
              and tstzrange(time_off.starts_at, time_off.ends_at, '[)') && tstzrange(slot_start, slot_end, '[)')
          )
        then
          slots := slots || jsonb_build_array(
            jsonb_build_object(
              'startsAt', to_char(slot_start at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
              'endsAt', to_char(slot_end at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
              'timeLabel', trim(to_char(slot_local, 'FMHH12:MI AM'))
            )
          );
        end if;

        minute_of_day := minute_of_day + slot_duration;
      end loop;
    end loop;

    dates := dates || jsonb_build_array(
      jsonb_build_object(
        'dateKey', to_char(date_cursor, 'YYYY-MM-DD'),
        'weekdayLabel', to_char(date_cursor, 'Dy'),
        'monthLabel', to_char(date_cursor, 'Mon'),
        'dayNumber', extract(day from date_cursor)::integer,
        'isAvailable', jsonb_array_length(slots) > 0,
        'slots', slots
      )
    );
  end loop;

  return jsonb_build_object(
    'advisor', jsonb_build_object(
      'id', advisor_row.id,
      'displayName', advisor_row.display_name,
      'email', advisor_row.email,
      'timezone', advisor_row.timezone,
      'meetingDurationMins', advisor_row.meeting_duration_mins,
      'bufferBeforeMins', advisor_row.buffer_before_mins,
      'bufferAfterMins', advisor_row.buffer_after_mins
    ),
    'generatedAt', to_char(timezone('utc', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'dates', dates
  );
end;
$$;

create or replace function public.public_book_meeting_slot(
  p_advisor_id uuid,
  p_lead_name text,
  p_lead_email text,
  p_lead_phone_e164 text,
  p_notes text,
  p_timezone text,
  p_starts_at timestamptz,
  p_ends_at timestamptz default null,
  p_source text default 'website',
  p_metadata jsonb default '{}'::jsonb
)
returns public.booking_meetings
language plpgsql
security definer
set search_path = public
as $$
declare
  advisor_row public.booking_advisors%rowtype;
  effective_ends_at timestamptz;
begin
  if p_advisor_id is not null then
    select *
    into advisor_row
    from public.booking_advisors
    where id = p_advisor_id
      and is_active = true
    limit 1;
  else
    select *
    into advisor_row
    from public.booking_advisors
    where is_active = true
    order by created_at asc
    limit 1;
  end if;

  if advisor_row.id is null then
    raise exception 'No active booking advisor configured.';
  end if;

  if p_starts_at < timezone('utc', now()) + interval '5 minutes' then
    raise exception 'Bookings must be scheduled at least 5 minutes in advance.';
  end if;

  effective_ends_at := coalesce(
    p_ends_at,
    p_starts_at + make_interval(mins => advisor_row.meeting_duration_mins)
  );

  if effective_ends_at <= p_starts_at then
    raise exception 'endsAt must be after startsAt.';
  end if;

  return public.book_meeting_slot(
    p_advisor_id := advisor_row.id,
    p_lead_name := p_lead_name,
    p_lead_email := p_lead_email,
    p_lead_phone_e164 := p_lead_phone_e164,
    p_notes := coalesce(p_notes, ''),
    p_timezone := coalesce(nullif(trim(coalesce(p_timezone, '')), ''), 'Asia/Kolkata'),
    p_starts_at := p_starts_at,
    p_ends_at := effective_ends_at,
    p_source := coalesce(nullif(trim(coalesce(p_source, '')), ''), 'website'),
    p_metadata := coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

create or replace function public.public_cancel_booking_slot(
  p_booking_id uuid,
  p_lead_email text,
  p_reason text default ''
)
returns public.booking_meetings
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_row public.booking_meetings%rowtype;
begin
  select *
  into booking_row
  from public.booking_meetings
  where id = p_booking_id;

  if booking_row.id is null then
    raise exception 'Meeting not found.';
  end if;

  if lower(booking_row.lead_email) <> lower(trim(coalesce(p_lead_email, ''))) then
    raise exception 'leadEmail does not match this meeting.';
  end if;

  return public.cancel_booking_slot(
    p_booking_id := p_booking_id,
    p_reason := coalesce(p_reason, '')
  );
end;
$$;

create or replace function public.public_reschedule_booking_slot(
  p_booking_id uuid,
  p_lead_email text,
  p_new_starts_at timestamptz,
  p_new_ends_at timestamptz default null,
  p_reason text default ''
)
returns public.booking_meetings
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_row public.booking_meetings%rowtype;
  effective_ends_at timestamptz;
begin
  select *
  into booking_row
  from public.booking_meetings
  where id = p_booking_id;

  if booking_row.id is null then
    raise exception 'Meeting not found.';
  end if;

  if lower(booking_row.lead_email) <> lower(trim(coalesce(p_lead_email, ''))) then
    raise exception 'leadEmail does not match this meeting.';
  end if;

  if p_new_starts_at < timezone('utc', now()) + interval '5 minutes' then
    raise exception 'Reschedules must be at least 5 minutes in advance.';
  end if;

  effective_ends_at := coalesce(
    p_new_ends_at,
    p_new_starts_at + greatest(booking_row.ends_at - booking_row.starts_at, interval '10 minutes')
  );

  if effective_ends_at <= p_new_starts_at then
    raise exception 'endsAt must be after startsAt.';
  end if;

  return public.reschedule_booking_slot(
    p_booking_id := p_booking_id,
    p_new_starts_at := p_new_starts_at,
    p_new_ends_at := effective_ends_at,
    p_reason := coalesce(p_reason, '')
  );
end;
$$;

revoke all on function public.get_public_booking_availability(uuid, date, integer) from public;
revoke all on function public.public_book_meeting_slot(uuid, text, text, text, text, text, timestamptz, timestamptz, text, jsonb) from public;
revoke all on function public.public_cancel_booking_slot(uuid, text, text) from public;
revoke all on function public.public_reschedule_booking_slot(uuid, text, timestamptz, timestamptz, text) from public;

grant execute on function public.get_public_booking_availability(uuid, date, integer) to anon, authenticated;
grant execute on function public.public_book_meeting_slot(uuid, text, text, text, text, text, timestamptz, timestamptz, text, jsonb) to anon, authenticated;
grant execute on function public.public_cancel_booking_slot(uuid, text, text) to anon, authenticated;
grant execute on function public.public_reschedule_booking_slot(uuid, text, timestamptz, timestamptz, text) to anon, authenticated;
