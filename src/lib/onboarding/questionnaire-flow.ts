export type OnboardingFieldType =
  | "text"
  | "email"
  | "phone"
  | "number"
  | "currency"
  | "choice"
  | "multi_choice";

export type OnboardingFieldOption = {
  label: string;
  value: string;
};

export type OnboardingFieldVisibility = {
  key: string;
  equals: string | boolean;
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
  showWhen?: OnboardingFieldVisibility;
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
  ctaLabel?: string;
  fields: OnboardingField[];
};

export const ONBOARDING_QUESTIONNAIRE_FLOW: OnboardingScreen[] = [
  {
    id: "welcome",
    title: "Plan Your Financial Future in 60 Seconds 💰",
    description: "Answer a few quick questions and get your personalized investment plan.",
    estimatedMinutes: 1,
    ctaLabel: "👉 Start Planning",
    fields: [],
  },
  {
    id: "primary_goal",
    title: "What is your primary financial goal?",
    description: "What do you want to achieve?",
    estimatedMinutes: 1,
    fields: [
      {
        key: "primary_financial_goal",
        label: "Choose your primary goal",
        type: "choice",
        required: true,
        options: [
          { label: "Wealth Creation 📈", value: "wealth_creation" },
          { label: "Retirement Planning 🧓", value: "retirement_planning" },
          { label: "Child Education 🎓", value: "child_education" },
          { label: "Passive Income 💵", value: "passive_income" },
        ],
        mapsTo: { table: "profiles", column: "primary_financial_goal" },
      },
    ],
  },
  {
    id: "target_goal",
    title: "Your Target Goal",
    description: "What is your target amount?",
    estimatedMinutes: 1,
    fields: [
      {
        key: "target_goal_amount_choice",
        label: "Select your target amount",
        type: "choice",
        required: true,
        options: [
          { label: "₹10 Lakhs", value: "10_lakh" },
          { label: "₹25 Lakhs", value: "25_lakh" },
          { label: "₹50 Lakhs", value: "50_lakh" },
          { label: "₹1 Crore", value: "1_crore" },
          { label: "₹5 Crore", value: "5_crore" },
          { label: "Custom Amount", value: "custom" },
        ],
        mapsTo: { table: "profiles", column: "target_amount_inr" },
      },
      {
        key: "target_goal_custom_amount_inr",
        label: "Enter your target amount (₹)",
        type: "currency",
        required: true,
        min: 0,
        showWhen: {
          key: "target_goal_amount_choice",
          equals: "custom",
        },
        mapsTo: { table: "profiles", column: "target_amount_inr" },
      },
    ],
  },
  {
    id: "time_horizon",
    title: "Time Horizon",
    description: "In how many years do you want to achieve this goal?",
    estimatedMinutes: 1,
    fields: [
      {
        key: "time_horizon_band",
        label: "Choose a timeline",
        type: "choice",
        required: true,
        options: [
          { label: "1–3 years", value: "1_3_years" },
          { label: "3–5 years", value: "3_5_years" },
          { label: "5–10 years", value: "5_10_years" },
          { label: "Custom timeline", value: "custom" },
        ],
        mapsTo: { table: "profiles", column: "target_goal_horizon_band" },
      },
      {
        key: "time_horizon_custom_years",
        label: "Enter your timeline (years)",
        type: "number",
        required: true,
        min: 1,
        max: 60,
        step: 1,
        placeholder: "10",
        showWhen: { key: "time_horizon_band", equals: "custom" },
        mapsTo: { table: "profiles", column: "target_horizon_years" },
      },
    ],
  },
  {
    id: "monthly_capacity",
    title: "Monthly Investment Capacity",
    description: "How much can you invest monthly?",
    estimatedMinutes: 1,
    fields: [
      {
        key: "monthly_investment_capacity_band",
        label: "Monthly investment capacity",
        type: "choice",
        required: true,
        options: [
          { label: "₹5k–₹10k", value: "5000_10000" },
          { label: "₹10k–₹25k", value: "10000_25000" },
          { label: "₹25k–₹50k", value: "25000_50000" },
          { label: "Custom amount", value: "custom" },
        ],
        mapsTo: { table: "profiles", column: "monthly_investment_capacity_band" },
      },
      {
        key: "sip_custom_amount",
        label: "Enter your monthly SIP (₹)",
        type: "number",
        required: true,
        min: 0,
        step: 1,
        placeholder: "15000",
        showWhen: { key: "monthly_investment_capacity_band", equals: "custom" },
        mapsTo: { table: "profiles", column: "monthly_investable_surplus_inr" },
      },
    ],
  },
  {
    id: "risk_preference",
    title: "Risk Preference",
    description: "What level of risk are you comfortable with?",
    estimatedMinutes: 1,
    fields: [
      {
        key: "risk_preference",
        label: "Choose your risk level",
        type: "choice",
        required: true,
        options: [
          { label: "Low (Safe & Stable Returns)", value: "low" },
          { label: "Medium (Balanced Growth)", value: "medium" },
          { label: "High (Aggressive Returns)", value: "high" },
        ],
        mapsTo: { table: "profiles", column: "risk_appetite" },
      },
    ],
  },
  {
    id: "financial_snapshot",
    title: "Your Financial Snapshot",
    description: "Tell us about your monthly income and current investments.",
    estimatedMinutes: 2,
    fields: [
      {
        key: "monthly_income_band",
        label: "Monthly income range",
        type: "choice",
        required: true,
        options: [
          { label: "Below ₹25k", value: "below_25000" },
          { label: "₹25k–₹50k", value: "25000_50000" },
          { label: "₹50k–₹1L", value: "50000_100000" },
          { label: "₹1L–₹3L", value: "100000_300000" },
          { label: "Custom income", value: "custom" },
        ],
        mapsTo: { table: "profiles", column: "monthly_income_band" },
      },
      {
        key: "income_custom_amount",
        label: "Enter your monthly income (₹)",
        type: "number",
        required: true,
        min: 0,
        step: 1,
        placeholder: "75000",
        showWhen: { key: "monthly_income_band", equals: "custom" },
        mapsTo: { table: "profiles", column: "monthly_income_inr" },
      },
      {
        key: "has_existing_investments",
        label: "Do you already have investments?",
        type: "choice",
        required: true,
        options: [
          { label: "Yes", value: "yes" },
          { label: "No", value: "no" },
        ],
        mapsTo: { table: "profiles", column: "has_existing_investments" },
      },
      {
        key: "existing_investment_types",
        label: "Where do you invest?",
        type: "multi_choice",
        required: true,
        options: [
          { label: "Mutual Funds", value: "mutual_funds" },
          { label: "Stocks", value: "stocks" },
          { label: "FD", value: "fd" },
          { label: "Insurance", value: "insurance" },
          { label: "Others", value: "others" },
        ],
        showWhen: {
          key: "has_existing_investments",
          equals: "yes",
        },
        mapsTo: { table: "profiles", column: "existing_investment_types" },
      },
    ],
  },
  {
    id: "contact_details",
    title: "Get Your Personalized Plan 📊",
    description: "Share your contact details so we can prepare your customized strategy.",
    estimatedMinutes: 1,
    ctaLabel: "Get My Plan",
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
        key: "phone_e164",
        label: "Mobile Number",
        type: "phone",
        required: true,
        placeholder: "+91XXXXXXXXXX",
        mapsTo: { table: "profiles", column: "phone_e164" },
      },
      {
        key: "email",
        label: "Email Address",
        type: "email",
        required: true,
        placeholder: "you@example.com",
        mapsTo: { table: "profiles", column: "email" },
      },
    ],
  },
];

export function getOnboardingTotalEstimatedMinutes(): number {
  return ONBOARDING_QUESTIONNAIRE_FLOW.reduce((sum, screen) => sum + screen.estimatedMinutes, 0);
}