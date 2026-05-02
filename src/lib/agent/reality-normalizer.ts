/**
 * REALITY NORMALIZER
 *
 * Pure deterministic layer between context loading and the financial engine.
 *
 * Responsibilities:
 *  1. Goal-type intent inference (e.g. passive_income → corpus = target × 25).
 *  2. Expense / EMI inference when onboarding doesn't capture them.
 *  3. SIP capacity sanity checks (max 40% of income safety cap).
 *  4. Hard feasibility constraints (no AI override).
 *  5. Confidence tag + tone directive for downstream UI / AI.
 *
 * No AI, no randomness — same input always produces the same output.
 */

import type {
  AgentContext,
  GoalIntent,
  GoalKind,
  NormalizedPlanInput,
  PlanConstraints,
  UserFinancialProfile,
} from "./types";
import { resolveTargetAmount } from "./band-resolver";

// ============================================================
// CONSTANTS
// ============================================================

/** Safe-withdrawal-rate proxy for converting annual passive income → required corpus. */
const PASSIVE_INCOME_CORPUS_MULTIPLIER = 25; // 4% rule

/** Target retirement age used to flag "horizon too short for age" warnings. */
const RETIREMENT_TARGET_AGE = 60;

/** SIP-vs-income hard caps (deterministic, AI cannot override). */
const SIP_INCOME_CAP_NOT_VIABLE = 0.7; // requiredSip > 70% income → not_viable
const SIP_INCOME_CAP_HIGH_RISK = 0.5;  // sip > 50% income → high_risk
const SIP_INCOME_CAP_AGGRESSIVE = 0.6; // sip > 60% income → aggressive

/** Step-up SIP final-year cap. Engine truncates projection where final SIP > 80% income. */
export const STEP_UP_INCOME_CAP_RATIO = 0.8;

/** Extreme mismatch threshold: short horizon AND large corpus target. */
const EXTREME_MISMATCH_HORIZON_YEARS = 5;
const EXTREME_MISMATCH_TARGET_INR = 1_00_00_000; // ₹1 Cr

// ============================================================
// HELPERS
// ============================================================

function calculateAge(dob: string | null): number | null {
  if (!dob) return null;
  const date = new Date(dob);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  if (
    now.getMonth() < date.getMonth() ||
    (now.getMonth() === date.getMonth() && now.getDate() < date.getDate())
  ) {
    age--;
  }
  return age;
}

function normalizeGoalKind(raw: string | null | undefined): GoalKind {
  switch (raw) {
    case "wealth_creation":
    case "retirement_planning":
    case "child_education":
    case "tax_saving":
    case "passive_income":
    case "insurance_planning":
      return raw;
    default:
      return "wealth_creation";
  }
}

