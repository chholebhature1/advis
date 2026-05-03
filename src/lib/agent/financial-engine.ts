// FINANCIAL ENGINE CONTRACT
// This is the ONLY place where financial calculations are allowed.
// Do NOT:
// - modify user input
// - introduce hidden constraints
// - duplicate logic elsewhere
/**
 * FINANCIAL ENGINE
 * Deterministic calculations only - NO AI
 * This module produces structured financial snapshots for AI explanation
 */

import type {
  AgentContext,
  UserFinancialProfile,
  GoalSpec,
  FinancialSnapshot,
  FeasibilityAnalysis,
  SmartAllocation,
  StrategyOption,
  StepUpSipPlan,
  StepUpSuggestion,
  HoldingsAnalysis,
  ReturnScenario,
  EmergencyFundAnalysis,
  PlanDecision,
  NormalizedPlanInput,
  GoalIntent,
  PlanConstraints,
  PrimaryActionType,
  Milestone,
} from "./types";
import { normalizePlanInput, STEP_UP_INCOME_CAP_RATIO } from "./reality-normalizer";

// ============================================================
// CONSTANTS
// ============================================================

const INFLATION_RATE_PCT = 6; // India average
const EMERGENCY_FUND_MONTHS_BASE = 6;
const EMERGENCY_FUND_MONTHS_CONSERVATIVE = 9;

const EXPECTED_RETURNS: Record<string, Record<string, number>> = {
  conservative: { equity: 10, debt: 7, gold: 6, liquid: 4 },
  moderate: { equity: 12, debt: 7.5, gold: 6.5, liquid: 4 },
  aggressive: { equity: 14, debt: 8, gold: 7, liquid: 4 },
};

const ALLOCATION_RULES: Record<string, Record<string, number[]>> = {
  short: { // < 3 years
    conservative: [30, 55, 10, 5],
    moderate: [45, 40, 10, 5],
    aggressive: [60, 30, 7, 3],
  },
  medium: { // 3-7 years
    conservative: [45, 40, 10, 5],
    moderate: [60, 25, 12, 3],
    aggressive: [75, 15, 8, 2],
  },
  long: { // > 7 years
    conservative: [55, 30, 12, 3],
    moderate: [70, 18, 10, 2],
    aggressive: [80, 12, 6, 2],
  },
};

// ============================================================
// MATH UTILITIES
// ============================================================

function round(value: number, digits = 0): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function resolveIncomeBounds(profile: UserFinancialProfile): { lowIncome: number; highIncome: number; hasRange: boolean } {
  if (
    profile.incomeInputType === "range" &&
    typeof profile.incomeRangeMinInr === "number" &&
    typeof profile.incomeRangeMaxInr === "number" &&
    profile.incomeRangeMinInr > 0 &&
    profile.incomeRangeMaxInr > 0
  ) {
    return {
      lowIncome: Math.min(profile.incomeRangeMinInr, profile.incomeRangeMaxInr),
      highIncome: Math.max(profile.incomeRangeMinInr, profile.incomeRangeMaxInr),
      hasRange: true,
    };
  }

  const exactIncome = profile.income > 0 ? profile.income : 0;
  return {
    lowIncome: exactIncome,
    highIncome: exactIncome,
    hasRange: false,
  };
}

function buildIncomeUtilization(profile: UserFinancialProfile, sip: number): FinancialSnapshot["utilization"] {
  const incomeBounds = resolveIncomeBounds(profile);

  if (incomeBounds.hasRange) {
    return {
      type: "range",
      minPercent: round((sip / incomeBounds.highIncome) * 100, 1),
      maxPercent: round((sip / incomeBounds.lowIncome) * 100, 1),
    };
  }

  return {
    type: "exact",
    exactPercent: profile.income > 0 ? round((sip / profile.income) * 100, 1) : 0,
  };
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value as Record<string, unknown>)) {
      const nested = (value as Record<string, unknown>)[key];
      if (nested && typeof nested === "object") {
        deepFreeze(nested);
      }
    }
  }

  return value;
}

export function futureValueFromSip(monthlySip: number, monthlyRate: number, months: number): number {
  if (months <= 0 || monthlySip <= 0) return 0;
  if (monthlyRate <= 0) return monthlySip * months;
  return monthlySip * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
}

export function futureValueFromLumpSum(principal: number, monthlyRate: number, months: number): number {
  if (months <= 0 || principal <= 0) return principal;
  if (monthlyRate <= 0) return principal;
  return principal * Math.pow(1 + monthlyRate, months);
}

/**
 * Project total corpus from current savings + monthly SIP at given return rate.
 * Single source of truth for FV calculations — used by both engine and dashboard visualization.
 * @param currentSavings - Starting principal
 * @param monthlySip - Monthly contribution
 * @param annualReturnPct - Annual return percentage (e.g., 12 for 12%)
 * @param months - Investment period in months
 * @returns Projected corpus value
 */
export function projectCorpusValue(
  currentSavings: number,
  monthlySip: number,
  annualReturnPct: number,
  months: number,
): number {
  const safeCurrentSavings = Math.max(currentSavings, 0);
  const safeSip = Math.max(monthlySip, 0);
  const safeMonths = Math.max(months, 0);
  const monthlyRate = Math.max(annualReturnPct, 0) / 12 / 100;

  if (safeMonths === 0) {
    return safeCurrentSavings;
  }

  if (monthlyRate === 0) {
    return safeCurrentSavings + safeSip * safeMonths;
  }

  const corpusGrowth = futureValueFromLumpSum(safeCurrentSavings, monthlyRate, safeMonths);
  const sipGrowth = futureValueFromSip(safeSip, monthlyRate, safeMonths);

  return corpusGrowth + sipGrowth;
}

function calculateStepUpSip(
  startSip: number,
  annualIncreasePct: number,
  months: number,
  annualReturnPct: number
): StepUpSipPlan {
  const monthlyRate = annualReturnPct / 1200;
  let totalCorpus = 0;
  let currentSip = startSip;
  let monthCount = 0;

  for (let year = 0; year < months / 12; year++) {
    const monthsInYear = Math.min(12, months - monthCount);
    if (monthsInYear <= 0) break;

    // SIP grows at investment rate
    totalCorpus = futureValueFromLumpSum(totalCorpus, monthlyRate, monthsInYear) +
                  futureValueFromSip(currentSip, monthlyRate, monthsInYear);

    monthCount += monthsInYear;
    currentSip = round(currentSip * (1 + annualIncreasePct / 100), 0);
  }

  return {
    startSip,
    annualIncreasePct,
    finalSip: currentSip,
    avgSip: round((startSip + currentSip) / 2, 0),
    projectedCorpus: round(totalCorpus, 0),
    isFeasible: false, // Determined later based on capacity
  };
}

function estimateMonthsToTarget(
  targetAmount: number,
  monthlyContribution: number,
  currentSavings: number,
  annualReturnPct: number,
  maxMonths = 600
): number | null {
  if (monthlyContribution <= 0 || targetAmount <= 0) return null;

  const monthlyRate = annualReturnPct / 1200;
  let corpus = currentSavings;

  for (let months = 1; months <= maxMonths; months++) {
    corpus = futureValueFromLumpSum(corpus, monthlyRate, 1) + monthlyContribution;
    if (corpus >= targetAmount) return months;
  }

  return null;
}

// ============================================================
// PROFILE BUILDERS
// ============================================================

/**
 * Adapter: thin wrapper around NormalizedPlanInput.profile.
 * The Reality Normalizer is the single source of truth for profile values now.
 */
function buildUserFinancialProfile(input: NormalizedPlanInput): UserFinancialProfile {
  return input.profile;
}

/**
 * Adapter: builds a GoalSpec from NormalizedPlanInput.
 * For non-corpus goals (insurance / tax_saving), targetAmount falls back to 0;
 * the engine will short-circuit feasibility math via goalIntent.isCorpusGoal.
 */
