create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'risk_bucket' and typnamespace = 'public'::regnamespace) then
    create type public.risk_bucket as enum ('low', 'medium', 'high');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'goal_category' and typnamespace = 'public'::regnamespace) then
    create type public.goal_category as enum (
      'retirement',
      'child_education',
      'home_purchase',
      'wedding',
      'vacation',
      'wealth_creation',
      'emergency_fund',
      'other'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'goal_priority' and typnamespace = 'public'::regnamespace) then
    create type public.goal_priority as enum ('high', 'medium', 'low');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'tax_regime_type' and typnamespace = 'public'::regnamespace) then
    create type public.tax_regime_type as enum ('old', 'new');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'communication_channel' and typnamespace = 'public'::regnamespace) then
    create type public.communication_channel as enum ('whatsapp', 'email', 'sms', 'push');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'alert_type' and typnamespace = 'public'::regnamespace) then
    create type public.alert_type as enum ('market_crash', 'rebalance', 'sip_due', 'tax_deadline', 'goal_slippage');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'investment_account_type' and typnamespace = 'public'::regnamespace) then
    create type public.investment_account_type as enum ('brokerage', 'mutual_fund', 'pension', 'crypto', 'other');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'consent_type' and typnamespace = 'public'::regnamespace) then
    create type public.consent_type as enum ('advisory_disclaimer', 'data_processing', 'contact_marketing', 'terms_of_service');
  end if;
end $$;

