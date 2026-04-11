do $$
begin
  if not exists (select 1 from pg_type where typname = 'subscription_plan' and typnamespace = 'public'::regnamespace) then
    create type public.subscription_plan as enum ('free', 'starter', 'pro');
  end if;
end $$;

create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users(id) on delete cascade,
  plan public.subscription_plan not null default 'free',
  status text not null default 'active' check (status in ('trialing', 'active', 'past_due', 'canceled', 'paused')),
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly', 'yearly')),
  current_period_start timestamptz not null default timezone('utc', now()),
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  whatsapp_alerts_override boolean,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists user_subscriptions_plan_status_idx
  on public.user_subscriptions (plan, status);

create index if not exists user_subscriptions_period_end_idx
  on public.user_subscriptions (current_period_end);

drop trigger if exists user_subscriptions_set_updated_at on public.user_subscriptions;
create trigger user_subscriptions_set_updated_at
before update on public.user_subscriptions
for each row
execute function public.set_row_updated_at();

alter table public.user_subscriptions enable row level security;
alter table public.user_subscriptions force row level security;

drop policy if exists user_subscriptions_manage_own_rows on public.user_subscriptions;
create policy user_subscriptions_manage_own_rows
on public.user_subscriptions
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