function formatInr(value: number): string {
  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2)}Cr`;
  if (value >= 1_00_000) return `₹${(value / 1_00_000).toFixed(1)}L`;
  if (value >= 1000) return `₹${Math.round(value).toLocaleString("en-IN")}`;
  return `₹${Math.round(value)}`;
}

/**
 * Required SIP (level / no step-up) at a given annual return %.
 * Mirrors the engine's formula so hard constraints can fire pre-feasibility.
 */
function estimateRequiredSip(
  targetCorpus: number,
  months: number,
  annualReturnPct: number,
  currentSavings: number,
): number {
  if (targetCorpus <= 0 || months <= 0) return 0;
  const monthlyRate = annualReturnPct / 1200;
  const futureSavings =
    monthlyRate <= 0 ? currentSavings : currentSavings * Math.pow(1 + monthlyRate, months);
  const sipGrowthFactor =
    monthlyRate <= 0 ? months : (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate;
  if (sipGrowthFactor <= 0) return Math.ceil(targetCorpus / months);
  return Math.max(0, Math.ceil((targetCorpus - futureSavings) / sipGrowthFactor));
}

// ============================================================
// GOAL INTENT INFERENCE
// ============================================================

function buildGoalIntent(
  context: AgentContext,
  rawTargetAmount: number | null,
  age: number | null,
  horizonYears: number,
  income: number,
): GoalIntent {
  const kind = normalizeGoalKind(context.profile?.primary_financial_goal);

  const intent: GoalIntent = {
    kind,
    rawTargetAmount,
    derivedCorpus: rawTargetAmount,
    annualIncomeTarget: null,
    taxSavingTarget: null,
    termCoverTarget: null,
    healthCoverTarget: null,
    isCorpusGoal: true,
    note: null,
    warnings: [],
  };

  if (rawTargetAmount === null && kind !== "insurance_planning" && kind !== "tax_saving") {
    intent.note = "We need a target amount to plan accurately.";
    return intent;
  }

  switch (kind) {
    case "passive_income": {
      // Treat target as ANNUAL passive income → corpus via 4% rule.
      if (rawTargetAmount && rawTargetAmount > 0) {
        intent.annualIncomeTarget = rawTargetAmount;
        intent.derivedCorpus = rawTargetAmount * PASSIVE_INCOME_CORPUS_MULTIPLIER;
        intent.note = `Interpreted ${formatInr(rawTargetAmount)} as your desired annual passive income — that needs a corpus of ~${formatInr(intent.derivedCorpus)} (4% safe-withdrawal rule).`;
      }
      break;
    }

    case "retirement_planning": {
      // Corpus as-is. Flag if horizon + age don't reach retirement age.
      if (age !== null && age + horizonYears < RETIREMENT_TARGET_AGE - 5) {
        intent.warnings.push(
          `At age ${age} with a ${horizonYears}-year horizon, you'd be ${age + horizonYears} when this completes — earlier than typical retirement (~${RETIREMENT_TARGET_AGE}).`,
        );
      }
      if (age !== null && age + horizonYears > RETIREMENT_TARGET_AGE + 10) {
        intent.warnings.push(
          `Your retirement horizon may be longer than needed — consider whether you want to retire before ${age + horizonYears}.`,
        );
      }
      break;
    }

    case "child_education": {
      // Corpus as-is; engine will use a higher inflation rate.
      intent.note = "Education costs typically inflate at ~8% — your projection uses that rate.";
      break;
    }

    case "tax_saving": {
      // 80C window — ignore corpus target, derive annual investment cap.
      intent.isCorpusGoal = false;
      const cap = Math.min(150_000, Math.round((income > 0 ? income : 0) * 0.12));
      intent.taxSavingTarget = cap > 0 ? cap : 150_000;
      intent.derivedCorpus = null;
      intent.note = `Tax saving plans target the 80C limit — at your income, ~${formatInr(intent.taxSavingTarget)} per year is the practical cap.`;
      break;
    }

    case "insurance_planning": {
      // Not a corpus goal at all.
      intent.isCorpusGoal = false;
      intent.derivedCorpus = null;
      const annualIncome = income * 12;
      intent.termCoverTarget = annualIncome > 0 ? Math.round(annualIncome * 15) : 0;
      intent.healthCoverTarget = 1_000_000; // ₹10L baseline
      intent.note = `Insurance plans aren't built around a corpus. Aim for term cover ≈ 15× annual income (~${formatInr(intent.termCoverTarget)}) and health cover ≥ ${formatInr(intent.healthCoverTarget)}.`;
      break;
    }

    case "wealth_creation":
    default:
      // Corpus as-is, no special note.
      if (rawTargetAmount !== null && rawTargetAmount < 10000 && rawTargetAmount > 0) {
        intent.warnings.push(`Target amount ${formatInr(rawTargetAmount)} is unusually low for a corpus goal.`);
      }
      break;
  }

  return intent;
}

// ============================================================
// CORE NORMALIZER
// ============================================================

