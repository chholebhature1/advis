export type AgentChatRole = "user" | "assistant";

export type AgentChatHistoryItem = {
  role: AgentChatRole;
  content: string;
};

export type AgentStructuredAdvice = {
  recommendation: string;
  reason: string;
  riskWarning: string;
  nextAction: string;
  intro?: string;
  step1Title?: string;
  assumptionBullets?: string[];
  bestAssumption?: string;
  monthlySipRange?: string;
  monthlySipBreakdown?: string[];
  step2Title?: string;
  portfolioBuckets?: Array<{
    heading: string;
    expectedReturn: string;
    instruments: string[];
    allocationHint: string;
  }>;
  step3Title?: string;
  actionPlanRows?: Array<{
    category: string;
    amount: string;
    whereToInvest: string;
  }>;
};

export type AgentProfileSnapshot = {
  full_name: string;
  email: string;
  phone_e164: string | null;
  date_of_birth: string | null;
  city: string | null;
  state: string | null;
  country_code: string | null;
  tax_residency_country: string | null;
  occupation_title: string | null;
  employment_type: string | null;
  monthly_income_inr: number | null;
  monthly_expenses_inr: number | null;
  monthly_emi_inr: number | null;
  monthly_investable_surplus_inr: number | null;
  current_savings_inr: number | null;
  emergency_fund_months: number | null;
  loss_tolerance_pct: number | null;
  liquidity_needs_notes: string | null;
  risk_appetite: string | null;
  target_horizon_years: number | null;
  tax_regime: string | null;
  kyc_status: string | null;
  onboarding_completed_at: string | null;
  primary_financial_goal?: string | null;
  target_goal_horizon_band?: string | null;
  monthly_investment_capacity_band?: string | null;
  monthly_income_band?: string | null;
  has_existing_investments?: boolean | null;
  existing_investment_types?: string[] | null;
};

export type AgentRiskSnapshot = {
  risk_score: number;
  risk_bucket: string;
  drawdown_tolerance_pct: number | null;
  time_horizon_years: number | null;
};

export type AgentGoalSnapshot = {
  title: string;
  category: string;
  target_amount_inr: number;
  target_date: string | null;
  priority: string;
};

export type AgentTaxSnapshot = {
  financial_year: string;
  tax_regime: string;
  annual_taxable_income_inr: number;
  section_80c_used_inr: number;
  section_80d_used_inr: number;
  home_loan_interest_inr: number;
  capital_gains_short_term_inr: number;
  capital_gains_long_term_inr: number;
};

export type AgentCommunicationSnapshot = {
  preferred_channel: string;
  phone_e164: string | null;
  email: string | null;
  whatsapp_opt_in: boolean;
  email_opt_in: boolean;
  push_opt_in: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  timezone: string | null;
};

export type AgentHoldingSnapshot = {
  instrument_symbol: string;
  instrument_name: string;
  asset_class: string;
  sector: string | null;
  quantity: number;
  average_buy_price_inr: number;
  current_price_inr: number;
};

export type AgentContext = {
  profile: AgentProfileSnapshot | null;
  latestRiskAssessment: AgentRiskSnapshot | null;
  goals: AgentGoalSnapshot[];
  latestTaxProfile: AgentTaxSnapshot | null;
  communicationPreferences: AgentCommunicationSnapshot | null;
  holdings: AgentHoldingSnapshot[];
  enabledAlertsCount: number;
};

export type AgentReadiness = {
  hasProfile: boolean;
  hasRiskAssessment: boolean;
  hasGoals: boolean;
  hasTaxProfile: boolean;
  hasHoldings: boolean;
};

export type DashboardModuleKey = "alerts" | "profile" | "holdings" | "tax" | "advisor";

export type IntelligenceSourceStatus = "live" | "fallback";

export type MarketIntelligenceSnapshot = {
  fearGreedIndex: number | null;
  fearGreedLabel: string;
  fearGreedUpdatedAt: string | null;
  usdInr: number | null;
  usdInrPrevClose: number | null;
  usdInrChangePct: number | null;
  sentimentSourceStatus: IntelligenceSourceStatus;
  fxSourceStatus: IntelligenceSourceStatus;
};

export type ModulePriority = {
  module: DashboardModuleKey;
  score: number;
  title: string;
  rationale: string;
  suggestedAction: string;
};

export type FocusConfidence = "low" | "medium" | "high";

export type DashboardIntelligenceSnapshot = {
  generatedAt: string;
  executiveSummary: string;
  market: MarketIntelligenceSnapshot;
  priorities: ModulePriority[];
  recommendedFocus: DashboardModuleKey;
  focusConfidence: FocusConfidence;
  disclaimer: string;
};
