/**
 * BAND RESOLVER
 * Converts onboarding band strings to actual numeric values
 * This ensures Financial Engine gets real numbers, not categories
 */

import type { AgentContext, AgentProfileSnapshot } from "./types";

// ============================================================
// BAND TO NUMBER MAPPINGS
// ============================================================

// Onboarding values (questionnaire-flow.ts) take precedence; legacy keys kept as aliases.
const MONTHLY_CAPACITY_BAND_MAP: Record<string, number> = {
  // Current onboarding emissions
  "5000_10000": 7500,
  "10000_25000": 17500,
  "25000_50000": 37500,
  "50000_plus": 65000, // 50k-100k midpoint, conservative
  // Legacy aliases
  "under_5000": 2500,
  "5000_to_10000": 7500,
  "10000_to_20000": 15000,
  "20000_to_30000": 25000,
  "30000_to_50000": 40000,
};

const INCOME_BAND_MAP: Record<string, number> = {
  // Current onboarding emissions
  "below_25000": 20000,
  "25000_50000": 37500,
  "50000_100000": 75000,
  "100000_300000": 200000,
  "300000_plus": 400000,
  // Legacy aliases
  "under_30000": 15000,
  "30000_to_50000": 40000,
  "50000_to_75000": 62500,
  "75000_to_100000": 87500,
  "100000_to_150000": 125000,
  "150000_to_200000": 175000,
  "200000_to_300000": 250000,
};

const HORIZON_BAND_MAP: Record<string, number> = {
  // Current onboarding emissions (years)
  "1_3_years": 2,
  "3_5_years": 4,
  "5_10_years": 7.5,
  "10_plus_years": 15,
  // Legacy aliases
  "short_term": 2,
  "medium_term": 5,
  "long_term": 10,
  "very_long_term": 15,
};

// Target-amount choice tokens emitted by onboarding `target_goal_amount_choice`.
const TARGET_AMOUNT_CHOICE_MAP: Record<string, number> = {
  "10_lakh": 1_000_000,
  "25_lakh": 2_500_000,
  "50_lakh": 5_000_000,
  "1_crore": 10_000_000,
  "5_crore": 50_000_000,
};

// ============================================================
// RESOLVER FUNCTIONS
// ============================================================

export function resolveMonthlyCapacityBand(band: string | null | undefined): number | null {
  if (!band) return null;
  const value = MONTHLY_CAPACITY_BAND_MAP[band];
  return value || null;
}

export function resolveIncomeBand(band: string | null | undefined): number | null {
  if (!band) return null;
  const value = INCOME_BAND_MAP[band];
  return value || null;
}

export function resolveHorizonBand(band: string | null | undefined): number {
  if (!band) return 5; // default medium term
  return HORIZON_BAND_MAP[band] || 5;
}

/**
 * Resolve the user's target corpus from either a numeric column or a choice token
 * like "10_lakh" / "1_crore" emitted by onboarding.
 *
 * SANITY RULES:
 * 1. If choice is predefined (not "custom"), use it and IGNORE custom values.
 * 2. If choice is "custom", use the custom numeric value.
 * 3. Floor all targets at ₹10,000 to prevent engine crashes on unrealistic inputs.
 */
export function resolveTargetAmount(profile: AgentProfileSnapshot): number | null {
  const choice = profile.target_goal_amount_choice;
  const customAmount = profile.target_goal_custom_amount_inr;

  let resolved: number | null = null;

  // Rule 1 & 2: Predefined choice vs Custom
  if (choice && choice !== "custom") {
    resolved = TARGET_AMOUNT_CHOICE_MAP[choice] || null;
  } else if (customAmount && typeof customAmount === "number" && customAmount > 0) {
    resolved = customAmount;
  }

  // Fallback: If above logic failed, try the legacy target_amount_inr column
  if (resolved === null) {
    const direct: unknown = profile.target_amount_inr;
    if (typeof direct === "number" && Number.isFinite(direct) && direct > 0) {
      resolved = direct;
    } else if (typeof direct === "string") {
      const fromMap = TARGET_AMOUNT_CHOICE_MAP[direct];
      if (fromMap) resolved = fromMap;
      const parsed = Number(direct);
      if (Number.isFinite(parsed) && parsed > 0) resolved = parsed;
    }
  }

  return resolved;
}

// ============================================================
// CONTEXT NORMALIZER
// ============================================================

/**
 * Normalize band values in profile to actual numbers
 * Priority: direct numeric value > band resolution > null
 */
function normalizeProfile(profile: AgentProfileSnapshot): AgentProfileSnapshot {
  // Resolve monthly investable surplus
  let monthlyInvestableSurplus = profile.monthly_investable_surplus_inr;
  if (monthlyInvestableSurplus === null || monthlyInvestableSurplus === undefined) {
    monthlyInvestableSurplus = resolveMonthlyCapacityBand(profile.monthly_investment_capacity_band);
  }

  // Resolve monthly income
  let monthlyIncome = profile.monthly_income_inr;
  if (monthlyIncome === null || monthlyIncome === undefined) {
    monthlyIncome = resolveIncomeBand(profile.monthly_income_band);
  }

  // Resolve target horizon
  let targetHorizon = profile.target_horizon_years;
  if (targetHorizon === null || targetHorizon === undefined) {
    targetHorizon = resolveHorizonBand(profile.target_goal_horizon_band);
  }

  // Resolve target amount (handle choice tokens stored in numeric column)
  const targetAmount = resolveTargetAmount(profile);

  // Safe defaults for income input type and range (null-safe fallbacks)
  let incomeInputType = profile.income_input_type;
  if (!incomeInputType || (incomeInputType !== "exact" && incomeInputType !== "range")) {
    incomeInputType = "exact"; // Default to exact income if not set or invalid
  }

  const normalized = {
    ...profile,
    monthly_investable_surplus_inr: monthlyInvestableSurplus,
    monthly_income_inr: monthlyIncome,
    target_horizon_years: targetHorizon,
    target_amount_inr: targetAmount,
    income_input_type: incomeInputType,
    income_range_min_inr: profile.income_range_min_inr ?? null,
    income_range_max_inr: profile.income_range_max_inr ?? null,
  };

  return normalized;
}

/**
 * Normalize bands in entire AgentContext
 * Call this immediately after loading context from Supabase
 */
export function normalizeBands(context: AgentContext, debug = false): AgentContext {
  const normalized = {
    ...context,
    profile: context.profile ? normalizeProfile(context.profile) : null,
  };

  if (debug) {
    console.log("NORMALIZED INPUT", normalized, {
      sip: normalized.profile?.monthly_investable_surplus_inr ?? null,
      income: normalized.profile?.monthly_income_inr ?? null,
      horizon: normalized.profile?.target_horizon_years ?? null,
      target: normalized.profile ? resolveTargetAmount(normalized.profile) : null,
      incomeInputType: normalized.profile?.income_input_type ?? "N/A",
      incomeRange: {
        min: normalized.profile?.income_range_min_inr ?? null,
        max: normalized.profile?.income_range_max_inr ?? null,
      },
    });
  }

  return normalized;
}