export function normalizePlanInput(context: AgentContext): NormalizedPlanInput {
  const profile = context.profile;

  // Resolve numerical inputs (band-resolver has already filled these in normalizeBands).
  const income = profile?.monthly_income_inr ?? 0;
  const declaredCapacity = profile?.monthly_investable_surplus_inr ?? 0;
  const declaredExpenses = profile?.monthly_expenses_inr ?? 0;
  const declaredEmi = profile?.monthly_emi_inr ?? 0;
  const currentSavings = profile?.current_savings_inr ?? 0;
  const horizonYears = profile?.target_horizon_years ?? 5;
  const horizonMonths = Math.max(1, Math.round(horizonYears * 12));
  const age = calculateAge(profile?.date_of_birth ?? null);
  const rawTarget = profile ? resolveTargetAmount(profile) : null;

  // Goal intent first (drives "isCorpusGoal" path for insurance/tax).
  const goalIntent = buildGoalIntent(context, rawTarget, age, horizonYears, income);

  // ---------- Expense inference ----------
  let expenses = declaredExpenses;
  let expensesInferred = false;
  if (declaredExpenses <= 0 && income > 0) {
    expenses = Math.max(0, income - declaredCapacity - declaredEmi);
    expensesInferred = true;
  }

  // ---------- Capacity limit metadata ----------
  const reasons: string[] = [];
  let investmentCapacity = declaredCapacity;
  const maxAllowedSip = income > 0 ? Math.round(income * SIP_INCOME_CAP_AGGRESSIVE) : null;
  const isOverLimit = maxAllowedSip !== null ? declaredCapacity > maxAllowedSip : false;
  const overLimitAmount = isOverLimit && maxAllowedSip !== null ? declaredCapacity - maxAllowedSip : null;
  const utilizationPercent = income > 0 ? Math.round((declaredCapacity / income) * 10000) / 100 : 0;
  if (isOverLimit && maxAllowedSip !== null) {
    reasons.push(
      `Declared SIP capacity (${formatInr(declaredCapacity)}) exceeds the 60% safety cap (${formatInr(maxAllowedSip)}) — preserving user input and flagging it for review.`,
    );
  }

  const userProfile: UserFinancialProfile = {
    income,
    expenses,
    emi: declaredEmi,
    investmentCapacity,
    currentSavings,
    emergencyFundMonths: profile?.emergency_fund_months ?? 6,
    riskProfile: (profile?.risk_appetite === "high" || profile?.risk_appetite === "aggressive") ? "aggressive"
               : (profile?.risk_appetite === "low" || profile?.risk_appetite === "conservative") ? "conservative"
               : "moderate",
    employmentType: profile?.employment_type ?? null,
    hasExistingInvestments: profile?.has_existing_investments ?? false,
    existingInvestmentTypes: profile?.existing_investment_types ?? [],
    age,
    taxRegime: profile?.tax_regime ?? null,
  };

  // ---------- Hard constraints (only meaningful for corpus goals) ----------
  let feasibilityVerdict: PlanConstraints["feasibilityVerdict"] = null;
  let highSipRisk = false;

  const corpusForRules = goalIntent.derivedCorpus ?? 0;
  if (goalIntent.isCorpusGoal && corpusForRules > 0 && horizonMonths > 0) {
    // Rough required SIP for rule firing (engine will recompute precisely later).
    const approxAnnualReturn = 11; // moderate blended baseline; engine refines per risk profile
    const requiredSip = estimateRequiredSip(
      corpusForRules,
      horizonMonths,
      approxAnnualReturn,
      currentSavings,
    );

    // Extreme mismatch: short horizon + large target.
    if (horizonYears < EXTREME_MISMATCH_HORIZON_YEARS && corpusForRules > EXTREME_MISMATCH_TARGET_INR) {
      feasibilityVerdict = "extreme_mismatch";
      reasons.push(
        `Target ${formatInr(corpusForRules)} in under ${EXTREME_MISMATCH_HORIZON_YEARS} years is structurally unrealistic without an inheritance / windfall.`,
      );
    }

    if (income > 0 && requiredSip > income * SIP_INCOME_CAP_NOT_VIABLE) {
      // Strongest verdict wins.
      feasibilityVerdict = "not_viable";
      reasons.push(
        `Required SIP (~${formatInr(requiredSip)}/mo) exceeds 70% of your income (${formatInr(income)}/mo) — not viable.`,
      );
    } else if (income > 0 && requiredSip > income * SIP_INCOME_CAP_HIGH_RISK) {
      if (feasibilityVerdict === null) feasibilityVerdict = "high_risk";
      highSipRisk = true;
      reasons.push(
        `Required SIP (~${formatInr(requiredSip)}/mo) is over 50% of your income — workable but high-risk.`,
      );
    }

    // Step-up SIP cap: project final-year SIP at 10% step-up.
    const finalYearSip = investmentCapacity * Math.pow(1.1, horizonYears);
    const stepUpCappedAtIncome = income > 0 && finalYearSip > income * STEP_UP_INCOME_CAP_RATIO;
    if (stepUpCappedAtIncome) {
      reasons.push(
        `Step-up SIP would exceed ${Math.round(STEP_UP_INCOME_CAP_RATIO * 100)}% of income before the goal year — projection will be capped.`,
      );
    }

    // ---------- Confidence + tone ----------
    const sipRatio = income > 0 ? investmentCapacity / income : 0;
    const confidenceTag: PlanConstraints["confidenceTag"] =
      sipRatio < 0.2 ? "safe"
      : sipRatio < 0.4 ? "balanced"
      : sipRatio <= 0.5 ? "aggressive"
      : "unsafe";

    let tone: PlanConstraints["tone"] = "confidence";
    if (feasibilityVerdict === "not_viable" || feasibilityVerdict === "extreme_mismatch") {
      tone = "direct_corrective";
    } else if (feasibilityVerdict === "high_risk") {
      tone = "cautious_optimism";
    } else if (
      requiredSip > 0 &&
      investmentCapacity > 0 &&
      requiredSip > investmentCapacity * 1.15
    ) {
      tone = "cautious_optimism";
    } else if (
      requiredSip > 0 &&
      investmentCapacity > 0 &&
      investmentCapacity >= requiredSip
    ) {
      tone = "confidence";
    }

    return {
      profile: userProfile,
      goalIntent,
      timeHorizonMonths: horizonMonths,
      constraints: {
        feasibilityVerdict,
        flags: {
          maxAllowedSip,
          isOverLimit,
          overLimitAmount,
          utilizationPercent,
          highSipRisk,
          stepUpCappedAtIncome,
          expensesInferred,
        },
        confidenceTag,
        tone,
        reasons,
      },
      requiresInput: false,
    };
  }

  // Non-corpus goal (insurance / tax_saving) or missing inputs.
  const sipRatio = income > 0 ? investmentCapacity / income : 0;
  const confidenceTag: PlanConstraints["confidenceTag"] =
    sipRatio < 0.2 ? "safe" : sipRatio < 0.4 ? "balanced" : sipRatio <= 0.5 ? "aggressive" : "unsafe";

  return {
    profile: userProfile,
    goalIntent,
    timeHorizonMonths: horizonMonths,
    constraints: {
      feasibilityVerdict: null,
      flags: {
        maxAllowedSip,
        isOverLimit,
        overLimitAmount,
        utilizationPercent,
        highSipRisk: false,
        stepUpCappedAtIncome: false,
        expensesInferred,
      },
      confidenceTag,
      tone: "confidence",
      reasons,
    },
    requiresInput: !goalIntent.isCorpusGoal ? false : (goalIntent.derivedCorpus ?? 0) <= 0 || income <= 0,
  };
}
