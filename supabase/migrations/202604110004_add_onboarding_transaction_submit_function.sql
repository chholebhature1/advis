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
  v_risk_appetite text;
  v_loss_tolerance smallint;
  v_target_horizon smallint;
  v_risk_score smallint;
  v_risk_bucket public.risk_bucket;
  v_goal_title text;
  v_goal_category public.goal_category := 'other'::public.goal_category;
  v_goal_priority public.goal_priority := 'medium'::public.goal_priority;
  v_tax_regime public.tax_regime_type := 'new'::public.tax_regime_type;
  v_preferred_channel public.communication_channel := 'whatsapp'::public.communication_channel;
  v_notes text;
  v_portfolio_notes text;
  v_quiet_hours_notes text;
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
  v_portfolio_notes := nullif(trim(coalesce(p_payload ->> 'existing_portfolio_notes', '')), '');
  v_quiet_hours_notes := nullif(trim(coalesce(p_payload ->> 'quiet_hours_notes', '')), '');

  if v_full_name = '' then
    raise exception 'full_name is required';
  end if;

  if v_email = '' then
    raise exception 'email is required';
  end if;

  v_notes := concat_ws(
    E'\n',
    nullif(trim(coalesce(p_payload ->> 'liquidity_needs_notes', '')), ''),
    v_portfolio_notes,
    v_quiet_hours_notes
  );

  v_risk_appetite := lower(coalesce(nullif(trim(p_payload ->> 'risk_appetite'), ''), 'moderate'));
  v_loss_tolerance := coalesce(nullif(p_payload ->> 'loss_tolerance_pct', '')::smallint, 0);
  v_target_horizon := coalesce(nullif(p_payload ->> 'target_horizon_years', '')::smallint, 10);

  if coalesce(p_payload ->> 'goal_1_category', '') in (
    'retirement',
    'child_education',
    'home_purchase',
    'wedding',
    'vacation',
    'wealth_creation',
    'emergency_fund',
    'other'
  ) then
    v_goal_category := (p_payload ->> 'goal_1_category')::public.goal_category;
  end if;

  if coalesce(p_payload ->> 'goal_1_priority', '') in ('high', 'medium', 'low') then
    v_goal_priority := (p_payload ->> 'goal_1_priority')::public.goal_priority;
  end if;

  if coalesce(p_payload ->> 'tax_regime', '') in ('old', 'new') then
    v_tax_regime := (p_payload ->> 'tax_regime')::public.tax_regime_type;
  end if;

  if coalesce(p_payload ->> 'preferred_channel', '') in ('whatsapp', 'email', 'sms', 'push') then
    v_preferred_channel := (p_payload ->> 'preferred_channel')::public.communication_channel;
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
      date_of_birth,
      city,
      tax_residency_country,
      occupation_title,
      employment_type,
      monthly_income_inr,
      monthly_expenses_inr,
      monthly_emi_inr,
      monthly_investable_surplus_inr,
      current_savings_inr,
      emergency_fund_months,
      liquidity_needs_notes,
      risk_appetite,
      loss_tolerance_pct,
      target_horizon_years,
      tax_regime,
      notes,
      consent_to_contact,
      onboarding_completed_at
    )
    values (
      v_user_id,
      v_full_name,
      v_email,
      v_phone,
      nullif(p_payload ->> 'date_of_birth', '')::date,
      nullif(p_payload ->> 'city', ''),
      coalesce(nullif(p_payload ->> 'tax_residency_country', ''), 'IN'),
      nullif(p_payload ->> 'occupation_title', ''),
      nullif(p_payload ->> 'employment_type', ''),
      coalesce(nullif(p_payload ->> 'monthly_income_inr', '')::numeric, 0),
      coalesce(nullif(p_payload ->> 'monthly_expenses_inr', '')::numeric, 0),
      coalesce(nullif(p_payload ->> 'monthly_emi_inr', '')::numeric, 0),
      coalesce(nullif(p_payload ->> 'monthly_investable_surplus_inr', '')::numeric, 0),
      coalesce(nullif(p_payload ->> 'current_savings_inr', '')::numeric, 0),
      coalesce(nullif(p_payload ->> 'emergency_fund_months', '')::numeric, 0),
      coalesce(nullif(p_payload ->> 'liquidity_needs_notes', ''), ''),
      v_risk_appetite,
      nullif(p_payload ->> 'loss_tolerance_pct', '')::smallint,
      coalesce(nullif(p_payload ->> 'target_horizon_years', '')::smallint, 5),
      v_tax_regime,
      coalesce(v_notes, ''),
      coalesce((p_payload ->> 'consent_contact_marketing')::boolean, false),
      v_now
    )
    returning id into v_profile_id;
  else
    update public.profiles
    set
      full_name = v_full_name,
      email = v_email,
      phone_e164 = v_phone,
      date_of_birth = nullif(p_payload ->> 'date_of_birth', '')::date,
      city = nullif(p_payload ->> 'city', ''),
      tax_residency_country = coalesce(nullif(p_payload ->> 'tax_residency_country', ''), tax_residency_country),
      occupation_title = nullif(p_payload ->> 'occupation_title', ''),
      employment_type = nullif(p_payload ->> 'employment_type', ''),
      monthly_income_inr = coalesce(nullif(p_payload ->> 'monthly_income_inr', '')::numeric, monthly_income_inr),
      monthly_expenses_inr = coalesce(nullif(p_payload ->> 'monthly_expenses_inr', '')::numeric, monthly_expenses_inr),
      monthly_emi_inr = coalesce(nullif(p_payload ->> 'monthly_emi_inr', '')::numeric, monthly_emi_inr),
      monthly_investable_surplus_inr = coalesce(nullif(p_payload ->> 'monthly_investable_surplus_inr', '')::numeric, monthly_investable_surplus_inr),
      current_savings_inr = coalesce(nullif(p_payload ->> 'current_savings_inr', '')::numeric, current_savings_inr),
      emergency_fund_months = coalesce(nullif(p_payload ->> 'emergency_fund_months', '')::numeric, emergency_fund_months),
      liquidity_needs_notes = coalesce(nullif(p_payload ->> 'liquidity_needs_notes', ''), liquidity_needs_notes),
      risk_appetite = coalesce(nullif(v_risk_appetite, ''), risk_appetite),
      loss_tolerance_pct = coalesce(nullif(p_payload ->> 'loss_tolerance_pct', '')::smallint, loss_tolerance_pct),
      target_horizon_years = coalesce(nullif(p_payload ->> 'target_horizon_years', '')::smallint, target_horizon_years),
      tax_regime = v_tax_regime,
      notes = coalesce(v_notes, notes),
      consent_to_contact = coalesce((p_payload ->> 'consent_contact_marketing')::boolean, consent_to_contact),
      onboarding_completed_at = v_now
    where id = v_profile_id
      and user_id = v_user_id;
  end if;

  v_risk_score := case
    when v_risk_appetite = 'conservative' then 30
    when v_risk_appetite = 'aggressive' then 75
    else 55
  end;

  v_risk_score := least(
    100,
    greatest(
      0,
      v_risk_score
      + least(15, greatest(0, floor(v_loss_tolerance::numeric / 4)::int))
      + least(10, greatest(0, floor(v_target_horizon::numeric / 4)::int))
    )
  );

  v_risk_bucket := case
    when v_risk_score < 40 then 'low'::public.risk_bucket
    when v_risk_score < 70 then 'medium'::public.risk_bucket
    else 'high'::public.risk_bucket
  end;

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
    nullif(p_payload ->> 'loss_tolerance_pct', '')::smallint,
    coalesce(nullif(p_payload ->> 'target_horizon_years', '')::smallint, 5),
    jsonb_build_object(
      'self_declared_appetite', v_risk_appetite,
      'risk_rationale', coalesce(nullif(p_payload ->> 'risk_rationale', ''), ''),
      'source', 'onboarding_runtime_wizard'
    )
  );

  v_goal_title := nullif(trim(coalesce(p_payload ->> 'goal_1_title', '')), '');
  if v_goal_title is not null then
    insert into public.financial_goals (
      user_id,
      profile_id,
      category,
      title,
      target_amount_inr,
      target_date,
      priority,
      notes
    )
    values (
      v_user_id,
      v_profile_id,
      v_goal_category,
      v_goal_title,
      coalesce(nullif(p_payload ->> 'goal_1_target_amount_inr', '')::numeric, 0),
      nullif(p_payload ->> 'goal_1_target_date', '')::date,
      v_goal_priority,
      'Created from onboarding runtime wizard'
    );
  end if;

  insert into public.tax_profiles (
    user_id,
    profile_id,
    financial_year,
    tax_regime,
    annual_taxable_income_inr,
    section_80c_used_inr
  )
  values (
    v_user_id,
    v_profile_id,
    v_financial_year,
    v_tax_regime,
    coalesce(nullif(p_payload ->> 'annual_taxable_income_inr', '')::numeric, 0),
    coalesce(nullif(p_payload ->> 'section_80c_used_inr', '')::numeric, 0)
  )
  on conflict (user_id, financial_year)
  do update
  set
    tax_regime = excluded.tax_regime,
    annual_taxable_income_inr = excluded.annual_taxable_income_inr,
    section_80c_used_inr = excluded.section_80c_used_inr,
    updated_at = timezone('utc', now());

  insert into public.communication_preferences (
    user_id,
    preferred_channel,
    phone_e164,
    email,
    whatsapp_opt_in,
    email_opt_in
  )
  values (
    v_user_id,
    v_preferred_channel,
    v_phone,
    v_email,
    coalesce((p_payload ->> 'whatsapp_opt_in')::boolean, false),
    coalesce((p_payload ->> 'email_opt_in')::boolean, false)
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
      coalesce((p_payload ->> 'consent_advisory_disclaimer')::boolean, false),
      'v1',
      jsonb_build_object('session_id', p_session_id)
    ),
    (
      v_user_id,
      'data_processing'::public.consent_type,
      coalesce((p_payload ->> 'consent_data_processing')::boolean, false),
      'v1',
      jsonb_build_object('session_id', p_session_id)
    ),
    (
      v_user_id,
      'contact_marketing'::public.consent_type,
      coalesce((p_payload ->> 'consent_contact_marketing')::boolean, false),
      'v1',
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
    current_screen_id = 'consent_and_review',
    completed_at = v_now,
    metadata = coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object(
        'submitted_at', v_now,
        'submission_source', 'api_transaction_submit',
        'profile_id', v_profile_id
      )
  where id = p_session_id
    and user_id = v_user_id;

  return jsonb_build_object(
    'session_id', p_session_id,
    'profile_id', v_profile_id,
    'status', 'completed'
  );
end;
$$;
