/**
 * INPUT SANITIZER
 *
 * Pure deterministic layer that extracts ONLY required, clean numeric fields
 * from the raw database profile snapshot before passing to the financial engine.
 *
 * Purpose:
 *  1. Remove band fields (band selections, not numeric values)
 *  2. Remove metadata (user name, email, phone, timestamps)
 *  3. Remove notes and legacy fields
 *  4. Extract ONLY: numeric income, expenses, SIP, savings, horizon, risk, age
 *  5. Type-safe: ensures all fields are properly typed
 *  6. Immutable: optionally freeze to prevent accidental mutations
 *
 * Flow: Raw DB Profile → Sanitized Input → Reality Normalizer → Financial Engine
 */

import type { AgentProfileSnapshot } from "./types";

/**
 * Sanitized profile input — ONLY fields needed for financial calculations.
 * NO bands, NO metadata, NO notes, NO timestamps.
 */
export type SanitizedProfileInput = {
  // Numeric income fields
  monthlyIncomeInr: number | null;
  incomeInputType: "exact" | "range" | null;
  incomeRangeMinInr: number | null;
  incomeRangeMaxInr: number | null;

  // Numeric expense fields
  monthlyExpensesInr: number | null;
  monthlyEmiInr: number | null;

  // Numeric investment fields
  monthlyInvestableSurplusInr: number | null;
  currentSavingsInr: number | null;
  emergencyFundMonths: number | null;

  // Time horizon
  targetHorizonYears: number | null;

  // Goal target
  targetAmountInr: number | null;

  // Risk profile
  riskAppetite: string | null;

  // Personal
  dateOfBirth: string | null;
  employmentType: string | null;
  taxRegime: string | null;

  // Goal classification
  primaryFinancialGoal: string | null;

  // Holdings & investments
  hasExistingInvestments: boolean | null;
  existingInvestmentTypes: string[] | null;
};

/**
 * Sanitization report for debugging — what was kept, what was removed.
 */
export type SanitizationReport = {
  keptFields: string[];
  removedFields: {
    bands: string[];
    metadata: string[];
    notes: string[];
    timestamps: string[];
    other: string[];
  };
};

/**
 * SANITIZE: Extract clean numeric input from raw profile snapshot.
 *
 * @param profile Raw database profile snapshot
 * @param debug Whether to log sanitization report
 * @returns Sanitized profile input with ONLY required fields
 */
export function sanitizeProfileInput(
  profile: AgentProfileSnapshot | null,
  debug = false
): SanitizedProfileInput | null {
  if (!profile) {
    if (debug) console.log("[SANITIZED INPUT] Profile is null, returning null");
    return null;
  }

  // ============================================================
  // KEEP: Numeric fields required for engine
  // ============================================================
  const keptFields: string[] = [];
  const removedFields = {
    bands: [] as string[],
    metadata: [] as string[],
    notes: [] as string[],
    timestamps: [] as string[],
    other: [] as string[],
  };

  // Extract clean input
  const sanitized: SanitizedProfileInput = {
    // Income fields
    monthlyIncomeInr: profile.monthly_income_inr ?? null,
    incomeInputType: profile.income_input_type ?? null,
    incomeRangeMinInr: profile.income_range_min_inr ?? null,
    incomeRangeMaxInr: profile.income_range_max_inr ?? null,

    // Expense fields
    monthlyExpensesInr: profile.monthly_expenses_inr ?? null,
    monthlyEmiInr: profile.monthly_emi_inr ?? null,

    // Investment fields
    monthlyInvestableSurplusInr: profile.monthly_investable_surplus_inr ?? null,
    currentSavingsInr: profile.current_savings_inr ?? null,
    emergencyFundMonths: profile.emergency_fund_months ?? null,

    // Time horizon
    targetHorizonYears: profile.target_horizon_years ?? null,

    // Goal target
    targetAmountInr: profile.target_amount_inr ?? null,

    // Risk profile
    riskAppetite: profile.risk_appetite ?? null,

    // Personal
    dateOfBirth: profile.date_of_birth ?? null,
    employmentType: profile.employment_type ?? null,
    taxRegime: profile.tax_regime ?? null,

    // Goal classification
    primaryFinancialGoal: profile.primary_financial_goal ?? null,

    // Holdings & investments
    hasExistingInvestments: profile.has_existing_investments ?? null,
    existingInvestmentTypes: profile.existing_investment_types ?? null,
  };

  // Track kept fields
  for (const [key] of Object.entries(sanitized)) {
    keptFields.push(key);
  }

  // ============================================================
  // REMOVE: Band fields (NO band selections in engine input)
  // ============================================================
  const bandFields = [
    "target_goal_horizon_band",
    "monthly_investment_capacity_band",
    "monthly_income_band",
  ];
  for (const field of bandFields) {
    if (field in profile) {
      removedFields.bands.push(field);
    }
  }

  // ============================================================
  // REMOVE: Metadata (user identity, timestamps, consent)
  // ============================================================
  const metadataFields = [
    "id",
    "user_id",
    "full_name",
    "email",
    "phone_e164",
    "city",
    "state",
    "country_code",
    "tax_residency_country",
    "occupation_title",
    "kyc_status",
    "loss_tolerance_pct",
    "liquidity_needs_notes",
    "experienceLevel",
    "onboarding_completed_at",
  ];
  for (const field of metadataFields) {
    if (field in profile) {
      removedFields.metadata.push(field);
    }
  }

  // ============================================================
  // REMOVE: Notes fields (narrative/context, not numeric)
  // ============================================================
  const noteFields = ["liquidity_needs_notes", "notes"];
  for (const field of noteFields) {
    if (field in profile && !removedFields.metadata.includes(field)) {
      removedFields.notes.push(field);
    }
  }

  // ============================================================
  // REMOVE: Timestamps (db artifacts)
  // ============================================================
  const timestampFields = [
    "created_at",
    "updated_at",
    "onboarding_completed_at",
  ];
  for (const field of timestampFields) {
    if (field in profile && !removedFields.metadata.includes(field)) {
      removedFields.timestamps.push(field);
    }
  }

  // ============================================================
  // REMOVE: Legacy / duplicate field names (camelCase variants)
  // ============================================================
  const legacyFields = [
    "monthlyIncomeInr",  // camelCase version of monthly_income_inr
    "sipCapacityInr",    // camelCase version of monthly_investable_surplus_inr
    "timeHorizonYears",  // camelCase version of target_horizon_years
    "target_goal_amount_choice",  // UI field, not numeric
    "target_goal_custom_amount_inr",  // handled via target_amount_inr
  ];
  for (const field of legacyFields) {
    if (field in profile) {
      removedFields.other.push(field);
    }
  }

  // ============================================================
  // OPTIONAL: Freeze for immutability (prevents accidental mutations)
  // ============================================================
  Object.freeze(sanitized);

  // ============================================================
  // DEBUG LOG
  // ============================================================
  if (debug) {
    console.log("[SANITIZED INPUT] Profile sanitization complete", {
      kept: {
        count: keptFields.length,
        fields: keptFields,
        values: {
          monthlyIncomeInr: sanitized.monthlyIncomeInr,
          monthlyInvestableSurplusInr: sanitized.monthlyInvestableSurplusInr,
          targetHorizonYears: sanitized.targetHorizonYears,
          targetAmountInr: sanitized.targetAmountInr,
          riskAppetite: sanitized.riskAppetite,
        },
      },
      removed: {
        bands: removedFields.bands,
        metadata: removedFields.metadata,
        notes: removedFields.notes,
        timestamps: removedFields.timestamps,
        legacy: removedFields.other,
        totalRemoved:
          removedFields.bands.length +
          removedFields.metadata.length +
          removedFields.notes.length +
          removedFields.timestamps.length +
          removedFields.other.length,
      },
    });
  }

  return sanitized;
}

