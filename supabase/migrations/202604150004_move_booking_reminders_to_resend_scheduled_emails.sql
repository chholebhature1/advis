create or replace function public.public_set_booking_reminder_email_id(
  p_booking_id uuid,
  p_lead_email text,
  p_reminder_email_id text
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

  update public.booking_meetings
  set
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('resendReminderEmailId', trim(p_reminder_email_id)),
    updated_at = timezone('utc', now())
  where id = p_booking_id
  returning * into booking_row;

  return booking_row;
end;
$$;

revoke all on function public.public_set_booking_reminder_email_id(uuid, text, text) from public;
grant execute on function public.public_set_booking_reminder_email_id(uuid, text, text) to anon, authenticated;

create or replace function public.enqueue_booking_reminders(p_booking_id uuid)
returns void
language plpgsql
set search_path = public
as $$
begin
  return;
end;
$$;

update public.booking_reminders
set
  status = 'skipped',
  provider_response = coalesce(provider_response, '{}'::jsonb) || jsonb_build_object('reason', 'resend_scheduled_email'),
  updated_at = timezone('utc', now())
where status = 'queued'
  and channel in ('email', 'sms');