function buildGoalSpec(context: AgentContext, input: NormalizedPlanInput): GoalSpec {
  const goal = context.goals[0];
  const corpus = input.goalIntent.derivedCorpus ?? 0;
  const title = goal?.title
    || context.profile?.primary_financial_goal?.replace(/_/g, " ")
    || "Wealth Building";

  // If a financial_goals row has an explicit target_date, prefer it over the band horizon.
  let monthsToGoal = input.timeHorizonMonths;
  if (goal?.target_date) {
    const parsed = new Date(goal.target_date).getTime();
    if (!Number.isNaN(parsed)) {
      const diffMonths = Math.ceil((parsed - Date.now()) / (1000 * 60 * 60 * 24 * 30.44));
      if (diffMonths > 0) monthsToGoal = diffMonths;
    }
  }

  return {
    title,
    targetAmount: corpus,
    timeHorizonMonths: Math.max(1, monthsToGoal),
    priority: goal?.priority || "high",
    category: input.goalIntent.kind,
  };
}

// ============================================================
// CORE CALCULATIONS
// ============================================================

function calculateFeasibility(
  goal: GoalSpec,
  profile: UserFinancialProfile,
  annualReturnPct: number
): FeasibilityAnalysis {
  const monthlyRate = annualReturnPct / 1200;
  const months = goal.timeHorizonMonths;

  // Future value of current savings
  const futureSavings = futureValueFromLumpSum(profile.currentSavings, monthlyRate, months);

  // Required SIP calculation
  const sipGrowthFactor = monthlyRate <= 0
    ? months
    : (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate;

  const requiredSipRaw = sipGrowthFactor > 0
    ? (goal.targetAmount - futureSavings) / sipGrowthFactor
    : goal.targetAmount / months;

  const requiredSip = Math.max(0, Math.ceil(requiredSipRaw));
  const currentSip = profile.investmentCapacity;

  // Gap analysis
  const gapAmount = Math.max(0, requiredSip - currentSip);
  const gapPercentage = requiredSip > 0 ? round((gapAmount / requiredSip) * 100, 1) : 0;

  // Expected corpus at current SIP
  const expectedCorpus = futureSavings + futureValueFromSip(currentSip, monthlyRate, months);
  const shortfall = Math.max(0, goal.targetAmount - expectedCorpus);

  // Achievement probability (simplified model)
  let achievementProbability = 0;
  if (currentSip >= requiredSip * 1.1) achievementProbability = 95;
  else if (currentSip >= requiredSip) achievementProbability = 85;
  else if (currentSip >= requiredSip * 0.9) achievementProbability = 70;
  else if (currentSip >= requiredSip * 0.8) achievementProbability = 50;
  else if (currentSip >= requiredSip * 0.6) achievementProbability = 30;
  else achievementProbability = 15;

  // Return scenarios
  const scenarios: ReturnScenario[] = [
    { rate: annualReturnPct - 2, label: "Conservative", projectedCorpus: 0, achievementProbability: "low" },
    { rate: annualReturnPct, label: "Base Case", projectedCorpus: 0, achievementProbability: "medium" },
    { rate: annualReturnPct + 2, label: "Optimistic", projectedCorpus: 0, achievementProbability: "high" },
  ];

  for (const scenario of scenarios) {
    const r = scenario.rate / 1200;
    const futureSv = futureValueFromLumpSum(profile.currentSavings, r, months);
    const corpus = futureSv + futureValueFromSip(currentSip, r, months);
    scenario.projectedCorpus = round(corpus, 0);
    scenario.achievementProbability = corpus >= goal.targetAmount ? "high" : corpus >= goal.targetAmount * 0.8 ? "medium" : "low";
  }

  // Confidence level
  let confidence: FeasibilityAnalysis["confidence"] = "low";
  if (profile.income > 0 && profile.investmentCapacity > 0 && goal.targetAmount > 0) {
    confidence = gapPercentage < 20 ? "high" : gapPercentage < 50 ? "medium" : "low";
  }

  return {
    isFeasible: expectedCorpus >= goal.targetAmount * 0.9,
    confidence,
    requiredSip,
    currentSip,
    gapAmount,
    gapPercentage,
    expectedCorpus: round(expectedCorpus, 0),
    shortfall: round(shortfall, 0),
    achievementProbability,
    returnScenarios: scenarios,
  };
}

function calculateSmartAllocation(
  profile: UserFinancialProfile,
  goal: GoalSpec,
  gapPercentage: number,
  goalIntent: GoalIntent,
  feasibilityLabel: "comfortable" | "tight" | "stretched" | "not_viable",
  monthlySip: number
): SmartAllocation {
  // Determine horizon bucket
  let horizonBucket: keyof typeof ALLOCATION_RULES = "medium";
  if (goal.timeHorizonMonths < 36) horizonBucket = "short";
  else if (goal.timeHorizonMonths > 84) horizonBucket = "long";

  // Base allocation from rules
  const baseAllocation = ALLOCATION_RULES[horizonBucket][profile.riskProfile] || [60, 25, 12, 3];
  let [equity, debt, gold, liquid] = baseAllocation;

  // Adjust for large gap (more aggressive needed)
  if (gapPercentage > 50) {
    equity = Math.min(85, equity + 10);
    debt = Math.max(10, debt - 5);
    gold = Math.max(3, gold - 3);
  }

  // Adjust for no existing investments (slightly conservative initially)
  if (!profile.hasExistingInvestments) {
    equity = Math.max(30, equity - 5);
    debt = Math.min(60, debt + 5);
  }

  // Goal-type adjustments (deterministic, applied after horizon/risk base)
  const horizonYears = goal.timeHorizonMonths / 12;
  if (goalIntent.kind === "passive_income") {
    // Income-generating tilt: more debt for stability and yield.
    equity = Math.max(30, equity - 10);
    debt = debt + 10;
  } else if (goalIntent.kind === "child_education" && horizonYears < 7) {
    // Capital-protection tilt as the milestone approaches.
    equity = Math.max(25, equity - 10);
    debt = debt + 10;
  } else if (goalIntent.kind === "retirement_planning" && profile.age !== null && profile.age > 50) {
    // Pre-retirement de-risking.
    equity = Math.max(25, equity - 15);
    debt = debt + 15;
  }

  // Decision-state overrides.
  if (feasibilityLabel === "not_viable") {
    equity = Math.max(20, equity - 20);
    debt = Math.min(60, debt + 10);
    liquid = Math.min(15, liquid + 5);
  } else if (goal.timeHorizonMonths < 36) {
    equity = Math.max(25, equity - 10);
    debt = debt + 10;
  } else if (goal.timeHorizonMonths > 84 && profile.riskProfile === "aggressive") {
    equity = Math.min(85, equity + 10);
    debt = Math.max(10, debt - 5);
  }

  // Allocation Safety Rules (enforced):
  // - If horizon < 5 years, cap equity exposure to 60% to avoid excessive short-term equity risk.
  if (horizonYears < 5) {
    equity = Math.min(equity, 60);
  }

  // Normalize to 100% weights
  const totalWeights = equity + debt + gold + liquid;
  const equityPct = (equity / totalWeights);
  const debtPct = (debt / totalWeights);
  const goldPct = (gold / totalWeights);
  const liquidPct = 1 - equityPct - debtPct - goldPct;

  // Calculate absolute amounts and round to nearest integer
  let equityAmt = Math.round(monthlySip * equityPct);
  let debtAmt = Math.round(monthlySip * debtPct);
  let goldAmt = Math.round(monthlySip * goldPct);
  let liquidAmt = Math.round(monthlySip * liquidPct);

  // Correct rounding remainder to ensure sum exactly equals monthlySip
  const sum = equityAmt + debtAmt + goldAmt + liquidAmt;
  const diff = monthlySip - sum;

  if (diff !== 0) {
    // Apply difference to the largest allocation to minimize relative impact
    if (equityAmt >= debtAmt && equityAmt >= goldAmt && equityAmt >= liquidAmt) {
      equityAmt += diff;
    } else if (debtAmt >= equityAmt && debtAmt >= goldAmt && debtAmt >= liquidAmt) {
      debtAmt += diff;
    } else {
      liquidAmt += diff;
    }
  }

  const rationale = `Based on ${goal.timeHorizonMonths}-month horizon, ${profile.riskProfile} risk, ${gapPercentage.toFixed(0)}% funding gap, and ${goalIntent.kind.replace(/_/g, " ")} goal`;

  return {
    equity: equityAmt,
    debt: debtAmt,
    gold: goldAmt,
    liquid: liquidAmt,
    rationale,
    rebalancingNeeded: false,
  };
}

function calculateEmergencyFund(profile: UserFinancialProfile): EmergencyFundAnalysis {
  const requiredMonths = profile.riskProfile === "conservative"
    ? EMERGENCY_FUND_MONTHS_CONSERVATIVE
    : EMERGENCY_FUND_MONTHS_BASE;

  const monthlyExpenses = profile.expenses + profile.emi;
  const requiredAmount = monthlyExpenses * requiredMonths;
  const currentAmount = profile.currentSavings * 0.3; // Assume 30% of savings is liquid emergency fund
  const shortfall = Math.max(0, requiredAmount - currentAmount);

  let priority: EmergencyFundAnalysis["priority"] = "adequate";
  if (shortfall > requiredAmount * 0.5) priority = "critical";
  else if (shortfall > 0) priority = "recommended";

  return {
    requiredMonths,
    requiredAmount: round(requiredAmount, 0),
    currentAmount: round(currentAmount, 0),
    shortfall: round(shortfall, 0),
    isAdequate: shortfall === 0,
    priority,
  };
}

function generateStrategyOptions(
  goal: GoalSpec,
  profile: UserFinancialProfile,
  feasibility: FeasibilityAnalysis,
  annualReturnPct: number
): StrategyOption[] {
  const strategies: StrategyOption[] = [];

  // 1. Increase SIP to required amount
  if (feasibility.gapAmount > 0) {
    const monthsToGoal = goal.timeHorizonMonths;
    const achievable = feasibility.requiredSip <= profile.income * 0.6; // Max 60% of income

    strategies.push({
      type: "increase_sip",
      label: "Maximize SIP",
      description: `Increase monthly investment to ₹${feasibility.requiredSip.toLocaleString()} to achieve your goal`,
      requiredSip: feasibility.requiredSip,
      extendedMonths: null,
      stepUpPlan: null,
      reducedTarget: null,
      lumpSumRequired: null,
      isRecommended: achievable,
      tradeOffs: achievable
        ? ["Requires budget reallocation", "Higher commitment monthly"]
        : ["Exceeds recommended 60% of income threshold", "May strain cash flow"],
    });
  }

  // 2. Extend timeline
  const extendedMonths = estimateMonthsToTarget(
    goal.targetAmount,
    profile.investmentCapacity,
    profile.currentSavings,
    annualReturnPct
  );

  if (extendedMonths && extendedMonths > goal.timeHorizonMonths) {
    const years = round(extendedMonths / 12, 1);
    strategies.push({
      type: "extend_timeline",
      label: "Extend Timeline",
      description: `Keep current SIP of ₹${profile.investmentCapacity.toLocaleString()} but extend to ${years} years`,
      requiredSip: null,
      extendedMonths,
      stepUpPlan: null,
      reducedTarget: null,
      lumpSumRequired: null,
      isRecommended: extendedMonths <= goal.timeHorizonMonths * 1.5,
      tradeOffs: ["Delayed goal achievement", "More time for compounding"],
    });
  }

  // 3. Step-up SIP
  const stepUpRates = [10, 15, 20];
  for (const stepUpRate of stepUpRates) {
    const stepUpPlan = calculateStepUpSip(
      profile.investmentCapacity,
      stepUpRate,
      goal.timeHorizonMonths,
      annualReturnPct
    );

    stepUpPlan.isFeasible = stepUpPlan.projectedCorpus >= goal.targetAmount;

    if (stepUpPlan.isFeasible || stepUpPlan.projectedCorpus >= goal.targetAmount * 0.8) {
      strategies.push({
        type: "step_up_sip",
        label: `Step-Up SIP (+${stepUpRate}% yearly)`,
        description: `Start at ₹${stepUpPlan.startSip.toLocaleString()}, increase ${stepUpRate}% annually to ₹${stepUpPlan.finalSip.toLocaleString()}`,
        requiredSip: null,
        extendedMonths: null,
        stepUpPlan,
        reducedTarget: null,
        lumpSumRequired: null,
        isRecommended: stepUpRate === 10 && stepUpPlan.isFeasible, // Recommend 10% step-up
        tradeOffs: [
          `Year ${Math.floor(goal.timeHorizonMonths / 12 / 2)} SIP will be ₹${Math.round(stepUpPlan.avgSip).toLocaleString()}`,
          "Requires income growth to sustain",
        ],
      });
      break; // Only add the first feasible one
    }
  }

  // 4. Reduce goal target
  if (feasibility.gapPercentage > 30) {
    const achievableTarget = round(goal.targetAmount * 0.7, -5);
    strategies.push({
      type: "reduce_goal",
      label: "Adjust Goal Target",
      description: `Reduce target from ₹${goal.targetAmount.toLocaleString()} to ₹${achievableTarget.toLocaleString()}`,
      requiredSip: null,
      extendedMonths: null,
      stepUpPlan: null,
      reducedTarget: achievableTarget,
      lumpSumRequired: null,
      isRecommended: false,
      tradeOffs: ["70% of original goal", "More realistic with current capacity"],
    });
  }

  // 5. Lump sum boost
  const shortfallGap = goal.targetAmount - feasibility.expectedCorpus;
  if (shortfallGap > 0) {
    // Calculate lump sum needed to close gap
    const monthlyRate = annualReturnPct / 1200;
    const months = goal.timeHorizonMonths;
    const lumpSumNeeded = shortfallGap / Math.pow(1 + monthlyRate, months);

    strategies.push({
      type: "lump_sum_boost",
      label: "One-Time Boost",
      description: `Add ₹${round(lumpSumNeeded, -4).toLocaleString()} now to bridge the gap`,
      requiredSip: null,
      extendedMonths: null,
      stepUpPlan: null,
      reducedTarget: null,
      lumpSumRequired: round(lumpSumNeeded, -4),
      isRecommended: lumpSumNeeded <= profile.currentSavings * 0.5,
      tradeOffs: ["Uses existing savings", "Immediate impact on corpus"],
    });
  }

  return strategies;
}

function generateWarnings(
  profile: UserFinancialProfile,
  feasibility: FeasibilityAnalysis,
  emergencyFund: EmergencyFundAnalysis,
  incomeBounds: { lowIncome: number; highIncome: number; hasRange: boolean },
): string[] {
  const warnings: string[] = [];

  const worstCaseUtilization = incomeBounds.lowIncome > 0 ? (feasibility.currentSip / incomeBounds.lowIncome) * 100 : 0;
  const bestCaseUtilization = incomeBounds.highIncome > 0 ? (feasibility.currentSip / incomeBounds.highIncome) * 100 : 0;

  if (feasibility.gapPercentage > 50) {
    warnings.push(`Investment gap is ${feasibility.gapPercentage.toFixed(0)}% - significant increase needed`);
  }

  if (incomeBounds.hasRange) {
    warnings.push(
      `Income range scenario: utilization can sit between ${bestCaseUtilization.toFixed(0)}% and ${worstCaseUtilization.toFixed(0)}% of income; plan against the higher utilization case.`,
    );
  }

  if (worstCaseUtilization > 70) {
    warnings.push("Worst-case income utilization is above 70% - keep the plan conservative.");
  }

  if (emergencyFund.priority === "critical") {
    warnings.push(`Emergency fund critically low - only ${emergencyFund.requiredMonths} months covered`);
  }

  if (profile.investmentCapacity < profile.expenses * 0.1) {
    warnings.push("Investment capacity below 10% of expenses - consider expense optimization");
  }

  if (profile.emi > profile.income * 0.4) {
    warnings.push("EMI burden above 40% of income - debt stress risk");
  }

  if (feasibility.achievementProbability < 50) {
    warnings.push("Current plan has <50% probability of achieving target");
  }

  return warnings;
}

function generateRecommendations(
  profile: UserFinancialProfile,
  feasibility: FeasibilityAnalysis,
  emergencyFund: EmergencyFundAnalysis,
  strategies: StrategyOption[]
): string[] {
  const recommendations: string[] = [];

  // Emergency fund first
  if (emergencyFund.priority === "critical") {
    recommendations.push("Priority 1: Build emergency fund to 6 months expenses before increasing investments");
  }

  // Best strategy
  const bestStrategy = strategies.find(s => s.isRecommended);
  if (bestStrategy) {
    recommendations.push(`Recommended approach: ${bestStrategy.label} - ${bestStrategy.description}`);
  }

  // SIP vs EMI balance
  const totalCommitment = profile.emi + feasibility.requiredSip;
  if (totalCommitment > profile.income * 0.5) {
    recommendations.push("Total monthly commitments (EMI + SIP) exceed 50% of income - consider pre-paying some debt first");
  }

  // Tax optimization
  if (profile.taxRegime === "old" && feasibility.requiredSip > 12500) {
    recommendations.push("Consider ELSS funds for tax savings under Section 80C");
  }

  return recommendations;
}

// ============================================================
// HOLDINGS ANALYSIS
// ============================================================

function computeHoldingsAnalysis(context: AgentContext): HoldingsAnalysis | undefined {
  const holdings = context.holdings;
  if (holdings.length === 0) return undefined;

  // Calculate total market value and individual values
  const holdingsWithValues = holdings.map(h => ({
    ...h,
    marketValue: h.quantity * h.current_price_inr,
    costValue: h.quantity * h.average_buy_price_inr,
  }));

  const totalValue = holdingsWithValues.reduce((sum, h) => sum + h.marketValue, 0);
  const totalCost = holdingsWithValues.reduce((sum, h) => sum + h.costValue, 0);
  
  // Find top holding
  const topHolding = holdingsWithValues.sort((a, b) => b.marketValue - a.marketValue)[0];
  const topHoldingPct = totalValue > 0 ? (topHolding.marketValue / totalValue) * 100 : 0;

  // Calculate asset class allocation
  const assetAllocation: Record<string, number> = {};
  holdingsWithValues.forEach(h => {
    const assetClass = h.asset_class || 'Unclassified';
    assetAllocation[assetClass] = (assetAllocation[assetClass] || 0) + h.marketValue;
  });
  
  // Convert to percentages
  Object.keys(assetAllocation).forEach(key => {
    assetAllocation[key] = totalValue > 0 ? round((assetAllocation[key] / totalValue) * 100, 2) : 0;
  });

  // Calculate sector exposure
  const sectorExposure: Record<string, number> = {};
  holdingsWithValues.forEach(h => {
    const sector = h.sector || 'Unclassified';
    sectorExposure[sector] = (sectorExposure[sector] || 0) + h.marketValue;
  });
  
  Object.keys(sectorExposure).forEach(key => {
    sectorExposure[key] = totalValue > 0 ? round((sectorExposure[key] / totalValue) * 100, 2) : 0;
  });

  // Calculate unrealized P&L
  const unrealizedPnlPct = totalCost > 0 ? round(((totalValue - totalCost) / totalCost) * 100, 2) : null;

  return {
    totalValue: round(totalValue, 2),
    topHoldingPct: round(topHoldingPct, 2),
    concentrationRisk: topHoldingPct > 45 ? 'high' : topHoldingPct > 30 ? 'medium' : 'low',
    assetAllocation,
    sectorExposure,
    unrealizedPnlPct,
    holdingsCount: holdings.length,
  };
}

function generateRebalancingAdvice(
  currentAllocation: Record<string, number>,
  targetAllocation: SmartAllocation,
  concentrationRisk: 'low' | 'medium' | 'high'
): string[] {
  const advice: string[] = [];

  // Check equity concentration
  const currentEquity = currentAllocation['equity'] || currentAllocation['Equity'] || 0;
  if (currentEquity > targetAllocation.equity + 10) {
    advice.push(`Reduce equity exposure from ${currentEquity}% to ~${targetAllocation.equity}%`);
  }

  // Check concentration risk
  if (concentrationRisk === 'high') {
    advice.push('Top holding exceeds 45% - consider diversification');
  } else if (concentrationRisk === 'medium') {
    advice.push('Monitor concentration - top holding is 30-45%');
  }

  return advice;
}

// Future Value of an ordinary annuity (end-of-period contributions).
// Kept identical to futureValueFromSip so all corpus numbers in the snapshot agree.
function calculateFV(pmt: number, rate: number, nper: number): number {
  if (nper <= 0 || pmt <= 0) return 0;
  if (rate <= 0) return pmt * nper;
  return pmt * ((Math.pow(1 + rate, nper) - 1) / rate);
}

// Step-up SIP Future Value calculation
function calculateStepUpFV(initialSip: number, yearlyIncreaseRate: number, monthlyRate: number, months: number): number {
  let corpus = 0;
  let currentSip = initialSip;
  
  for (let month = 1; month <= months; month++) {
    corpus = (corpus + currentSip) * (1 + monthlyRate);
    // Increase SIP every 12 months
    if (month % 12 === 0) {
      currentSip = currentSip * (1 + yearlyIncreaseRate);
    }
  }
  
  return corpus;
}

// Generate goal-aware strategies for closing the gap
function generateGapStrategies(
  goal: any,
  profile: any,
  feasibility: any,
  currentOutcome: number,
  annualReturnPct: number,
): any[] {
  const strategies = [];
  const gapAmount = feasibility.gapAmount;
  const monthlyRate = annualReturnPct / 1200;

  // Strategy 1: Maximize SIP (if income allows)
  const maxPossibleSip = Math.round(profile.income * 0.5); // 50% of income
  if (maxPossibleSip > feasibility.currentSip && maxPossibleSip <= feasibility.requiredSip) {
    const projectedCorpus = Math.round(calculateFV(maxPossibleSip, monthlyRate, goal.timeHorizonMonths));
    strategies.push({
      id: 'maximize',
      title: 'Increase Investment',
      description: `Raise SIP to ₹${maxPossibleSip.toLocaleString()}/month`,
      outcome: `Reach ₹${projectedCorpus.toLocaleString()} (${Math.round((projectedCorpus / goal.targetAmount) * 100)}% of goal)`,
      feasibility: projectedCorpus >= goal.targetAmount ? 'achievable' : 'partial',
      tradeoffs: ['Requires budget reallocation', 'Higher monthly commitment'],
      monthlySip: maxPossibleSip,
      projectedCorpus,
    });
  }
  
  // Strategy 2: Extend Timeline
  const extendedYears = Math.ceil(findYearsToAchieve(goal.targetAmount, feasibility.currentSip, annualReturnPct / 100));
  if (extendedYears > 0 && extendedYears <= 25) {
    strategies.push({
      id: 'extend',
      title: 'Extend Timeline',
      description: `Keep ₹${feasibility.currentSip.toLocaleString()}/month, extend to ${extendedYears} years`,
      outcome: `Achieve full ₹${goal.targetAmount.toLocaleString()} goal`,
      feasibility: 'achievable',
      tradeoffs: ['Longer wait', 'More time for compounding to work'],
      monthlySip: feasibility.currentSip,
      years: extendedYears,
      projectedCorpus: goal.targetAmount,
    });
  }
  
  // Strategy 3: Hybrid approach
  const hybridSip = Math.round((feasibility.currentSip + Math.min(maxPossibleSip, feasibility.requiredSip)) / 2);
  const hybridYears = Math.ceil(findYearsToAchieve(goal.targetAmount, hybridSip, annualReturnPct / 100));
  if (hybridYears > 0 && hybridYears <= 25) {
    strategies.push({
      id: 'hybrid',
      title: 'Balanced Approach',
      description: `Increase to ₹${hybridSip.toLocaleString()}/month + ${hybridYears} years`,
      outcome: `Achieve full goal with moderate compromise`,
      feasibility: 'achievable',
      tradeoffs: ['Some budget adjustment needed', 'Moderate timeline extension'],
      monthlySip: hybridSip,
      years: hybridYears,
      projectedCorpus: goal.targetAmount,
    });
  }
  
  return strategies;
}

// Helper to find years needed to achieve goal with given SIP
function findYearsToAchieve(target: number, monthlySip: number, annualReturn: number): number {
  const monthlyRate = annualReturn / 12;
  let corpus = 0;
  let months = 0;
  const maxMonths = 30 * 12; // 30 years max
  
  while (corpus < target && months < maxMonths) {
    months++;
    corpus = (corpus + monthlySip) * (1 + monthlyRate);
  }
  
  return Math.ceil(months / 12);
}

// ============================================================
// MAIN EXPORT
// ============================================================

const SNAPSHOT_VERSION = "1.0.0";

export function generateFinancialSnapshot(context: AgentContext, debug = false): FinancialSnapshot {
  // SINGLE entry point for normalization. Engine no longer reads bands directly.
  const normalized = normalizePlanInput(context);
  // Debug logging available for migration verification if needed
  // if (debug) { console.log("ENGINE INPUT", normalized, {...}); }
  const profile = buildUserFinancialProfile(normalized);
  const goal = buildGoalSpec(context, normalized);
  const goalIntent = normalized.goalIntent;
  const constraints = normalized.constraints;
  const sipOriginal = normalized.profile.investmentCapacity;
  const dataQuality = context.dataQuality ?? {
    hasFallbacks: false,
    missingFields: [],
    confidence: "high" as const,
    fallbackCount: 0,
    defaultedFields: [],
  };

  // Get expected returns for risk profile
  const returns = EXPECTED_RETURNS[profile.riskProfile] || EXPECTED_RETURNS.moderate;
  const blendedReturn = round(
    (returns.equity * 0.6 + returns.debt * 0.25 + returns.gold * 0.1 + returns.liquid * 0.05),
    1
  );
  const monthlyRate = (blendedReturn / 100) / 12;

  // Core calculations
  const feasibility = calculateFeasibility(goal, profile, blendedReturn);
  // Apply hard constraint overrides on isFeasible.
  if (constraints.feasibilityVerdict === "not_viable" || constraints.feasibilityVerdict === "extreme_mismatch") {
    feasibility.isFeasible = false;
    feasibility.confidence = "low";
  } else if (constraints.feasibilityVerdict === "high_risk") {
    feasibility.confidence = "low";
  }
  const decisionLabel = classifyDecisionFeasibility(goal, profile, feasibility, constraints);
  const allocation = calculateSmartAllocation(profile, goal, feasibility.gapPercentage, goalIntent, decisionLabel, sipOriginal);
  
  if (debug) {
    console.log("ALLOCATION DEBUG", {
      sipOriginal,
      allocation,
      total: allocation.equity + allocation.debt + allocation.gold + allocation.liquid
    });
  }
  const emergencyFund = calculateEmergencyFund(profile);
  const strategies = generateStrategyOptions(goal, profile, feasibility, blendedReturn);
  const incomeBounds = resolveIncomeBounds(profile);
  const warnings = generateWarnings(profile, feasibility, emergencyFund, incomeBounds);
  const recommendations = generateRecommendations(profile, feasibility, emergencyFund, strategies);

  // Treat target_amount_inr as a future-value corpus; expose it directly without
  // applying additional inflation in the snapshot.
  const inflationAdjustedGoal = goal.targetAmount;

  // Holdings analysis
  const holdingsAnalysis = computeHoldingsAnalysis(context);
  const rebalancingAdvice = holdingsAnalysis 
    ? generateRebalancingAdvice(holdingsAnalysis.assetAllocation, allocation, holdingsAnalysis.concentrationRisk)
    : undefined;

  // Time horizon with transparency
  const timeHorizonBand = goal.timeHorizonMonths <= 12 ? "under_1_year" :
    goal.timeHorizonMonths <= 36 ? "1_3_years" :
    goal.timeHorizonMonths <= 60 ? "3_5_years" : "5_10_years";
  const resolvedYears = Math.round(goal.timeHorizonMonths / 12);
  const timeHorizonLabel = `${resolvedYears} years${timeHorizonBand === "5_10_years" ? " (midpoint of 5-10 year range)" : ""}`;

  // Scenario outcomes — single source of truth: derived from the same blended return
  // and the same SIP+savings formula as feasibility.expectedCorpus.
  // moderate === feasibility.expectedCorpus by construction.
  const fvAtRate = (annualPct: number) => {
    const r = annualPct / 1200;
    return Math.round(
      futureValueFromLumpSum(profile.currentSavings, r, goal.timeHorizonMonths) +
        futureValueFromSip(feasibility.currentSip, r, goal.timeHorizonMonths),
    );
  };
  const scenarioOutcomes = {
    conservative: fvAtRate(blendedReturn - 2),
    moderate: feasibility.expectedCorpus,
    optimistic: fvAtRate(blendedReturn + 2),
  };

  // What user will actually achieve with current SIP
  const actualOutcome = {
    withCurrentSip: scenarioOutcomes.moderate,
    shortfall: Math.max(0, goal.targetAmount - scenarioOutcomes.moderate),
    percentageOfGoal: goal.targetAmount > 0 ? Math.round((scenarioOutcomes.moderate / goal.targetAmount) * 100) : 100
  };

  if (debug) {
    console.log("[ENGINE DEBUG] SIP_FEASIBILITY", {
      target: goal.targetAmount,
      sipOriginal,
      projectedCorpus: actualOutcome.withCurrentSip,
      requiredSip: feasibility.requiredSip,
      monthlyRate,
      months: goal.timeHorizonMonths,
    });
  }

  // Generate goal-aware gap strategies
  const gapStrategies = generateGapStrategies(goal, profile, feasibility, scenarioOutcomes.moderate, blendedReturn);

  // Step-up SIP suggestion for high earners (>INR 2L/month).
  // Hard rule: never project a year where SIP > 80% of income — truncate at the cap year.
  let stepUpSuggestion: StepUpSuggestion | undefined;
  if (profile.income > 200000 && goalIntent.isCorpusGoal) {
    const stepUpRate = 0.10; // 10% yearly increase
    const incomeCap = profile.income * STEP_UP_INCOME_CAP_RATIO;
    const totalYears = goal.timeHorizonMonths / 12;
    // Find the first year the projected SIP exceeds the cap; truncate there.
    let cappedYears = totalYears;
    for (let y = 1; y <= totalYears; y++) {
      const sipAtYear = feasibility.currentSip * Math.pow(1 + stepUpRate, y - 1);
      if (sipAtYear > incomeCap) {
        cappedYears = y - 1;
        break;
      }
    }
    const cappedMonths = Math.max(1, Math.round(cappedYears * 12));
    const stepUpCorpus = calculateStepUpFV(feasibility.currentSip, stepUpRate, monthlyRate, cappedMonths);
    const fixedCorpus = scenarioOutcomes.moderate;
    const finalSip = feasibility.currentSip * Math.pow(1 + stepUpRate, cappedYears);

    // Sanity check - only show if result is reasonable (less than 10x goal and positive)
    if (stepUpCorpus > 0 && stepUpCorpus < goal.targetAmount * 10) {
      stepUpSuggestion = {
        yearlyIncrease: stepUpRate,
        finalMonthlySip: Math.round(finalSip),
        projectedCorpus: Math.round(stepUpCorpus),
        vsFixedSip: Math.round(stepUpCorpus - fixedCorpus),
      };
    }
  }

  // Calculate derived values for return
  const utilization = buildIncomeUtilization(profile, feasibility.currentSip);
  const utilizationInsight = generateIncomeUtilizationInsight(profile, feasibility);
  const actionPlan = generateActionPlan(
    feasibility,
    emergencyFund,
    context.holdings.length > 0,
    feasibility.currentSip >= feasibility.requiredSip ? "optional" : "recommended",
  );
  const milestoneRoadmap = generateMilestoneRoadmap(feasibility.currentSip, profile.currentSavings, goal.timeHorizonMonths, blendedReturn / 100);
  const behavioralProfile = generateBehavioralProfile(profile, feasibility, utilizationInsight);
  const decision = buildDecision(goal, profile, feasibility, actualOutcome, goalIntent, constraints);
  const goalDeltaPercent = goal.targetAmount > 0
    ? round(((actualOutcome.withCurrentSip - goal.targetAmount) / goal.targetAmount) * 100, 1)
    : 0;
  // SINGLE SOURCE OF TRUTH: collapse the boolean isFeasible into decision.feasibility so they
  // can never disagree. The decision layer is the only feasibility verdict downstream consumers see.
  feasibility.isFeasible = decision.feasibility !== "not_viable";

  const snapshot = {
    sipOriginal,
    // Keep computed usage equal to explicit user-entered SIP.
    sipUsed: sipOriginal,
    maxAllowedSip: constraints.flags.maxAllowedSip,
    isOverLimit: constraints.flags.isOverLimit,
    utilizationPercent: constraints.flags.utilizationPercent,
    utilization,
    requiredSip: feasibility.requiredSip,
    projectedCorpus: actualOutcome.withCurrentSip,
    gapAmount: feasibility.gapAmount,
    goalDeltaPercent,
    userProfile: profile,
    goal,
    feasibility,
    allocation,
    emergencyFund,
    strategyOptions: strategies,
    warnings,
    recommendations,
    inflationAdjustedGoal,
    generatedAt: new Date().toISOString(),
    holdingsAnalysis,
    rebalancingNeeded: (rebalancingAdvice?.length || 0) > 0,
    rebalancingAdvice,
    version: SNAPSHOT_VERSION,
    timeHorizon: {
      band: timeHorizonBand,
      resolvedYears,
      label: timeHorizonLabel,
    },
    expectedReturn: blendedReturn / 100,
    // Per-asset-class return assumptions used by the engine for this risk profile.
    // UI components MUST use these instead of hardcoding rates.
    assetReturns: {
      equity: returns.equity / 100,
      debt: returns.debt / 100,
      gold: returns.gold / 100,
      liquid: returns.liquid / 100,
    },
    // The ± spread (in percentage points) used around blendedReturn for scenarios.
    scenarioSpread: 2,
    scenarioOutcomes: {
      conservative: scenarioOutcomes.conservative,
      moderate: scenarioOutcomes.moderate,
      optimistic: scenarioOutcomes.optimistic,
    },
    actualOutcome: {
      withCurrentSip: actualOutcome.withCurrentSip,
      shortfall: actualOutcome.shortfall,
      percentageOfGoal: actualOutcome.percentageOfGoal,
    },
    gapStrategies,
    stepUpSuggestion,
    utilizationInsight,
    actionPlan,
    milestoneRoadmap,
    behavioralProfile,
    decision,
    goalIntent,
    constraints,
    dataQuality,
  };

  if (debug) {
    console.log("SNAPSHOT OUTPUT", snapshot, {
      sipOriginal: snapshot.sipOriginal,
      sipUsed: snapshot.sipUsed,
      income: snapshot.userProfile.income,
      horizon: snapshot.goal.timeHorizonMonths / 12,
      target: snapshot.goal.targetAmount,
      maxAllowedSip: snapshot.maxAllowedSip,
      isOverLimit: snapshot.isOverLimit,
      dataQuality: snapshot.dataQuality,
    });
  }

  deepFreeze(snapshot);

  return snapshot;
}

// Generate milestone roadmap - year by year progress
function generateMilestoneRoadmap(
  monthlySip: number,
  initialSavings: number,
  months: number,
  annualReturn: number
): Milestone[] {
  const milestones: Milestone[] = [];
  const totalYears = Math.ceil(months / 12);
  
  // Key milestone years
  const keyYears = [1, 2, 3, 5, 10, 20, totalYears].filter((y, i, arr) => y <= totalYears && arr.indexOf(y) === i);
  
  const getLabel = (year: number): string => {
    if (year === 1) return "Foundation built";
    if (year === 2) return "Habit formed";
    if (year === 3) return "Compounding begins";
    if (year === 5) return "Momentum phase";
    if (year === 10) return "Wealth accelerator";
    return "Target year";
  };
  
  for (const year of keyYears) {
    const yearMonths = Math.min(year * 12, months);
    const value = projectCorpusValue(initialSavings, monthlySip, annualReturn * 100, yearMonths);
    const invested = initialSavings + (monthlySip * yearMonths);
    
    milestones.push({
      year,
      projectedValue: Math.round(value),
      investedPrincipal: Math.round(invested),
      milestone: year === totalYears ? "Goal target" : getLabel(year),
      label: year === totalYears ? "Target reached" : getLabel(year)
    });
  }
  
  return milestones;
}

// Generate behavioral profile - archetype classification
function generateBehavioralProfile(
  profile: UserFinancialProfile,
  feasibility: FeasibilityAnalysis,
  utilizationInsight: { level: string; ratio: number }
): { archetype: string; summary: string; insight: string; recommendation: string } {
  const ratio = utilizationInsight.ratio;
  const gapPct = feasibility.gapPercentage;
  
  // High income, low investment
  if (ratio < 15 && profile.income > 150000) {
    return {
      archetype: 'high_income_low_investment',
      summary: "You are a high-income user but under-investing relative to your goal.",
      insight: "Your biggest leverage is increasing commitment, not chasing returns.",
      recommendation: "Focus on increasing SIP by 20%+ rather than finding 'better' funds."
    };
  }
  
  // Ambitious goal, tight capacity
  if (gapPct > 60) {
    return {
      archetype: 'ambitious_goal_tight_capacity',
      summary: `Required SIP is about ${(feasibility.requiredSip / Math.max(feasibility.currentSip, 1)).toFixed(1)}x your current investment.`,
      insight: `Closing this gap needs both a higher monthly SIP and more time.`,
      recommendation: `Step up SIP toward ₹${(feasibility.requiredSip / 100000).toFixed(1)}L/month or extend your timeline.`
    };
  }
  
  // On track
  if (feasibility.isFeasible) {
    return {
      archetype: 'disciplined_builder',
      summary: "You're on track with a solid wealth-building plan.",
      insight: "Consistency is your superpower. Stay the course.",
      recommendation: "Consider small yearly SIP increases to beat inflation."
    };
  }
  
  // Early stage
  return {
    archetype: 'early_stage_optimizer',
    summary: "You're building good financial habits early.",
    insight: "Time is on your side. Start now, optimize later.",
    recommendation: "Focus on increasing income alongside SIP growth."
  };
}

// Generate income utilization insight
function generateIncomeUtilizationInsight(
  profile: UserFinancialProfile,
  feasibility: FeasibilityAnalysis
): { level: 'low' | 'healthy' | 'aggressive' | 'risky' | 'unsustainable'; ratio: number; message: string; potential: number | null } {
  const incomeBounds = resolveIncomeBounds(profile);
  const ratio = incomeBounds.lowIncome > 0 ? (feasibility.currentSip / incomeBounds.lowIncome) * 100 : 0;
  const bestCaseRatio = incomeBounds.highIncome > 0 ? (feasibility.currentSip / incomeBounds.highIncome) * 100 : ratio;
  const rangeNote = incomeBounds.hasRange ? `Range scenario: ${bestCaseRatio.toFixed(0)}% to ${ratio.toFixed(0)}% of income.` : "";
  
  // CRITICAL FIX: Add unsustainable tier for >100% utilization
  if (ratio > 100) {
    return {
      level: 'unsustainable',
      ratio,
      message: `You're investing ${ratio.toFixed(0)}% of your income. This exceeds your income and may not be sustainable. ${rangeNote}`.trim(),
      potential: Math.round(profile.income * 0.4)
    };
  }
  
  // FIX: New tier system - honest, not flattering, goal-linked when feasible
  if (ratio < 30) {
    const isHighIncome = profile.income >= 200000;
    let message: string;
    if (feasibility.isFeasible) {
      // Plan reaches goal but utilization is low: tie to goal, not generic capacity
      message = isHighIncome
        ? `At your income level, a small SIP increase ensures you comfortably reach your goal. ${rangeNote}`.trim()
        : `You're on track at ~${ratio.toFixed(0)}% of income. A small SIP increase locks in a buffer above your goal. ${rangeNote}`.trim();
    } else {
      const underInvestingNote = feasibility.gapPercentage > 30
        ? " Given your goal, this is low—increasing allocation can significantly improve outcomes."
        : "";
      const capacityNote = isHighIncome ? " You have strong capacity to invest more." : "";
      message = `You're investing only ~${ratio.toFixed(0)}% of your income.${capacityNote}${underInvestingNote} ${rangeNote}`.trim();
    }
    return {
      level: 'low',
      ratio,
      message,
      potential: feasibility.isFeasible ? null : Math.round(profile.income * 0.4)
    };
  } else if (ratio < 50) {
    return {
      level: 'healthy',
      ratio,
      message: `Healthy: ${ratio.toFixed(0)}% of income invested. Good balance between growth and flexibility. ${rangeNote}`.trim(),
      potential: null
    };
  } else if (ratio < 70) {
    return {
      level: 'aggressive',
      ratio,
      message: `Aggressive: ${ratio.toFixed(0)}% of income invested. Fast growth potential—ensure this is sustainable. ${rangeNote}`.trim(),
      potential: null
    };
  } else {
    return {
      level: 'risky',
      ratio,
      message: `⚠️ ${ratio.toFixed(0)}% of income invested. High commitment—ensure emergency fund and expense coverage first. ${rangeNote}`.trim(),
      potential: null
    };
  }
}

// Generate 30-day action plan
function generateActionPlan(
  feasibility: FeasibilityAnalysis,
  emergencyFund: EmergencyFundAnalysis,
  hasExistingInvestments: boolean,
  stepUpMode: "optional" | "recommended",
): Array<{ priority: number; action: string; impact: string; timeframe: string }> {
  const actions = [];
  
  // Priority 1: Emergency fund if critical
  if (emergencyFund.priority === 'critical') {
    actions.push({
      priority: 1,
      action: "Build emergency fund before investing",
      impact: "Prevents breaking investments during emergencies",
      timeframe: "This month"
    });
  }
  
  // Priority 2: Start SIP
  actions.push({
    priority: 2,
    action: `Start ₹${feasibility.currentSip.toLocaleString()} monthly SIP`,
    impact: "Begins compounding immediately - every month counts",
    timeframe: "Within 7 days"
  });
  
  // Priority 3: Set up auto-increase
  actions.push({
    priority: 3,
    action: stepUpMode === "recommended" ? "Enable auto-step up: 10% yearly SIP increase" : "Optional: enable 5-8% yearly SIP step-up",
    impact: stepUpMode === "recommended" ? "Needed to close the gap and keep pace with inflation" : "Can accelerate wealth creation while maintaining current feasibility",
    timeframe: "This week"
  });
  
  // Priority 4: Track expenses
  if (!hasExistingInvestments) {
    actions.push({
      priority: 4,
      action: "Track all expenses for 30 days",
      impact: "Identifies money leaks to redirect to investments",
      timeframe: "Start today"
    });
  }
  
  return actions.slice(0, 4);
}

function classifyDecisionFeasibility(
  goal: GoalSpec,
  profile: UserFinancialProfile,
  feasibility: FeasibilityAnalysis,
  constraints: PlanConstraints,
): "comfortable" | "tight" | "stretched" | "not_viable" {
  if (constraints.feasibilityVerdict === "not_viable" || constraints.feasibilityVerdict === "extreme_mismatch") {
    return "not_viable";
  }

  const incomeBounds = resolveIncomeBounds(profile);
  const worstCaseUtilization = incomeBounds.lowIncome > 0 ? (feasibility.currentSip / incomeBounds.lowIncome) * 100 : 0;
  const utilizationGapPct = feasibility.requiredSip > 0
    ? ((feasibility.requiredSip - feasibility.currentSip) / feasibility.requiredSip) * 100
    : 0;
  const timeYears = goal.timeHorizonMonths / 12;

  if (feasibility.currentSip >= feasibility.requiredSip) {
    if (worstCaseUtilization <= 45 && timeYears >= 5) {
      return "comfortable";
    }

    if (worstCaseUtilization <= 65 && timeYears >= 3) {
      return "tight";
    }

    return "stretched";
  }

  if (utilizationGapPct <= 12 && worstCaseUtilization <= 60 && timeYears >= 5) {
    return "tight";
  }

  if (utilizationGapPct <= 35 && worstCaseUtilization <= 80 && timeYears >= 3) {
    return "stretched";
  }

  return "not_viable";
}

function buildDecisionHierarchy(
  goal: GoalSpec,
  profile: UserFinancialProfile,
  feasibility: FeasibilityAnalysis,
  decisionLabel: "comfortable" | "tight" | "stretched" | "not_viable",
): {
  primaryAction: string;
  secondaryAction?: string;
  optionalAction?: string;
  reasoning: string;
  primaryActionType: PrimaryActionType;
} {
  const incomeBounds = resolveIncomeBounds(profile);
  const lowUtilization = incomeBounds.highIncome > 0 ? round((feasibility.currentSip / incomeBounds.highIncome) * 100, 1) : 0;
  const highUtilization = incomeBounds.lowIncome > 0 ? round((feasibility.currentSip / incomeBounds.lowIncome) * 100, 1) : 0;
  const gapPct = feasibility.requiredSip > 0
    ? round(((feasibility.requiredSip - feasibility.currentSip) / feasibility.requiredSip) * 100, 1)
    : 0;
  const timeYears = round(goal.timeHorizonMonths / 12, 1);
  const requirementLabel = `Required SIP ${feasibility.requiredSip.toLocaleString()} vs current SIP ${feasibility.currentSip.toLocaleString()}`;
  const rangeLabel = incomeBounds.hasRange
    ? `income utilization ranges from ${lowUtilization.toFixed(1)}% to ${highUtilization.toFixed(1)}%`
    : `income utilization is ${highUtilization.toFixed(1)}%`;

  if (decisionLabel === "comfortable") {
    return {
      primaryAction: "Keep the SIP steady and preserve the buffer.",
      secondaryAction: "Use small yearly step-ups if income grows.",
      optionalAction: "Rebalance once a year to keep the allocation aligned.",
      reasoning: `${requirementLabel}; ${rangeLabel}; the timeline is long enough that the current plan already clears the goal with room to spare.`,
      primaryActionType: "optimize",
    };
  }

  if (decisionLabel === "tight") {
    return {
      primaryAction: feasibility.currentSip >= feasibility.requiredSip
        ? "Keep the SIP steady and protect the narrow buffer."
        : "Raise the SIP modestly to close the remaining gap.",
      secondaryAction: "Trim avoidable expenses or add small income bumps to widen the buffer.",
      optionalAction: "Add a 5-8% annual step-up to stay ahead of inflation.",
      reasoning: `${requirementLabel}; ${rangeLabel}; the plan is close, but the margin is narrow enough that discipline matters more than chasing extra risk.`,
      primaryActionType: feasibility.currentSip >= feasibility.requiredSip ? "optimize" : "increase_sip",
    };
  }

  if (decisionLabel === "stretched") {
    const primaryIsTimeline = gapPct > 30 || timeYears < 5;
    return {
      primaryAction: primaryIsTimeline
        ? `Extend the timeline by 3-5 years to absorb the gap more efficiently.`
        : `Increase the SIP toward the required level to reduce the gap faster.`,
      secondaryAction: primaryIsTimeline
        ? `Add modest SIP step-ups if income rises.`
        : `Extend the timeline if you want to avoid over-stretching monthly cash flow.`,
      optionalAction: "Keep automated contributions and revisit allocation annually.",
      reasoning: `${requirementLabel}; ${rangeLabel}; the plan is workable, but it needs one bigger lever to become comfortable rather than merely surviving.`,
      primaryActionType: primaryIsTimeline ? "extend_timeline" : "increase_sip",
    };
  }

  return {
    primaryAction: "Lower the goal or raise income before committing to this path.",
    secondaryAction: "If needed, extend the timeline as far as practical and re-run the plan.",
    optionalAction: "Use a smaller intermediate target to keep momentum alive.",
    reasoning: `${requirementLabel}; ${rangeLabel}; even the worst-case version of the income range cannot support the plan on the current timeline.`,
    primaryActionType: "reduce_goal",
  };
}

// Build decision object - single source of truth for UI
function buildDecision(
  goal: GoalSpec,
  profile: UserFinancialProfile,
  feasibility: FeasibilityAnalysis,
  actualOutcome: { withCurrentSip: number; percentageOfGoal: number },
  goalIntent: GoalIntent,
  constraints: PlanConstraints,
): PlanDecision {
  const incomeBounds = resolveIncomeBounds(profile);
  const worstCaseUtilization = incomeBounds.lowIncome > 0 ? (feasibility.currentSip / incomeBounds.lowIncome) * 100 : 0;
  const bestCaseUtilization = incomeBounds.highIncome > 0 ? (feasibility.currentSip / incomeBounds.highIncome) * 100 : 0;
  const decisionLabel = goalIntent.isCorpusGoal
    ? classifyDecisionFeasibility(goal, profile, feasibility, constraints)
    : "comfortable";
  const hierarchy = goalIntent.isCorpusGoal
    ? buildDecisionHierarchy(goal, profile, feasibility, decisionLabel)
    : {
        primaryAction:
          goalIntent.kind === "insurance_planning"
            ? `Lock in term cover ≈ ₹${Math.round((goalIntent.termCoverTarget ?? 0) / 1_00_000)}L and health cover before chasing returns.`
            : `Use ₹${Math.round((goalIntent.taxSavingTarget ?? 150_000) / 1_000)}K/year toward 80C — split across ELSS, EPF, and similar.`,
        secondaryAction: goalIntent.kind === "insurance_planning"
          ? "Review beneficiaries and claim process with the policy purchase."
          : "Keep tax-saving contributions organized across the year.",
        optionalAction: "Revisit the plan if income or family coverage changes.",
        reasoning: "Non-corpus goals are handled as coverage or tax-planning decisions rather than SIP feasibility decisions.",
        primaryActionType: "noop" as const,
      };

  const currentIncome = profile.income > 0 ? profile.income : incomeBounds.highIncome;
  const utilization = currentIncome > 0 ? feasibility.currentSip / currentIncome : 0;
  const worstCaseUtilizationRatio = incomeBounds.lowIncome > 0 ? feasibility.currentSip / incomeBounds.lowIncome : utilization;

  let sustainability: "safe" | "aggressive" | "risky" | "unsustainable" = "safe";
  if (worstCaseUtilizationRatio > 1) sustainability = "unsustainable";
  else if (worstCaseUtilizationRatio > 0.7) sustainability = "risky";
  else if (worstCaseUtilizationRatio > 0.5) sustainability = "aggressive";

  const pctOfGoal = actualOutcome.percentageOfGoal;
  const safetyMargin = goal.targetAmount > 0
    ? actualOutcome.withCurrentSip / goal.targetAmount
    : 0;
  const safetyTier: "safe" | "tight" | "risky" =
    safetyMargin >= 1.05 ? "safe"
    : safetyMargin >= 0.95 ? "tight"
    : "risky";

  const headerTone: "strongly_on_track" | "slightly_short" | "needs_improvement" | "far_off" =
    pctOfGoal >= 105 ? "strongly_on_track"
    : pctOfGoal >= 95 ? "slightly_short"
    : pctOfGoal >= 80 ? "needs_improvement"
    : "far_off";

  let riskNote: string | undefined;
  if (decisionLabel === "tight") {
    riskNote = "The margin is narrow. Small market swings or income changes can move this plan off track.";
  } else if (decisionLabel === "stretched") {
    riskNote = "This plan depends on either a longer timeline or a stronger monthly commitment to stay healthy.";
  } else if (decisionLabel === "not_viable") {
    riskNote = "The current setup cannot support this goal without a major change in timeline, target, or income.";
  }

  const sipBufferPercent = feasibility.requiredSip > 0
    ? round(((feasibility.currentSip - feasibility.requiredSip) / feasibility.requiredSip) * 100, 1)
    : 0;
  const sipBufferLabel = sipBufferPercent >= 0
    ? `${sipBufferPercent.toFixed(1)}% above required SIP (comfortable buffer)`
    : `${Math.abs(sipBufferPercent).toFixed(1)}% below required SIP (shortfall)`;
  const stepUpMode: PlanDecision["stepUpMode"] = feasibility.currentSip >= feasibility.requiredSip ? "optional" : "recommended";
  const rangeReason = incomeBounds.hasRange
    ? `Low-income utilization is ${(worstCaseUtilizationRatio * 100).toFixed(1)}% and high-income utilization is ${(bestCaseUtilization * 100).toFixed(1)}%.`
    : `Utilization is ${(utilization * 100).toFixed(1)}%.`;

  return {
    feasibility: decisionLabel,
    percentageOfGoal: pctOfGoal,
    gapPercentage: feasibility.gapPercentage,
    sustainability,
    incomeUtilization: worstCaseUtilizationRatio,
    gapAmount: Math.max(0, goal.targetAmount - actualOutcome.withCurrentSip),
    likelyCorpus: actualOutcome.withCurrentSip,
    goalAmount: goal.targetAmount,
    timeYears: Math.round(goal.timeHorizonMonths / 12),
    primaryAction: hierarchy.primaryAction,
    secondaryAction: hierarchy.secondaryAction,
    optionalAction: hierarchy.optionalAction,
    reasoning: `${hierarchy.reasoning} ${rangeReason}`.trim(),
    primaryActionType: hierarchy.primaryActionType,
    sipBufferPercent,
    sipBufferLabel,
    stepUpMode,
    safetyMargin,
    safetyTier,
    headerTone,
    riskNote,
  };
}

// NEW: Generate decision line with investment split recommendation
function generateDecisionLine(
  feasibility: FeasibilityAnalysis,
  profile: UserFinancialProfile
): { text: string; allocation: { equity: number; debt: number; gold: number; liquid: number } } | null {
  // Only show for high-gap scenarios (user needs clear guidance)
  if (feasibility.gapPercentage < 30) return null;
  
  const monthlySip = feasibility.currentSip;
  
  // Risk-based allocation (use riskProfile only)
  let allocation = { equity: 60, debt: 25, gold: 10, liquid: 5 }; // default balanced
  
  if (profile.riskProfile === "aggressive") {
    allocation = { equity: 70, debt: 20, gold: 5, liquid: 5 };
  } else if (profile.riskProfile === "conservative") {
    allocation = { equity: 45, debt: 35, gold: 10, liquid: 10 };
  }
  
  const formatAmount = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
  
  const equityAmount = monthlySip * allocation.equity / 100;
  const debtAmount = monthlySip * allocation.debt / 100;
  const goldAmount = monthlySip * allocation.gold / 100;
  const liquidAmount = monthlySip * allocation.liquid / 100;
  
  return {
    text: `Invest ${formatAmount(monthlySip)}/month using this split: ${allocation.equity}% equity (${formatAmount(equityAmount)}), ${allocation.debt}% debt (${formatAmount(debtAmount)}), ${allocation.gold}% gold (${formatAmount(goldAmount)}), ${allocation.liquid}% liquid (${formatAmount(liquidAmount)}).`,
    allocation
  };
}

// Validate decision output for consistency
function validateDecision(decision: PlanDecision): string[] {
  const flags: string[] = [];
  
  if (decision.incomeUtilization > 1.2) {
    flags.push("warning: utilization > 120% - over-investing detected");
  }
  if (decision.gapAmount < 0) {
    flags.push("error: negative gap amount");
  }
  if (decision.likelyCorpus > decision.goalAmount * 5) {
    flags.push("warning: corpus > 5x goal - check calculations");
  }
  if (decision.percentageOfGoal > 100 && decision.feasibility === "not_viable") {
    flags.push("inconsistency: percentage > 100 but still not_viable");
  }
  if (decision.headerTone === "strongly_on_track" && (decision.safetyMargin ?? 0) < 1.05) {
    flags.push("inconsistency: header strongly_on_track but safetyMargin < 1.05");
  }
  if (
    decision.feasibility === "comfortable" &&
    typeof decision.primaryAction === "string" &&
    /extend (your )?timeline|extend timeline by/i.test(decision.primaryAction)
  ) {
    flags.push("inconsistency: primaryAction suggests extending timeline while feasibility=comfortable");
  }

  return flags;
}