/**
 * VALIDATE: Check that NO band values leaked into the sanitized input.
 * Defensive check — should always pass if sanitization works correctly.
 *
 * @param sanitized Sanitized profile input
 * @returns True if clean, false if bands detected
 */
export function validateNoLeak(sanitized: SanitizedProfileInput | null): boolean {
  if (!sanitized) return true;

  // Bands would appear in risk profile or goal classification if leaked
  // (band values are strings like "50000_plus", "custom", etc.)
  const riskHasBand =
    sanitized.riskAppetite &&
    typeof sanitized.riskAppetite === "string" &&
    (sanitized.riskAppetite.includes("_") ||
      sanitized.riskAppetite === "custom");

  const goalHasBand =
    sanitized.primaryFinancialGoal &&
    typeof sanitized.primaryFinancialGoal === "string" &&
    (sanitized.primaryFinancialGoal.includes("_band") ||
      sanitized.primaryFinancialGoal === "custom");

  // Time horizon should be a number, not a band string (defensive check)
  const horizonIsBand =
    sanitized.targetHorizonYears !== null &&
    typeof sanitized.targetHorizonYears === "string" &&
    ((sanitized.targetHorizonYears as string).includes("year") ||
      sanitized.targetHorizonYears === "custom");

  if (riskHasBand || goalHasBand || horizonIsBand) {
    console.warn("[SANITIZED INPUT] ⚠️ Band leakage detected!", {
      riskHasBand,
      goalHasBand,
      horizonIsBand,
      riskAppetite: sanitized.riskAppetite,
      primaryGoal: sanitized.primaryFinancialGoal,
      horizon: sanitized.targetHorizonYears,
    });
    return false;
  }

  return true;
}

/**
 * DEBUG: Generate sanitization report showing what was kept/removed.
 */
export function generateSanitizationReport(
  profile: AgentProfileSnapshot | null
): SanitizationReport {
  if (!profile) {
    return {
      keptFields: [],
      removedFields: {
        bands: [],
        metadata: [],
        notes: [],
        timestamps: [],
        other: [],
      },
    };
  }

  const sanitized = sanitizeProfileInput(profile, false);
  if (!sanitized) {
    return {
      keptFields: [],
      removedFields: {
        bands: [],
        metadata: [],
        notes: [],
        timestamps: [],
        other: [],
      },
    };
  }

  const keptFields = Object.keys(sanitized).filter(
    (key) => (sanitized as any)[key] !== null && (sanitized as any)[key] !== undefined
  );

  const bandFields = [
    "target_goal_horizon_band",
    "monthly_investment_capacity_band",
    "monthly_income_band",
  ];
  const metadataFields = [
    "id", "user_id", "full_name", "email", "phone_e164",
    "city", "state", "country_code", "tax_residency_country",
    "occupation_title", "kyc_status", "loss_tolerance_pct",
    "onboarding_completed_at",
  ];
  const noteFields = ["liquidity_needs_notes", "notes"];
  const timestampFields = ["created_at", "updated_at"];

  const removedFields = {
    bands: bandFields.filter((f) => f in profile),
    metadata: metadataFields.filter((f) => f in profile),
    notes: noteFields.filter((f) => f in profile),
    timestamps: timestampFields.filter((f) => f in profile),
    other: [] as string[],
  };

  return {
    keptFields,
    removedFields,
  };
}
