create or replace function public.enqueue_booking_reminders(p_booking_id uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  booking_row public.booking_meetings;
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

  schedule_1h := booking_row.starts_at - interval '1 hour';

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

delete from public.booking_reminders reminder
using public.booking_meetings meeting
where reminder.booking_id = meeting.id
  and reminder.status = 'queued'
  and reminder.channel in ('email', 'sms')
  and reminder.scheduled_for = meeting.starts_at - interval '24 hours';

insert into public.booking_reminders (booking_id, channel, scheduled_for)
select
  meeting.id,
  'email',
  meeting.starts_at - interval '1 hour'
from public.booking_meetings meeting
where meeting.status in ('pending', 'confirmed', 'rescheduled')
  and meeting.starts_at - interval '1 hour' > timezone('utc', now())
on conflict (booking_id, channel, scheduled_for) do nothing;

insert into public.booking_reminders (booking_id, channel, scheduled_for)
select
  meeting.id,
  'sms',
  meeting.starts_at - interval '1 hour'
from public.booking_meetings meeting
where meeting.status in ('pending', 'confirmed', 'rescheduled')
  and meeting.starts_at - interval '1 hour' > timezone('utc', now())
  and meeting.lead_phone_e164 is not null
  and char_length(trim(meeting.lead_phone_e164)) > 0
on conflict (booking_id, channel, scheduled_for) do nothing;