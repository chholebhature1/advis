create or replace function public.public_set_booking_reminder_email_ids(
  p_booking_id uuid,
  p_lead_email text,
  p_reminder_email_ids text[]
)
returns public.booking_meetings
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_row public.booking_meetings%rowtype;
  ids_jsonb jsonb;
  first_id text;
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

  ids_jsonb := to_jsonb(p_reminder_email_ids);

  first_id := null;
  if array_length(p_reminder_email_ids, 1) >= 1 then
    first_id := trim(coalesce(p_reminder_email_ids[1], ''));
  end if;

  update public.booking_meetings
  set
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('resendReminderEmailId', first_id, 'resendReminderEmailIds', ids_jsonb),
    updated_at = timezone('utc', now())
  where id = p_booking_id
  returning * into booking_row;

  return booking_row;
end;
$$;

revoke all on function public.public_set_booking_reminder_email_ids(uuid, text, text[]) from public;
grant execute on function public.public_set_booking_reminder_email_ids(uuid, text, text[]) to anon, authenticated;