alter table public.profiles
  add column if not exists phone_e164 text,
  add column if not exists date_of_birth date,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists country_code text not null default 'IN',
  add column if not exists tax_residency_country text not null default 'IN',
  add column if not exists occupation_title text,
  add column if not exists employment_type text,
  add column if not exists monthly_expenses_inr numeric(12,2) not null default 0,
  add column if not exists monthly_emi_inr numeric(12,2) not null default 0,
  add column if not exists emergency_fund_months numeric(6,2) not null default 0,
  add column if not exists monthly_investable_surplus_inr numeric(12,2) not null default 0,
  add column if not exists loss_tolerance_pct smallint,
  add column if not exists liquidity_needs_notes text not null default '',
  add column if not exists tax_regime public.tax_regime_type,
  add column if not exists kyc_status text not null default 'not_started',
  add column if not exists pan_last4 text,
  add column if not exists onboarding_completed_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_country_code_len_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_country_code_len_check check (char_length(country_code) = 2);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_tax_residency_country_len_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_tax_residency_country_len_check check (char_length(tax_residency_country) = 2);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_monthly_expenses_non_negative_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_monthly_expenses_non_negative_check check (monthly_expenses_inr >= 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_monthly_emi_non_negative_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_monthly_emi_non_negative_check check (monthly_emi_inr >= 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_emergency_fund_non_negative_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_emergency_fund_non_negative_check check (emergency_fund_months >= 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_investable_surplus_non_negative_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_investable_surplus_non_negative_check check (monthly_investable_surplus_inr >= 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_loss_tolerance_range_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_loss_tolerance_range_check check (loss_tolerance_pct is null or loss_tolerance_pct between 0 and 100);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_employment_type_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_employment_type_check check (
        employment_type is null
        or employment_type in ('salaried', 'business_owner', 'professional', 'student', 'retired', 'homemaker', 'other')
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_kyc_status_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_kyc_status_check check (kyc_status in ('not_started', 'pending', 'verified', 'rejected'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_pan_last4_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_pan_last4_check check (pan_last4 is null or pan_last4 ~ '^[A-Z0-9]{4}$');
  end if;
end $$;

create index if not exists profiles_onboarding_completed_at_idx on public.profiles (onboarding_completed_at desc);

create table if not exists public.onboarding_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  current_screen_id text,
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists onboarding_sessions_user_id_idx on public.onboarding_sessions (user_id, created_at desc);
create index if not exists onboarding_sessions_status_idx on public.onboarding_sessions (status);

create table if not exists public.onboarding_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  session_id uuid not null references public.onboarding_sessions(id) on delete cascade,
  screen_id text not null,
  response_data jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists onboarding_responses_user_id_idx on public.onboarding_responses (user_id, submitted_at desc);
create index if not exists onboarding_responses_session_screen_idx on public.onboarding_responses (session_id, screen_id);

create table if not exists public.risk_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  risk_score smallint not null check (risk_score between 0 and 100),
  risk_bucket public.risk_bucket not null,
  drawdown_tolerance_pct smallint check (drawdown_tolerance_pct between 0 and 100),
  volatility_tolerance_pct smallint check (volatility_tolerance_pct between 0 and 100),
  time_horizon_years smallint check (time_horizon_years between 1 and 60),
  rationale jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists risk_assessments_user_id_idx on public.risk_assessments (user_id, created_at desc);

create table if not exists public.financial_health_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  score smallint not null check (score between 0 and 100),
  savings_ratio_pct numeric(5,2) check (savings_ratio_pct between 0 and 100),
  debt_to_income_ratio_pct numeric(5,2) check (debt_to_income_ratio_pct between 0 and 100),
  emergency_fund_months numeric(6,2) check (emergency_fund_months >= 0),
  score_breakdown jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists financial_health_scores_user_id_idx on public.financial_health_scores (user_id, created_at desc);

create table if not exists public.financial_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  category public.goal_category not null default 'other',
  title text not null,
  target_amount_inr numeric(14,2) not null check (target_amount_inr >= 0),
  target_date date,
  priority public.goal_priority not null default 'medium',
  current_allocated_inr numeric(14,2) not null default 0 check (current_allocated_inr >= 0),
  monthly_required_inr numeric(14,2) not null default 0 check (monthly_required_inr >= 0),
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists financial_goals_user_id_idx on public.financial_goals (user_id, priority, target_date);

create table if not exists public.tax_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  financial_year text not null,
  tax_regime public.tax_regime_type not null default 'new',
  annual_taxable_income_inr numeric(14,2) not null default 0 check (annual_taxable_income_inr >= 0),
  section_80c_used_inr numeric(14,2) not null default 0 check (section_80c_used_inr >= 0),
  section_80d_used_inr numeric(14,2) not null default 0 check (section_80d_used_inr >= 0),
  home_loan_interest_inr numeric(14,2) not null default 0 check (home_loan_interest_inr >= 0),
  capital_gains_short_term_inr numeric(14,2) not null default 0,
  capital_gains_long_term_inr numeric(14,2) not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, financial_year)
);

create index if not exists tax_profiles_user_id_idx on public.tax_profiles (user_id, financial_year desc);

create table if not exists public.communication_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users(id) on delete cascade,
  preferred_channel public.communication_channel not null default 'whatsapp',
  phone_e164 text,
  email text,
  whatsapp_opt_in boolean not null default false,
  email_opt_in boolean not null default false,
  push_opt_in boolean not null default false,
  quiet_hours_start time,
  quiet_hours_end time,
  timezone text not null default 'Asia/Kolkata',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.alert_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  alert_type public.alert_type not null,
  enabled boolean not null default true,
  threshold_pct numeric(5,2),
  frequency text not null default 'daily' check (frequency in ('realtime', 'daily', 'weekly', 'monthly')),
  delivery_channel public.communication_channel not null default 'whatsapp',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, alert_type)
);

create index if not exists alert_preferences_user_id_idx on public.alert_preferences (user_id, enabled);

create table if not exists public.portfolio_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  provider text not null,
  account_type public.investment_account_type not null,
  masked_account_ref text,
  base_currency text not null default 'INR',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists portfolio_accounts_user_id_idx on public.portfolio_accounts (user_id, is_active);

create table if not exists public.portfolio_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id uuid not null references public.portfolio_accounts(id) on delete cascade,
  instrument_symbol text not null,
  instrument_name text not null,
  asset_class text not null,
  sector text,
  quantity numeric(20,6) not null default 0 check (quantity >= 0),
  average_buy_price_inr numeric(14,2) not null default 0 check (average_buy_price_inr >= 0),
  current_price_inr numeric(14,2) not null default 0 check (current_price_inr >= 0),
  last_synced_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (account_id, instrument_symbol)
);

create index if not exists portfolio_holdings_user_id_idx on public.portfolio_holdings (user_id, asset_class);

create table if not exists public.portfolio_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id uuid not null references public.portfolio_accounts(id) on delete cascade,
  holding_id uuid references public.portfolio_holdings(id) on delete set null,
  transaction_type text not null check (transaction_type in ('buy', 'sell', 'sip', 'swp', 'dividend', 'interest', 'fee', 'tax')),
  transaction_date date not null,
  quantity numeric(20,6) check (quantity is null or quantity >= 0),
  unit_price_inr numeric(14,2) check (unit_price_inr is null or unit_price_inr >= 0),
  gross_amount_inr numeric(14,2) not null default 0,
  fees_inr numeric(14,2) not null default 0,
  taxes_inr numeric(14,2) not null default 0,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists portfolio_transactions_user_id_idx on public.portfolio_transactions (user_id, transaction_date desc);

create table if not exists public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  consent_type public.consent_type not null,
  granted boolean not null,
  consent_version text not null,
  granted_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, consent_type, consent_version)
);

