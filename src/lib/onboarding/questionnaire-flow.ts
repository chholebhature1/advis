export type OnboardingFieldType =
  | "text"
  | "email"
  | "phone"
  | "date"
  | "number"
  | "currency"
  | "select"
  | "textarea"
  | "boolean";

export type OnboardingFieldOption = {
  label: string;
  value: string;
};

export type OnboardingField = {
  key: string;
  label: string;
  type: OnboardingFieldType;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: OnboardingFieldOption[];
  mapsTo: {
    table: string;
    column: string;
  };
};

export type OnboardingScreen = {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  fields: OnboardingField[];
};

export const ONBOARDING_QUESTIONNAIRE_FLOW: OnboardingScreen[] = [
  {
    id: "identity_contact",
    title: "Identity and Contact",
    description: "Capture the core identity details needed for profile setup and advisory communication.",
    estimatedMinutes: 2,
    fields: [
      {
        key: "full_name",
        label: "Full Name",
        type: "text",
        required: true,
        placeholder: "Riya Sharma",
        mapsTo: { table: "profiles", column: "full_name" },
      },
      {
        key: "email",
        label: "Email Address",
        type: "email",
        required: true,
        placeholder: "you@example.com",
        mapsTo: { table: "profiles", column: "email" },
      },
      {
        key: "phone_e164",
        label: "Mobile Number",
        type: "phone",
        required: true,
        placeholder: "+91XXXXXXXXXX",
        mapsTo: { table: "profiles", column: "phone_e164" },
      },
      {
        key: "date_of_birth",
        label: "Date of Birth",
        type: "date",
        required: true,
        mapsTo: { table: "profiles", column: "date_of_birth" },
      },
      {
        key: "city",
        label: "City",
        type: "text",
        required: true,
        mapsTo: { table: "profiles", column: "city" },
      },
      {
        key: "tax_residency_country",
        label: "Tax Residency Country",
        type: "select",
        required: true,
        options: [
          { label: "India", value: "IN" },
          { label: "United States", value: "US" },
          { label: "United Kingdom", value: "GB" },
          { label: "Other", value: "OTHER" },
        ],
        mapsTo: { table: "profiles", column: "tax_residency_country" },
      },
    ],
  },
  {
    id: "income_expense",
    title: "Income, Expenses, and Cash Flow",
    description: "Understand monthly cash flow and investable surplus to size recommendations correctly.",
    estimatedMinutes: 3,
    fields: [
      {
        key: "occupation_title",
        label: "Occupation",
        type: "text",
        required: true,
        mapsTo: { table: "profiles", column: "occupation_title" },
      },
      {
        key: "employment_type",
        label: "Employment Type",
        type: "select",
        required: true,
        options: [
          { label: "Salaried", value: "salaried" },
          { label: "Business Owner", value: "business_owner" },
          { label: "Professional", value: "professional" },
          { label: "Student", value: "student" },
          { label: "Retired", value: "retired" },
          { label: "Homemaker", value: "homemaker" },
          { label: "Other", value: "other" },
        ],
        mapsTo: { table: "profiles", column: "employment_type" },
      },
      {
        key: "monthly_income_inr",
        label: "Monthly Net Income (INR)",
        type: "currency",
        required: true,
        min: 0,
        mapsTo: { table: "profiles", column: "monthly_income_inr" },
      },
      {
        key: "monthly_expenses_inr",
        label: "Monthly Essential Expenses (INR)",
        type: "currency",
        required: true,
        min: 0,
        mapsTo: { table: "profiles", column: "monthly_expenses_inr" },
      },
      {
        key: "monthly_emi_inr",
        label: "Monthly EMI / Debt Payments (INR)",
        type: "currency",
        required: true,
        min: 0,
        mapsTo: { table: "profiles", column: "monthly_emi_inr" },
      },
      {
        key: "monthly_investable_surplus_inr",
        label: "Monthly Investable Surplus (INR)",
        type: "currency",
        required: true,
        min: 0,
        mapsTo: { table: "profiles", column: "monthly_investable_surplus_inr" },
      },
    ],
  },
  {
    id: "safety_buffer",
    title: "Safety Buffer and Liquidity",
    description: "Assess resilience before portfolio growth recommendations are finalized.",
    estimatedMinutes: 2,
    fields: [
      {
        key: "current_savings_inr",
        label: "Current Savings (INR)",
        type: "currency",
        required: true,
        min: 0,
        mapsTo: { table: "profiles", column: "current_savings_inr" },
      },
      {
        key: "emergency_fund_months",
        label: "Emergency Fund (months of expenses)",
        type: "number",
        required: true,
        min: 0,
        max: 60,
        step: 0.5,
        mapsTo: { table: "profiles", column: "emergency_fund_months" },
      },
      {
        key: "liquidity_needs_notes",
        label: "Liquidity needs in next 12-24 months",
        type: "textarea",
        required: false,
        placeholder: "Home down payment, school fees, business cash cycle, etc.",
        mapsTo: { table: "profiles", column: "liquidity_needs_notes" },
      },
    ],
  },
  {
    id: "goals",
    title: "Goals and Milestones",
    description: "Capture up to 3 priority goals with target amount and timeline.",
    estimatedMinutes: 4,
    fields: [
      {
        key: "goal_1_title",
        label: "Primary Goal Name",
        type: "text",
        required: true,
        placeholder: "Retirement corpus",
        helpText: "Persist into financial_goals.title (repeatable rows supported).",
        mapsTo: { table: "financial_goals", column: "title" },
      },
      {
        key: "goal_1_category",
        label: "Primary Goal Category",
        type: "select",
        required: true,
        options: [
          { label: "Retirement", value: "retirement" },
          { label: "Child Education", value: "child_education" },
          { label: "Home Purchase", value: "home_purchase" },
          { label: "Wedding", value: "wedding" },
          { label: "Vacation", value: "vacation" },
          { label: "Wealth Creation", value: "wealth_creation" },
          { label: "Emergency Fund", value: "emergency_fund" },
          { label: "Other", value: "other" },
        ],
        mapsTo: { table: "financial_goals", column: "category" },
      },
      {
        key: "goal_1_target_amount_inr",
        label: "Primary Goal Target Amount (INR)",
        type: "currency",
        required: true,
        min: 0,
        mapsTo: { table: "financial_goals", column: "target_amount_inr" },
      },
      {
        key: "goal_1_target_date",
        label: "Primary Goal Target Date",
        type: "date",
        required: true,
        mapsTo: { table: "financial_goals", column: "target_date" },
      },
      {
        key: "goal_1_priority",
        label: "Primary Goal Priority",
        type: "select",
        required: true,
        options: [
          { label: "High", value: "high" },
          { label: "Medium", value: "medium" },
          { label: "Low", value: "low" },
        ],
        mapsTo: { table: "financial_goals", column: "priority" },
      },
    ],
  },
  {
    id: "risk_profile",
    title: "Risk Profiling",
    description: "Measure risk capacity and behavior to create a defensible risk score and bucket.",
    estimatedMinutes: 3,
    fields: [
      {
        key: "risk_appetite",
        label: "Self-Declared Risk Appetite",
        type: "select",
        required: true,
        options: [
          { label: "Conservative", value: "conservative" },
          { label: "Moderate", value: "moderate" },
          { label: "Aggressive", value: "aggressive" },
        ],
        mapsTo: { table: "profiles", column: "risk_appetite" },
      },
      {
        key: "loss_tolerance_pct",
        label: "Max temporary portfolio drop you can tolerate (%)",
        type: "number",
        required: true,
        min: 0,
        max: 100,
        step: 1,
        mapsTo: { table: "profiles", column: "loss_tolerance_pct" },
      },
      {
        key: "target_horizon_years",
        label: "Primary Investment Horizon (years)",
        type: "number",
        required: true,
        min: 1,
        max: 60,
        step: 1,
        mapsTo: { table: "profiles", column: "target_horizon_years" },
      },
      {
        key: "risk_rationale",
        label: "How do you react in a market correction?",
        type: "textarea",
        required: true,
        placeholder: "Example: continue SIPs, pause, or rebalance.",
        helpText: "Store in risk_assessments.rationale JSON for explainability.",
        mapsTo: { table: "risk_assessments", column: "rationale" },
      },
    ],
  },
  {
    id: "portfolio_and_tax",
    title: "Portfolio and Tax Snapshot",
    description: "Capture current portfolio posture and tax context for allocation and tax-aware planning.",
    estimatedMinutes: 3,
    fields: [
      {
        key: "tax_regime",
        label: "Tax Regime",
        type: "select",
        required: true,
        options: [
          { label: "Old Regime", value: "old" },
          { label: "New Regime", value: "new" },
        ],
        mapsTo: { table: "profiles", column: "tax_regime" },
      },
      {
        key: "annual_taxable_income_inr",
        label: "Annual Taxable Income (INR)",
        type: "currency",
        required: true,
        min: 0,
        mapsTo: { table: "tax_profiles", column: "annual_taxable_income_inr" },
      },
      {
        key: "section_80c_used_inr",
        label: "80C Used So Far (INR)",
        type: "currency",
        required: false,
        min: 0,
        mapsTo: { table: "tax_profiles", column: "section_80c_used_inr" },
      },
      {
        key: "section_80d_used_inr",
        label: "80D Used So Far (INR)",
        type: "currency",
        required: false,
        min: 0,
        mapsTo: { table: "tax_profiles", column: "section_80d_used_inr" },
      },
      {
        key: "home_loan_interest_inr",
        label: "Home Loan Interest Claimed (INR)",
        type: "currency",
        required: false,
        min: 0,
        mapsTo: { table: "tax_profiles", column: "home_loan_interest_inr" },
      },
      {
        key: "existing_portfolio_notes",
        label: "Existing portfolio summary",
        type: "textarea",
        required: false,
        placeholder: "Top funds/stocks, concentration risk, SIPs already running, etc.",
        helpText: "Store in onboarding_responses.response_data for portfolio analyzer bootstrap.",
        mapsTo: { table: "onboarding_responses", column: "response_data" },
      },
    ],
  },
  {
    id: "alerts_and_delivery",
    title: "Alerts and Communication Preferences",
    description: "Configure channels and frequencies for advisory, portfolio, and tax alerts.",
    estimatedMinutes: 2,
    fields: [
      {
        key: "preferred_channel",
        label: "Preferred Channel",
        type: "select",
        required: true,
        options: [
          { label: "WhatsApp", value: "whatsapp" },
          { label: "Email", value: "email" },
          { label: "SMS", value: "sms" },
          { label: "Push", value: "push" },
        ],
        mapsTo: { table: "communication_preferences", column: "preferred_channel" },
      },
      {
        key: "whatsapp_opt_in",
        label: "Allow WhatsApp alerts",
        type: "boolean",
        required: false,
        mapsTo: { table: "communication_preferences", column: "whatsapp_opt_in" },
      },
      {
        key: "email_opt_in",
        label: "Allow email alerts",
        type: "boolean",
        required: false,
        mapsTo: { table: "communication_preferences", column: "email_opt_in" },
      },
      {
        key: "quiet_hours_notes",
        label: "Preferred time for alerts",
        type: "textarea",
        required: false,
        placeholder: "Example: weekdays 9am-8pm only",
        mapsTo: { table: "onboarding_responses", column: "response_data" },
      },
    ],
  },
  {
    id: "consent_and_review",
    title: "Consent and Final Review",
    description: "Collect mandatory legal consent and finalize profile for AI + human advisory mode.",
    estimatedMinutes: 2,
    fields: [
      {
        key: "consent_advisory_disclaimer",
        label: "I understand recommendations are advisory and not guaranteed returns",
        type: "boolean",
        required: true,
        mapsTo: { table: "user_consents", column: "granted" },
      },
      {
        key: "consent_data_processing",
        label: "I consent to secure processing of my financial data",
        type: "boolean",
        required: true,
        mapsTo: { table: "user_consents", column: "granted" },
      },
      {
        key: "consent_contact_marketing",
        label: "I allow Pravix to contact me about portfolio and planning updates",
        type: "boolean",
        required: false,
        mapsTo: { table: "user_consents", column: "granted" },
      },
    ],
  },
];

export function getOnboardingTotalEstimatedMinutes(): number {
  return ONBOARDING_QUESTIONNAIRE_FLOW.reduce((sum, screen) => sum + screen.estimatedMinutes, 0);
}