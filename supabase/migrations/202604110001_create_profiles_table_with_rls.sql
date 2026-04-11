create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users(id) on delete set null,
  full_name text not null default '' check (char_length(trim(full_name)) between 2 and 120),
  email text not null check (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  monthly_income_inr numeric(12,2) not null default 0 check (monthly_income_inr >= 0),
  current_savings_inr numeric(14,2) not null default 0 check (current_savings_inr >= 0),
  risk_appetite text not null default 'moderate' check (risk_appetite in ('conservative', 'moderate', 'aggressive')),
  target_amount_inr numeric(14,2) not null default 0 check (target_amount_inr >= 0),
  target_horizon_years smallint not null default 5 check (target_horizon_years between 1 and 60),
  notes text not null default '',
  consent_to_contact boolean not null default false,
  source text not null default 'onboarding_web',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists profiles_user_id_idx on public.profiles (user_id);
create index if not exists profiles_created_at_idx on public.profiles (created_at desc);

create or replace function public.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_profile_updated_at();

alter table public.profiles enable row level security;
alter table public.profiles force row level security;

drop policy if exists profiles_insert_with_safe_guardrails on public.profiles;
create policy profiles_insert_with_safe_guardrails
on public.profiles
for insert
to anon, authenticated
with check (
  (
    (select auth.uid()) is null
    and user_id is null
  )
  or
  (
    (select auth.uid()) is not null
    and user_id = (select auth.uid())
  )
);

drop policy if exists profiles_select_own_rows on public.profiles;
create policy profiles_select_own_rows
on public.profiles
for select
to authenticated
using (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
);

drop policy if exists profiles_update_own_rows on public.profiles;
create policy profiles_update_own_rows
on public.profiles
for update
to authenticated
using (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
)
with check (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
);
