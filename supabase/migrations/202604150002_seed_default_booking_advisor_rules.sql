with ensured_advisor as (
  insert into public.booking_advisors (
    display_name,
    email,
    timezone,
    is_active,
    meeting_duration_mins,
    buffer_before_mins,
    buffer_after_mins
  )
  select
    'Pravix Wealth Consultant',
    'usefullother6@gmail.com',
    'Asia/Kolkata',
    true,
    30,
    0,
    0
  where not exists (
    select 1
    from public.booking_advisors
    where is_active = true
  )
  returning id
), active_advisor as (
  select id
  from ensured_advisor
  union all
  select id
  from public.booking_advisors
  where is_active = true
  order by id
  limit 1
)
insert into public.booking_availability_rules (
  advisor_id,
  day_of_week,
  start_minute,
  end_minute,
  slot_duration_mins,
  is_active
)
select
  active_advisor.id,
  weekday.day_of_week,
  600,
  1140,
  30,
  true
from active_advisor
cross join (values (1), (2), (3), (4), (5), (6)) as weekday(day_of_week)
on conflict (advisor_id, day_of_week, start_minute, end_minute) do update
set
  slot_duration_mins = excluded.slot_duration_mins,
  is_active = true;
