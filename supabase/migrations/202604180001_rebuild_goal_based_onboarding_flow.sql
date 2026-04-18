alter type public.goal_category add value if not exists 'tax_saving';
alter type public.goal_category add value if not exists 'passive_income';
alter type public.goal_category add value if not exists 'insurance_planning';

alter table public.profiles
  add column if not exists primary_financial_goal text,
  add column if not exists target_goal_horizon_band text,
  add column if not exists monthly_investment_capacity_band text,
  add column if not exists monthly_income_band text,
  add column if not exists has_existing_investments boolean,
  add column if not exists existing_investment_types text[] not null default '{}'::text[];

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_primary_financial_goal_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_primary_financial_goal_check check (
        primary_financial_goal is null
        or primary_financial_goal in (
          'wealth_creation',
          'retirement_planning',
          'child_education',
          'tax_saving',
          'passive_income',
          'insurance_planning'
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_target_goal_horizon_band_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_target_goal_horizon_band_check check (
        target_goal_horizon_band is null
        or target_goal_horizon_band in ('1_3_years', '3_5_years', '5_10_years', '10_plus_years')
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_monthly_investment_capacity_band_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_monthly_investment_capacity_band_check check (
        monthly_investment_capacity_band is null
        or monthly_investment_capacity_band in (
          '5000_10000',
          '10000_25000',
          '25000_50000',
          '50000_plus',
          'not_sure'
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_monthly_income_band_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_monthly_income_band_check check (
        monthly_income_band is null
        or monthly_income_band in (
          'below_25000',
          '25000_50000',
          '50000_100000',
          '100000_300000',
          '300000_plus'
        )
      );
  end if;
end $$;

create index if not exists profiles_primary_goal_completed_idx
  on public.profiles (primary_financial_goal, onboarding_completed_at desc);

create or replace function public.submit_onboarding_payload(
  p_session_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile_id uuid;
  v_now timestamptz := timezone('utc', now());
  v_financial_year text := to_char(v_now, 'YYYY') || '-' || to_char(v_now + interval '1 year', 'YY');

  v_full_name text;
  v_email text;
  v_phone text;

  v_primary_goal text;
  v_goal_title text;
  v_goal_category public.goal_category := 'wealth_creation'::public.goal_category;

  v_target_amount_choice text;
  v_target_amount_custom_text text;
  v_target_amount_inr numeric(14,2) := 0;

  v_target_horizon_band text;
  v_target_horizon_years smallint := 5;

  v_monthly_capacity_band text;
  v_monthly_capacity_inr numeric(12,2) := 0;

  v_monthly_income_band text;
  v_monthly_income_inr numeric(12,2) := 0;

  v_has_existing_investments boolean := false;
  v_existing_investment_types text[] := '{}'::text[];

  v_risk_preference text;
  v_risk_appetite text := 'moderate';
  v_loss_tolerance smallint := 30;
  v_risk_score smallint := 55;
  v_risk_bucket public.risk_bucket := 'medium'::public.risk_bucket;

  v_target_date date;
  v_monthly_required_inr numeric(14,2) := 0;
  v_notes text;
  v_preferred_channel public.communication_channel := 'email'::public.communication_channel;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_session_id is null then
    raise exception 'Session id is required';
  end if;

  perform 1
  from public.onboarding_sessions
  where id = p_session_id
    and user_id = v_user_id;

  if not found then
    raise exception 'Onboarding session not found for current user';
  end if;

  v_full_name := trim(coalesce(p_payload ->> 'full_name', ''));
  v_email := lower(trim(coalesce(p_payload ->> 'email', '')));
  v_phone := nullif(trim(coalesce(p_payload ->> 'phone_e164', '')), '');

  if v_full_name = '' then
    raise exception 'full_name is required';
  end if;

  if v_email = '' then
    raise exception 'email is required';
  end if;

  if v_phone is null then
    raise exception 'phone_e164 is required';
  end if;

  v_primary_goal := lower(trim(coalesce(p_payload ->> 'primary_financial_goal', '')));
  if v_primary_goal not in (
    'wealth_creation',
    'retirement_planning',
    'child_education',
    'tax_saving',
    'passive_income',
    'insurance_planning'
  ) then
    raise exception 'primary_financial_goal is required';
  end if;

  case v_primary_goal
    when 'retirement_planning' then
      v_goal_category := 'retirement'::public.goal_category;
      v_goal_title := 'Retirement Planning';
    when 'child_education' then
      v_goal_category := 'child_education'::public.goal_category;
      v_goal_title := 'Child Education';
    when 'tax_saving' then
      v_goal_category := 'tax_saving'::public.goal_category;
      v_goal_title := 'Tax Saving';
    when 'passive_income' then
      v_goal_category := 'passive_income'::public.goal_category;
      v_goal_title := 'Passive Income';
    when 'insurance_planning' then
      v_goal_category := 'insurance_planning'::public.goal_category;
      v_goal_title := 'Insurance Planning';
    else
      v_goal_category := 'wealth_creation'::public.goal_category;
      v_goal_title := 'Wealth Creation';
  end case;

  v_target_amount_choice := lower(trim(coalesce(p_payload ->> 'target_goal_amount_choice', '')));
  case v_target_amount_choice
    when '10_lakh' then v_target_amount_inr := 1000000;
    when '25_lakh' then v_target_amount_inr := 2500000;
    when '50_lakh' then v_target_amount_inr := 5000000;
    when '1_crore' then v_target_amount_inr := 10000000;
    when '5_crore' then v_target_amount_inr := 50000000;
    when 'custom' then
      v_target_amount_custom_text := regexp_replace(coalesce(p_payload ->> 'target_goal_custom_amount_inr', ''), '[₹,\s]', '', 'g');
      if v_target_amount_custom_text ~ '^[0-9]+(\.[0-9]+)?$' then
        v_target_amount_inr := v_target_amount_custom_text::numeric;
      end if;
    else
      v_target_amount_inr := 0;
  end case;

  if v_target_amount_inr <= 0 then
    raise exception 'target amount is required';
  end if;

  v_target_horizon_band := lower(trim(coalesce(p_payload ->> 'time_horizon_band', '')));
  case v_target_horizon_band
    when '1_3_years' then v_target_horizon_years := 2;
    when '3_5_years' then v_target_horizon_years := 4;
    when '5_10_years' then v_target_horizon_years := 8;
    when '10_plus_years' then v_target_horizon_years := 12;
    else
      raise exception 'time_horizon_band is required';
  end case;

  v_monthly_capacity_band := lower(trim(coalesce(p_payload ->> 'monthly_investment_capacity_band', '')));
  case v_monthly_capacity_band
    when '5000_10000' then v_monthly_capacity_inr := 7500;
    when '10000_25000' then v_monthly_capacity_inr := 17500;
    when '25000_50000' then v_monthly_capacity_inr := 37500;
    when '50000_plus' then v_monthly_capacity_inr := 60000;
    when 'not_sure' then v_monthly_capacity_inr := 0;
    else
      raise exception 'monthly_investment_capacity_band is required';
  end case;

  v_monthly_income_band := lower(trim(coalesce(p_payload ->> 'monthly_income_band', '')));
  case v_monthly_income_band
    when 'below_25000' then v_monthly_income_inr := 20000;
    when '25000_50000' then v_monthly_income_inr := 37500;
    when '50000_100000' then v_monthly_income_inr := 75000;
    when '100000_300000' then v_monthly_income_inr := 200000;
    when '300000_plus' then v_monthly_income_inr := 350000;
    else
      raise exception 'monthly_income_band is required';
  end case;

  v_has_existing_investments := lower(trim(coalesce(p_payload ->> 'has_existing_investments', 'no'))) = 'yes';

  if v_has_existing_investments and jsonb_typeof(p_payload -> 'existing_investment_types') = 'array' then
    select coalesce(array_agg(distinct normalized_value), '{}'::text[])
    into v_existing_investment_types
    from (
      select lower(trim(e.value)) as normalized_value
      from jsonb_array_elements_text(p_payload -> 'existing_investment_types') as e(value)
    ) choices
    where normalized_value in ('mutual_funds', 'stocks', 'fd', 'insurance', 'others');
  else
    v_existing_investment_types := '{}'::text[];
  end if;

  if v_has_existing_investments and coalesce(array_length(v_existing_investment_types, 1), 0) = 0 then
    raise exception 'existing_investment_types is required when has_existing_investments is yes';
  end if;

  v_risk_preference := lower(trim(coalesce(p_payload ->> 'risk_preference', '')));
  case v_risk_preference
    when 'low' then
      v_risk_appetite := 'conservative';
      v_loss_tolerance := 15;
      v_risk_score := 38;
      v_risk_bucket := 'low'::public.risk_bucket;
    when 'high' then
      v_risk_appetite := 'aggressive';
      v_loss_tolerance := 45;
      v_risk_score := 76;
      v_risk_bucket := 'high'::public.risk_bucket;
    when 'medium' then
      v_risk_appetite := 'moderate';
      v_loss_tolerance := 30;
      v_risk_score := 58;
      v_risk_bucket := 'medium'::public.risk_bucket;
    else
      raise exception 'risk_preference is required';
  end case;

  v_target_date := (v_now + make_interval(years => v_target_horizon_years::int))::date;
  v_monthly_required_inr := round((v_target_amount_inr / greatest(v_target_horizon_years * 12, 1))::numeric, 2);

  v_notes := concat_ws(
    E'\n',
    concat('Goal: ', v_goal_title),
    concat('Target amount: INR ', to_char(v_target_amount_inr, 'FM9999999999990.00')),
    concat('Horizon band: ', v_target_horizon_band),
    concat('Monthly capacity band: ', v_monthly_capacity_band),
    concat('Monthly income band: ', v_monthly_income_band),
    case when v_has_existing_investments then concat('Existing investments: ', array_to_string(v_existing_investment_types, ', ')) else 'Existing investments: none' end
  );

  if v_phone is not null then
    v_preferred_channel := 'whatsapp'::public.communication_channel;
  end if;

  select id
  into v_profile_id
  from public.profiles
  where user_id = v_user_id
  order by created_at desc
  limit 1;

  if v_profile_id is null then
    insert into public.profiles (
      user_id,
      full_name,
      email,
      phone_e164,
      monthly_income_inr,
      monthly_expenses_inr,
      monthly_emi_inr,
      monthly_investable_surplus_inr,
      current_savings_inr,
      emergency_fund_months,
      risk_appetite,
      loss_tolerance_pct,
      target_amount_inr,
      target_horizon_years,
      notes,
      source,
      consent_to_contact,
      onboarding_completed_at,
      primary_financial_goal,
      target_goal_horizon_band,
      monthly_investment_capacity_band,
      monthly_income_band,
      has_existing_investments,
      existing_investment_types
    )
    values (
      v_user_id,
      v_full_name,
      v_email,
      v_phone,
      v_monthly_income_inr,
      greatest(v_monthly_income_inr - v_monthly_capacity_inr, 0),
      0,
      v_monthly_capacity_inr,
      0,
      0,
      v_risk_appetite,
      v_loss_tolerance,
      v_target_amount_inr,
      v_target_horizon_years,
      coalesce(v_notes, ''),
      'onboarding_goal_flow_v2',
      true,
      v_now,
      v_primary_goal,
      v_target_horizon_band,
      v_monthly_capacity_band,
      v_monthly_income_band,
      v_has_existing_investments,
      v_existing_investment_types
    )
    returning id into v_profile_id;
  else
    update public.profiles
    set
      full_name = v_full_name,
      email = v_email,
      phone_e164 = v_phone,
      monthly_income_inr = v_monthly_income_inr,
      monthly_expenses_inr = greatest(v_monthly_income_inr - v_monthly_capacity_inr, 0),
      monthly_investable_surplus_inr = v_monthly_capacity_inr,
      risk_appetite = v_risk_appetite,
      loss_tolerance_pct = v_loss_tolerance,
      target_amount_inr = v_target_amount_inr,
      target_horizon_years = v_target_horizon_years,
      notes = coalesce(v_notes, notes),
      source = 'onboarding_goal_flow_v2',
      consent_to_contact = true,
      onboarding_completed_at = v_now,
      primary_financial_goal = v_primary_goal,
      target_goal_horizon_band = v_target_horizon_band,
      monthly_investment_capacity_band = v_monthly_capacity_band,
      monthly_income_band = v_monthly_income_band,
      has_existing_investments = v_has_existing_investments,
      existing_investment_types = v_existing_investment_types
    where id = v_profile_id
      and user_id = v_user_id;
  end if;

  insert into public.risk_assessments (
    user_id,
    profile_id,
    risk_score,
    risk_bucket,
    drawdown_tolerance_pct,
    time_horizon_years,
    rationale
  )
  values (
    v_user_id,
    v_profile_id,
    v_risk_score,
    v_risk_bucket,
    v_loss_tolerance,
    v_target_horizon_years,
    jsonb_build_object(
      'risk_preference', v_risk_preference,
      'monthly_investment_capacity_band', v_monthly_capacity_band,
      'primary_financial_goal', v_primary_goal,
      'source', 'onboarding_goal_flow_v2'
    )
  );

  delete from public.financial_goals
  where user_id = v_user_id
    and notes = 'Created from onboarding goal flow v2';

  insert into public.financial_goals (
    user_id,
    profile_id,
    category,
    title,
    target_amount_inr,
    target_date,
    priority,
    monthly_required_inr,
    notes
  )
  values (
    v_user_id,
    v_profile_id,
    v_goal_category,
    v_goal_title,
    v_target_amount_inr,
    v_target_date,
    'high'::public.goal_priority,
    v_monthly_required_inr,
    'Created from onboarding goal flow v2'
  );

  insert into public.tax_profiles (
    user_id,
    profile_id,
    financial_year,
    tax_regime,
    annual_taxable_income_inr,
    section_80c_used_inr,
    section_80d_used_inr,
    home_loan_interest_inr
  )
  values (
    v_user_id,
    v_profile_id,
    v_financial_year,
    'new'::public.tax_regime_type,
    v_monthly_income_inr * 12,
    0,
    0,
    0
  )
  on conflict (user_id, financial_year)
  do update
  set
    annual_taxable_income_inr = excluded.annual_taxable_income_inr,
    updated_at = timezone('utc', now());

  insert into public.communication_preferences (
    user_id,
    preferred_channel,
    phone_e164,
    email,
    whatsapp_opt_in,
    email_opt_in,
    timezone
  )
  values (
    v_user_id,
    v_preferred_channel,
    v_phone,
    v_email,
    v_phone is not null,
    true,
    'Asia/Kolkata'
  )
  on conflict (user_id)
  do update
  set
    preferred_channel = excluded.preferred_channel,
    phone_e164 = excluded.phone_e164,
    email = excluded.email,
    whatsapp_opt_in = excluded.whatsapp_opt_in,
    email_opt_in = excluded.email_opt_in,
    updated_at = timezone('utc', now());

  insert into public.user_consents (user_id, consent_type, granted, consent_version, evidence)
  values
    (
      v_user_id,
      'advisory_disclaimer'::public.consent_type,
      true,
      'v2_goal_onboarding',
      jsonb_build_object('session_id', p_session_id)
    ),
    (
      v_user_id,
      'data_processing'::public.consent_type,
      true,
      'v2_goal_onboarding',
      jsonb_build_object('session_id', p_session_id)
    ),
    (
      v_user_id,
      'contact_marketing'::public.consent_type,
      false,
      'v2_goal_onboarding',
      jsonb_build_object('session_id', p_session_id)
    )
  on conflict (user_id, consent_type, consent_version)
  do update
  set
    granted = excluded.granted,
    granted_at = timezone('utc', now()),
    evidence = excluded.evidence,
    revoked_at = case when excluded.granted then null else timezone('utc', now()) end;

  insert into public.onboarding_responses (
    user_id,
    session_id,
    screen_id,
    response_data
  )
  values (
    v_user_id,
    p_session_id,
    'final_submission_payload',
    coalesce(p_payload, '{}'::jsonb)
  );

  update public.onboarding_sessions
  set
    status = 'completed',
    current_screen_id = 'contact_details',
    completed_at = v_now,
    metadata = coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object(
        'submitted_at', v_now,
        'submission_source', 'goal_flow_v2',
        'profile_id', v_profile_id,
        'primary_goal', v_primary_goal,
        'target_amount_inr', v_target_amount_inr
      )
  where id = p_session_id
    and user_id = v_user_id;

  return jsonb_build_object(
    'session_id', p_session_id,
    'profile_id', v_profile_id,
    'status', 'completed',
    'primary_goal', v_primary_goal,
    'target_amount_inr', v_target_amount_inr
  );
end;
$$;