create index if not exists user_consents_user_id_idx on public.user_consents (user_id, consent_type, granted_at desc);

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

drop trigger if exists onboarding_sessions_set_updated_at on public.onboarding_sessions;
create trigger onboarding_sessions_set_updated_at
before update on public.onboarding_sessions
for each row
execute function public.set_row_updated_at();

drop trigger if exists financial_goals_set_updated_at on public.financial_goals;
create trigger financial_goals_set_updated_at
before update on public.financial_goals
for each row
execute function public.set_row_updated_at();

drop trigger if exists tax_profiles_set_updated_at on public.tax_profiles;
create trigger tax_profiles_set_updated_at
before update on public.tax_profiles
for each row
execute function public.set_row_updated_at();

drop trigger if exists communication_preferences_set_updated_at on public.communication_preferences;
create trigger communication_preferences_set_updated_at
before update on public.communication_preferences
for each row
execute function public.set_row_updated_at();

drop trigger if exists alert_preferences_set_updated_at on public.alert_preferences;
create trigger alert_preferences_set_updated_at
before update on public.alert_preferences
for each row
execute function public.set_row_updated_at();

drop trigger if exists portfolio_accounts_set_updated_at on public.portfolio_accounts;
create trigger portfolio_accounts_set_updated_at
before update on public.portfolio_accounts
for each row
execute function public.set_row_updated_at();

drop trigger if exists portfolio_holdings_set_updated_at on public.portfolio_holdings;
create trigger portfolio_holdings_set_updated_at
before update on public.portfolio_holdings
for each row
execute function public.set_row_updated_at();

alter table public.onboarding_sessions enable row level security;
alter table public.onboarding_sessions force row level security;

drop policy if exists onboarding_sessions_manage_own_rows on public.onboarding_sessions;
create policy onboarding_sessions_manage_own_rows
on public.onboarding_sessions
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

alter table public.onboarding_responses enable row level security;
alter table public.onboarding_responses force row level security;

drop policy if exists onboarding_responses_manage_own_rows on public.onboarding_responses;
create policy onboarding_responses_manage_own_rows
on public.onboarding_responses
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

alter table public.risk_assessments enable row level security;
alter table public.risk_assessments force row level security;

drop policy if exists risk_assessments_manage_own_rows on public.risk_assessments;
create policy risk_assessments_manage_own_rows
on public.risk_assessments
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

alter table public.financial_health_scores enable row level security;
alter table public.financial_health_scores force row level security;

drop policy if exists financial_health_scores_manage_own_rows on public.financial_health_scores;
create policy financial_health_scores_manage_own_rows
on public.financial_health_scores
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

alter table public.financial_goals enable row level security;
alter table public.financial_goals force row level security;

drop policy if exists financial_goals_manage_own_rows on public.financial_goals;
create policy financial_goals_manage_own_rows
on public.financial_goals
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

alter table public.tax_profiles enable row level security;
alter table public.tax_profiles force row level security;

drop policy if exists tax_profiles_manage_own_rows on public.tax_profiles;
create policy tax_profiles_manage_own_rows
on public.tax_profiles
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

alter table public.communication_preferences enable row level security;
alter table public.communication_preferences force row level security;

drop policy if exists communication_preferences_manage_own_rows on public.communication_preferences;
create policy communication_preferences_manage_own_rows
on public.communication_preferences
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

alter table public.alert_preferences enable row level security;
alter table public.alert_preferences force row level security;

drop policy if exists alert_preferences_manage_own_rows on public.alert_preferences;
create policy alert_preferences_manage_own_rows
on public.alert_preferences
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

alter table public.portfolio_accounts enable row level security;
alter table public.portfolio_accounts force row level security;

drop policy if exists portfolio_accounts_manage_own_rows on public.portfolio_accounts;
create policy portfolio_accounts_manage_own_rows
on public.portfolio_accounts
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

alter table public.portfolio_holdings enable row level security;
alter table public.portfolio_holdings force row level security;

drop policy if exists portfolio_holdings_manage_own_rows on public.portfolio_holdings;
create policy portfolio_holdings_manage_own_rows
on public.portfolio_holdings
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

alter table public.portfolio_transactions enable row level security;
alter table public.portfolio_transactions force row level security;

drop policy if exists portfolio_transactions_manage_own_rows on public.portfolio_transactions;
create policy portfolio_transactions_manage_own_rows
on public.portfolio_transactions
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

alter table public.user_consents enable row level security;
alter table public.user_consents force row level security;

drop policy if exists user_consents_manage_own_rows on public.user_consents;
create policy user_consents_manage_own_rows
on public.user_consents
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
