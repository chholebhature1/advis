create index if not exists financial_goals_profile_id_idx
  on public.financial_goals (profile_id);

create index if not exists financial_health_scores_profile_id_idx
  on public.financial_health_scores (profile_id);

create index if not exists risk_assessments_profile_id_idx
  on public.risk_assessments (profile_id);

create index if not exists tax_profiles_profile_id_idx
  on public.tax_profiles (profile_id);

create index if not exists portfolio_transactions_account_id_idx
  on public.portfolio_transactions (account_id);

create index if not exists portfolio_transactions_holding_id_idx
  on public.portfolio_transactions (holding_id);
