/**
 * Dashboard-specific types.
 *
 * These types describe the shape of data consumed by the dashboard UI layer.
 * They MUST NOT contain any business logic or financial calculations.
 *
 * Types that originate from the financial engine live in @/lib/agent/types.ts
 * and should be imported from there — never duplicated here.
 */

// ────────────────────────────────────────────────────────────────
// Profile
// ────────────────────────────────────────────────────────────────

export type RiskAppetite = "conservative" | "moderate" | "aggressive";

export type ProfileRow = {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  phone_e164: string | null;
  city: string | null;
  state: string | null;
  occupation_title: string | null;
  employment_type: string | null;
  monthly_income_inr: number;
  monthly_expenses_inr: number;
  monthly_emi_inr: number;
  monthly_investable_surplus_inr: number;
  current_savings_inr: number;
  emergency_fund_months: number;
  loss_tolerance_pct: number | null;
  risk_appetite: RiskAppetite;
  tax_regime: "old" | "new" | null;
  kyc_status: "not_started" | "pending" | "verified" | "rejected" | string;
  target_amount_inr: number;
  target_horizon_years: number;
  notes: string;
  consent_to_contact: boolean;
  source: string;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
};

// ────────────────────────────────────────────────────────────────
// Market
// ────────────────────────────────────────────────────────────────

export type MarketIndicator = {
  id: "NIFTY50" | "BANKNIFTY" | "SENSEX";
  displayName: string;
  value: number;
  changeAbs: number;
  changePct: number;
  trend: "up" | "down" | "flat";
};

export type MarketIndicatorsResponse = {
  ok: true;
  generatedAt: string;
  source: "live" | "fallback";
  indices: MarketIndicator[];
};

export type MarketTrendPoint = { label: string; close: number };

export type MarketTrendResponse = {
  ok: true;
  generatedAt: string;
  source: "live" | "fallback";
  symbol: "NIFTY50";
  horizon: DashboardHorizon;
  points: MarketTrendPoint[];
};

// ────────────────────────────────────────────────────────────────
// Holdings
// ────────────────────────────────────────────────────────────────

export type HoldingsExposure = {
  name: string;
  value: number;
  marketValueInr: number;
};

export type HoldingsAnalyticsSnapshot = {
  totalMarketValueInr: number;
  totalCostValueInr: number;
  totalUnrealizedPnlInr: number;
  totalUnrealizedPnlPct: number | null;
  allocationByAssetClass: HoldingsExposure[];
  sectorExposure: HoldingsExposure[];
  concentrationWarnings: Array<{
    id: string;
    severity: "low" | "medium" | "high";
    title: string;
    message: string;
    metricPct: number | null;
  }>;
};

// ────────────────────────────────────────────────────────────────
// API Payloads
// ────────────────────────────────────────────────────────────────

export type HoldingsApiPayload = {
  ok?: boolean;
  holdings?: Array<{ id: string }>;
  analytics?: HoldingsAnalyticsSnapshot;
  error?: string;
};

export type IntelligenceApiPayload = {
  ok?: boolean;
  snapshot?: import("@/lib/agent/types").DashboardIntelligenceSnapshot;
  error?: string;
};

export type AgentDashboardPayload = {
  ok?: boolean;
  aiSummary?: import("@/lib/agent/types").DashboardAISummary;
  explanation?: import("@/lib/agent/types").AgentExplanationOutput;
  error?: string;
  snapshot?: import("@/lib/agent/types").FinancialSnapshot;
};

export type AgentChatReplyPayload = {
  ok?: boolean;
  reply?: string;
  raw?: string;
  error?: string;
};

// ────────────────────────────────────────────────────────────────
// Dashboard UI enums & presentation types
// ────────────────────────────────────────────────────────────────

export type DashboardHorizon = "1y" | "2y" | "3y" | "custom";
export type DashboardLens = "goal" | "cashflow" | "risk";
export type KpiDeltaTone = "positive" | "negative" | "neutral";
export type InsightTone = "neutral" | "positive" | "warning" | "critical";

export type DashboardKpiItem = {
  id: string;
  label: string;
  value: string;
  hint: string;
  deltaLabel: string;
  deltaTone: KpiDeltaTone;
  detail: string;
  source: string;
};

export type TrendPoint = { label: string; value: number };

export type ScenarioCard = {
  label: string;
  annualReturnPct: number;
  projectedValue: number;
  gainInr: number;
  gainPct: number;
  tone: InsightTone;
};

export type MarketPulseItem = {
  label: string;
  value: string;
  detail: string;
  tone: InsightTone;
};

