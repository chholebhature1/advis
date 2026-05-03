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

export type DashboardAISummary = {
  intro: string;
  why: string;
  nextStep: string;
};

export type AgentExplanationTone =
  | "positive"
  | "neutral"
  | "caution"
  | "direct";

export type ExplanationReasoning = {
  constraint: string; // identified main constraint (timeline, income, shortfall)
  cause: string; // why this constraint exists
  implication: string; // what it means for the plan
};

export type AdvisoryRecommendation = {
  primary: string; // required primary action
  optional?: string; // optional secondary action (e.g. step-up)
  tradeoffs?: string[]; // trade-offs (if depth=detailed)
};

export type AgentExplanationOutput = {
  summary: string;
  insight: string;
  suggestion: {
    primary: string;
    optional?: string;
  };
  reason: string;
  reasoning?: ExplanationReasoning;
  recommendation?: AdvisoryRecommendation;
  tone: AgentExplanationTone;
  isCritical?: boolean; // new: true when plan is not viable and actions are required
  debugInfo?: string;
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
  target_amount_inr: number | null;
  tax_regime: string | null;
  kyc_status: string | null;
  onboarding_completed_at: string | null;
  primary_financial_goal?: string | null;
  experienceLevel?: "beginner" | "advanced" | null;
  target_goal_horizon_band?: string | null;
  monthly_investment_capacity_band?: string | null;
  monthly_income_band?: string | null;
  monthlyIncomeInr?: number | null;
  sipCapacityInr?: number | null;
  timeHorizonYears?: number | null;
  income_input_type?: "exact" | "range" | null;
  income_range_min_inr?: number | null;
  income_range_max_inr?: number | null;
  has_existing_investments?: boolean | null;
  existing_investment_types?: string[] | null;
  target_goal_amount_choice?: string | null;
  target_goal_custom_amount_inr?: number | null;
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

export type DataQualitySnapshot = {
  hasFallbacks: boolean;
  missingFields: string[];
  confidence: "high" | "medium" | "low";
  fallbackCount: number;
  defaultedFields: string[];
};

export type AgentContext = {
  profile: AgentProfileSnapshot | null;
  latestRiskAssessment: AgentRiskSnapshot | null;
  goals: AgentGoalSnapshot[];
  communicationPreferences: AgentCommunicationSnapshot | null;
  holdings: AgentHoldingSnapshot[];
  dataQuality?: DataQualitySnapshot;
};

export type AgentReadiness = {
  hasProfile: boolean;
  hasRiskAssessment: boolean;
  hasGoals: boolean;
  hasHoldings: boolean;
};

export type DashboardModuleKey = "profile" | "holdings" | "advisor";

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

// ============================================================
// FINANCIAL ENGINE TYPES - Comprehensive deterministic calculations
// ============================================================

export type UserFinancialProfile = {
  income: number;
  incomeInputType?: "exact" | "range";
  incomeRangeMinInr?: number | null;
  incomeRangeMaxInr?: number | null;
  expenses: number;
  emi: number;
  investmentCapacity: number;
  currentSavings: number;
  emergencyFundMonths: number;
  riskProfile: "conservative" | "moderate" | "aggressive";
  employmentType: string | null;
  hasExistingInvestments: boolean;
  existingInvestmentTypes: string[];
  age: number | null;
  taxRegime: string | null;
};

export type GoalSpec = {
  title: string;
  targetAmount: number;
  timeHorizonMonths: number;
  priority: string;
  category: string;
};

export type ReturnScenario = {
  rate: number;
  label: string;
  projectedCorpus: number;
  achievementProbability: "low" | "medium" | "high";
};

export type StepUpSipPlan = {
  startSip: number;
  annualIncreasePct: number;
  finalSip: number;
  avgSip: number;
  projectedCorpus: number;
  isFeasible: boolean;
};

export type StrategyOption = {
  type:
    | "increase_sip"
    | "extend_timeline"
    | "step_up_sip"
    | "reduce_goal"
    | "lump_sum_boost";
  label: string;
  description: string;
  requiredSip: number | null;
  extendedMonths: number | null;
  stepUpPlan: StepUpSipPlan | null;
  reducedTarget: number | null;
  lumpSumRequired: number | null;
  isRecommended: boolean;
  tradeOffs: string[];
};

export type FeasibilityAnalysis = {
  isFeasible: boolean;
  confidence: "high" | "medium" | "low";
  requiredSip: number;
  currentSip: number;
  gapAmount: number;
  gapPercentage: number;
  expectedCorpus: number;
  shortfall: number;
  achievementProbability: number;
  returnScenarios: ReturnScenario[];
};

export type SmartAllocation = {
  equity: number;
  debt: number;
  gold: number;
  liquid: number;
  rationale: string;
  rebalancingNeeded: boolean;
};

export type EmergencyFundAnalysis = {
  requiredMonths: number;
  requiredAmount: number;
  currentAmount: number;
  shortfall: number;
  isAdequate: boolean;
  priority: "critical" | "recommended" | "adequate";
};

export type TimeHorizonInfo = {
  band: string;
  resolvedYears: number;
  label: string;
};

export type ScenarioOutcomes = {
  conservative: number; // 8% returns
  moderate: number; // 12% returns
  optimistic: number; // 15% returns
};

export type GapStrategy = {
  id: string;
  title: string;
  description: string;
  outcome: string;
  feasibility: "achievable" | "partial" | "stretch";
  tradeoffs: string[];
  monthlySip: number;
  years?: number;
  projectedCorpus: number;
};

export type StepUpSuggestion = {
  yearlyIncrease: number;
  finalMonthlySip: number;
  projectedCorpus: number;
  vsFixedSip: number;
};

export type IncomeUtilizationInsight = {
  level: "low" | "healthy" | "aggressive" | "risky" | "unsustainable";
  ratio: number;
  message: string;
  potential: number | null;
};

export type ActionPlanItem = {
  priority: number;
  action: string;
  impact: string;
  timeframe: string;
};

/** Strict, single-choice action enum. UI/AI must paraphrase this — never invent a new action. */
export type PrimaryActionType =
  | "increase_sip" // gap exists and required SIP is within reach
  | "extend_timeline" // required SIP unaffordable but timeline can absorb it
  | "reduce_goal" // hard constraint blocks both SIP and timeline paths
  | "optimize" // already feasible — minor tuning (step-up, rebalance)
  | "noop"; // non-corpus goal (insurance, tax_saving) — no SIP decision

export type PlanDecision = {
  feasibility: "comfortable" | "tight" | "stretched" | "not_viable";
  sustainability: "safe" | "aggressive" | "risky" | "unsustainable";
  incomeUtilization: number;
  gapAmount: number;
  likelyCorpus: number;
  goalAmount: number;
  timeYears: number;
  percentageOfGoal: number;
  gapPercentage?: number;
  /** Free-text rationale (deterministic, built by the engine). */
  primaryAction?: string;
  secondaryAction?: string;
  optionalAction?: string;
  reasoning: string;
  /** The single canonical action category. AI/UI paraphrase this only. */
  primaryActionType: PrimaryActionType;
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

export type BehavioralProfile = {
  archetype: string;
  summary: string;
  insight: string;
  recommendation: string;
};

export type Milestone = {
  year: number;
  projectedValue: number;
  investedPrincipal: number;
  milestone: string;
  label?: string;
};

// ============================================================
// REALITY NORMALIZER TYPES
// ============================================================

export type GoalKind =
  | "wealth_creation"
  | "retirement_planning"
  | "child_education"
  | "tax_saving"
  | "passive_income"
  | "insurance_planning";

export type GoalIntent = {
  kind: GoalKind;
  /** Raw target amount as the user entered it (or resolved from a choice token). */
  rawTargetAmount: number | null;
  /** Corpus the engine should plan against (may differ from rawTargetAmount, e.g. passive_income → ×25). */
  derivedCorpus: number | null;
  /** Annual passive income target (only set for kind = passive_income). */
  annualIncomeTarget: number | null;
  /** Annual 80C investment target (only set for kind = tax_saving). */
  taxSavingTarget: number | null;
  /** Term insurance cover suggestion (only set for kind = insurance_planning). */
  termCoverTarget: number | null;
  /** Health insurance cover suggestion (only set for kind = insurance_planning). */
  healthCoverTarget: number | null;
  /** True when goal is non-corpus (insurance, tax_saving) and SIP feasibility math doesn't apply. */
  isCorpusGoal: boolean;
  /** Human-readable transparency note shown on the dashboard. */
  note: string | null;
  /** Soft warnings (e.g. retirement horizon mismatched with age). */
  warnings: string[];
};

export type PlanConstraints = {
  /** Hard verdict from rule layer; engine + AI must respect this. null = no override. */
  feasibilityVerdict:
    | "feasible"
    | "high_risk"
    | "not_viable"
    | "extreme_mismatch"
    | null;
  flags: {
    maxAllowedSip: number | null;
    isOverLimit: boolean;
    overLimitAmount: number | null;
    utilizationPercent: number;
    highSipRisk: boolean;
    stepUpCappedAtIncome: boolean;
    expensesInferred: boolean;
  };
  /** Sip-to-income ratio derived label. */
  confidenceTag: "safe" | "balanced" | "aggressive" | "unsafe";
  /** Tone directive for header / advice. */
  tone: "confidence" | "cautious_optimism" | "direct_corrective";
  /** Reasons backing each hard rule that fired. */
  reasons: string[];
};

export type NormalizedPlanInput = {
  profile: UserFinancialProfile;
  goalIntent: GoalIntent;
  /** Goal time horizon in months (resolved from band/year). */
  timeHorizonMonths: number;
  constraints: PlanConstraints;
  /** True when we don't have enough data to plan; engine should surface a "missing input" snapshot. */
  requiresInput: boolean;
};

export type FinancialSnapshot = {
  sipOriginal: number;
  sipUsed: number;
  maxAllowedSip: number | null;
  isOverLimit: boolean;
  utilizationPercent: number;
  utilization:
    | {
        type: "range";
        minPercent: number;
        maxPercent: number;
      }
    | {
        type: "exact";
        exactPercent: number;
      };
  requiredSip: number;
  projectedCorpus: number;
  gapAmount: number;
  goalDeltaPercent: number;
  userProfile: UserFinancialProfile;
  goal: GoalSpec;
  feasibility: FeasibilityAnalysis;
  allocation: SmartAllocation;
  emergencyFund: EmergencyFundAnalysis;
  strategyOptions: StrategyOption[];
  warnings: string[];
  recommendations: string[];
  inflationAdjustedGoal: number;
  generatedAt: string;
  holdingsAnalysis?: HoldingsAnalysis;
  rebalancingNeeded: boolean;
  rebalancingAdvice?: string[];
  version: string;
  // Advisor-quality additions
  timeHorizon: TimeHorizonInfo;
  expectedReturn: number;
  assetReturns: {
    equity: number;
    debt: number;
    gold: number;
    liquid: number;
  };
  scenarioSpread: number;
  scenarioOutcomes: ScenarioOutcomes;
  actualOutcome: {
    withCurrentSip: number;
    shortfall: number;
    percentageOfGoal: number;
  };
  gapStrategies: GapStrategy[];
  stepUpSuggestion?: StepUpSuggestion;
  // Phase 1: Income Utilization
  utilizationInsight: IncomeUtilizationInsight;
  // Phase 10: Action Plan
  actionPlan: ActionPlanItem[];
  // Phase 5: Milestone Roadmap
  milestoneRoadmap: Milestone[];
  // Phase 11: Behavioral Profile
  behavioralProfile: BehavioralProfile;
  // Decision layer - single source of truth
  decision: PlanDecision;
  // Reality Normalizer outputs (transparency + hard constraints)
  goalIntent: GoalIntent;
  constraints: PlanConstraints;
  // Data quality transparency for profile reliability
  dataQuality: DataQualitySnapshot;
};

export type HoldingsAnalysis = {
  totalValue: number;
  topHoldingPct: number;
  concentrationRisk: "low" | "medium" | "high";
  assetAllocation: Record<string, number>;
  sectorExposure: Record<string, number>;
  unrealizedPnlPct: number | null;
  holdingsCount: number;
};

export type AIExplanationInput = {
  financialSnapshot: FinancialSnapshot;
  userQuestion: string;
  conversationHistory: AgentChatHistoryItem[];
};

export type AIExplanationOutput = {
  answer: string;
  action: string;
  reason: string;
  confidence: "high" | "medium" | "low";
  caveats: string[];
};
