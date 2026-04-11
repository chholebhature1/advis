# Onboarding Questionnaire to Supabase Schema Map

This map mirrors `src/lib/onboarding/questionnaire-flow.ts` and documents where each response must be persisted.

## Screen 1: `identity_contact`
- `full_name` -> `profiles.full_name`
- `email` -> `profiles.email`
- `phone_e164` -> `profiles.phone_e164`
- `date_of_birth` -> `profiles.date_of_birth`
- `city` -> `profiles.city`
- `tax_residency_country` -> `profiles.tax_residency_country`

## Screen 2: `income_expense`
- `occupation_title` -> `profiles.occupation_title`
- `employment_type` -> `profiles.employment_type`
- `monthly_income_inr` -> `profiles.monthly_income_inr`
- `monthly_expenses_inr` -> `profiles.monthly_expenses_inr`
- `monthly_emi_inr` -> `profiles.monthly_emi_inr`
- `monthly_investable_surplus_inr` -> `profiles.monthly_investable_surplus_inr`

## Screen 3: `safety_buffer`
- `current_savings_inr` -> `profiles.current_savings_inr`
- `emergency_fund_months` -> `profiles.emergency_fund_months`
- `liquidity_needs_notes` -> `profiles.liquidity_needs_notes`

## Screen 4: `goals`
- `goal_1_title` -> `financial_goals.title`
- `goal_1_category` -> `financial_goals.category`
- `goal_1_target_amount_inr` -> `financial_goals.target_amount_inr`
- `goal_1_target_date` -> `financial_goals.target_date`
- `goal_1_priority` -> `financial_goals.priority`

## Screen 5: `risk_profile`
- `risk_appetite` -> `profiles.risk_appetite`
- `loss_tolerance_pct` -> `profiles.loss_tolerance_pct`
- `target_horizon_years` -> `profiles.target_horizon_years`
- `risk_rationale` -> `risk_assessments.rationale`

## Screen 6: `portfolio_and_tax`
- `tax_regime` -> `profiles.tax_regime`
- `annual_taxable_income_inr` -> `tax_profiles.annual_taxable_income_inr`
- `section_80c_used_inr` -> `tax_profiles.section_80c_used_inr`
- `section_80d_used_inr` -> `tax_profiles.section_80d_used_inr`
- `home_loan_interest_inr` -> `tax_profiles.home_loan_interest_inr`
- `existing_portfolio_notes` -> `onboarding_responses.response_data`

## Screen 7: `alerts_and_delivery`
- `preferred_channel` -> `communication_preferences.preferred_channel`
- `whatsapp_opt_in` -> `communication_preferences.whatsapp_opt_in`
- `email_opt_in` -> `communication_preferences.email_opt_in`
- `quiet_hours_notes` -> `onboarding_responses.response_data`

## Screen 8: `consent_and_review`
- `consent_advisory_disclaimer` -> `user_consents.granted`
- `consent_data_processing` -> `user_consents.granted`
- `consent_contact_marketing` -> `user_consents.granted`

## Persistence Notes
- All screen submissions should also be written to `onboarding_responses` for auditability and replay.
- Keep `onboarding_sessions.current_screen_id` updated on each step transition.
- On final submit:
  - Mark `onboarding_sessions.status = 'completed'`
  - Set `profiles.onboarding_completed_at` for the active user
  - Upsert user-level entities (`communication_preferences`) and insert append-only entities (`user_consents`, `risk_assessments`) as needed.