// ────────────────────────────────────────────────────────────────
// Financial Summary — dashboard-side view of the engine snapshot
// ────────────────────────────────────────────────────────────────

export type DashboardFinancialSummary = {
  sipOriginal: number;
  sipUsed: number;
  maxAllowedSip: number | null;
  isOverLimit: boolean;
  utilizationPercent: number;
  utilization: {
    type: "range" | "exact";
    minPercent?: number;
    maxPercent?: number;
    exactPercent?: number;
  };
  requiredSip: number;
  projectedCorpus: number;
  gapAmount: number;
  goalDeltaPercent: number;
  userCapacity: number;
  isFeasible: boolean;
  goalAmount: number;
  goalYears: number;
  // Advisor-quality fields
  timeHorizon: {
    band: string;
    resolvedYears: number;
    label: string;
  };
  expectedReturn: number;
  assetReturns: {
    equity: number;
    debt: number;
    gold: number;
    liquid: number;
  };
  scenarioSpread: number;
  scenarioOutcomes: {
    conservative: number;
    moderate: number;
    optimistic: number;
  };
  actualOutcome: {
    withCurrentSip: number;
    shortfall: number;
    percentageOfGoal: number;
  };
  gapStrategies: Array<{
    id: string;
    title: string;
    description: string;
    outcome: string;
    feasibility: "achievable" | "partial" | "stretch";
    tradeoffs: string[];
    monthlySip: number;
    years?: number;
    projectedCorpus: number;
  }>;
  stepUpSuggestion?: {
    yearlyIncrease: number;
    finalMonthlySip: number;
    projectedCorpus: number;
    vsFixedSip: number;
  };
  // Phase 1: Income Utilization
  utilizationInsight: {
    level: "low" | "healthy" | "aggressive" | "risky" | "unsustainable";
    ratio: number;
    message: string;
    potential: number | null;
  };
  // Phase 10: Action Plan
  actionPlan: Array<{
    priority: number;
    action: string;
    impact: string;
    timeframe: string;
  }>;
  // Phase 5: Milestone Roadmap
  milestoneRoadmap: Array<{
    year: number;
    projectedValue: number;
    milestone: string;
    label?: string;
  }>;
  // Phase 11: Behavioral Profile
  behavioralProfile: {
    archetype: string;
    summary: string;
    insight: string;
    recommendation: string;
  };
  // User profile info
  userProfile: {
    income: number;
    currentSavings: number;
    investmentCapacity?: number;
    riskProfile?: "conservative" | "moderate" | "aggressive";
  };
  // Allocation — single source of truth from backend
  allocation?: {
    equity: number;
    debt: number;
    gold: number;
    liquid: number;
  };
  // Decision layer - single source of truth
  decision: {
    feasibility: "comfortable" | "tight" | "stretched" | "not_viable";
    sustainability: "safe" | "aggressive" | "risky" | "unsustainable";
    incomeUtilization: number;
    gapAmount: number;
    likelyCorpus: number;
    goalAmount: number;
    timeYears: number;
    percentageOfGoal: number;
    gapPercentage?: number;
    primaryAction?: string;
    secondaryAction?: string;
    optionalAction?: string;
    reasoning?: string;
    primaryActionType?:
      | "increase_sip"
      | "extend_timeline"
      | "reduce_goal"
      | "optimize"
      | "noop";
    sipBufferPercent?: number;
    sipBufferLabel?: string;
    stepUpMode?: "optional" | "recommended";
    safetyMargin?: number;
    safetyTier?: "safe" | "tight" | "risky";
    headerTone?:
      | "strongly_on_track"
      | "slightly_short"
      | "needs_improvement"
      | "far_off";
    riskNote?: string;
  };
  // Root snapshot fields required by follow-up API
  goal: import("@/lib/agent/types").GoalSpec;
  feasibility: import("@/lib/agent/types").FeasibilityAnalysis;
  // Reality Normalizer outputs
  goalIntent?: {
    kind: string;
    isCorpusGoal: boolean;
    rawTargetAmount: number;
    derivedCorpus: number;
    annualIncomeTarget?: number;
    taxSavingTarget?: number;
    termCoverTarget?: number;
    healthCoverTarget?: number;
    note?: string;
    warnings?: string[];
  };
  constraints?: {
    feasibilityVerdict:
      | "feasible"
      | "high_risk"
      | "not_viable"
      | "extreme_mismatch";
    tone: string;
    confidenceTag: string;
    reasons: string[];
  };
  dataQuality: {
    hasFallbacks: boolean;
    missingFields: string[];
    confidence: "high" | "medium" | "low";
    fallbackCount: number;
    defaultedFields: string[];
  };
};
