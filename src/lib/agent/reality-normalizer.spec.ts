import { describe, it, expect } from "vitest";
import { normalizeBands } from "./band-resolver";
import { normalizePlanInput } from "./reality-normalizer";
import type { AgentContext } from "./types";

describe("RealityNormalizer", () => {
  const createMockContext = (overrides: Partial<AgentContext["profile"]> = {}): AgentContext => ({
    profile: {
      full_name: "Test User",
      email: "test@example.com",
      phone_e164: null,
      date_of_birth: null,
      city: null,
      state: null,
      country_code: null,
      tax_residency_country: null,
      occupation_title: null,
      employment_type: null,
      monthly_income_inr: 100000,
      monthly_expenses_inr: 0,
      monthly_emi_inr: 0,
      monthly_investable_surplus_inr: 25000,
      current_savings_inr: 0,
      emergency_fund_months: 6,
      loss_tolerance_pct: null,
      liquidity_needs_notes: null,
      risk_appetite: "moderate",
      target_horizon_years: 10,
      target_amount_inr: 50000000,
      tax_regime: null,
      kyc_status: null,
      onboarding_completed_at: null,
      primary_financial_goal: "wealth_creation",
      target_goal_horizon_band: null,
      monthly_investment_capacity_band: null,
      monthly_income_band: null,
      has_existing_investments: false,
      existing_investment_types: [],
      ...overrides,
    },
    latestRiskAssessment: null,
    goals: [],
    communicationPreferences: null,
    holdings: [],
  });

  describe("goal intent inference", () => {
    it("infers wealth_creation as corpus goal", () => {
      const context = createMockContext({
        primary_financial_goal: "wealth_creation",
        target_amount_inr: 50000000,
      });
      const result = normalizePlanInput(normalizeBands(context));
      expect(result.goalIntent.kind).toBe("wealth_creation");
      expect(result.goalIntent.isCorpusGoal).toBe(true);
    });

    it("infers passive_income with derived corpus", () => {
      const context = createMockContext({
        primary_financial_goal: "passive_income",
        target_amount_inr: 2000000,
      });
      const result = normalizePlanInput(normalizeBands(context));
      expect(result.goalIntent.kind).toBe("passive_income");
      expect(result.goalIntent.isCorpusGoal).toBe(true);
      expect(result.goalIntent.annualIncomeTarget).toBeGreaterThanOrEqual(2000000);
      expect(result.goalIntent.derivedCorpus).toBeGreaterThan(0);
      expect(result.goalIntent.note).toContain("annual passive income");
    });

    it("infers tax_saving as non-corpus goal with capped target", () => {
      const context = createMockContext({
        primary_financial_goal: "tax_saving",
        monthly_income_inr: 100000,
      });
      const result = normalizePlanInput(normalizeBands(context));
      expect(result.goalIntent.kind).toBe("tax_saving");
      expect(result.goalIntent.isCorpusGoal).toBe(false);
      expect(result.goalIntent.taxSavingTarget).toBe(12000); // 12% of income
      expect(result.goalIntent.note).toContain("80C");
    });

    it("infers insurance_planning with cover targets", () => {
      const context = createMockContext({
        primary_financial_goal: "insurance_planning",
        monthly_income_inr: 100000,
      });
      const result = normalizePlanInput(normalizeBands(context));
      expect(result.goalIntent.kind).toBe("insurance_planning");
      expect(result.goalIntent.isCorpusGoal).toBe(false);
      expect(result.goalIntent.termCoverTarget).toBe(18000000); // 15x annual income
      expect(result.goalIntent.healthCoverTarget).toBe(1000000);
      expect(result.goalIntent.note).toContain("term cover");
    });
  });

  describe("expense inference", () => {
    it("infers expenses when not provided", () => {
      const context = createMockContext({
        monthly_expenses_inr: 0,
        monthly_income_inr: 100000,
        monthly_investable_surplus_inr: 25000,
      });
      const result = normalizePlanInput(normalizeBands(context));
      // Expenses = income - capacity = 100000 - 25000 = 75000
      expect(result.profile.expenses).toBe(75000);
      expect(result.constraints.flags.expensesInferred).toBe(true);
    });

    it("uses provided expenses when available", () => {
      const context = createMockContext({
        monthly_expenses_inr: 60000,
        monthly_income_inr: 100000,
        monthly_investable_surplus_inr: 25000,
      });
      const result = normalizePlanInput(normalizeBands(context));
      expect(result.profile.expenses).toBe(60000);
      expect(result.constraints.flags.expensesInferred).toBe(false);
    });
  });

  describe("SIP capacity limit metadata", () => {
    it("preserves capacity and flags when above the 60% safety cap", () => {
      const context = createMockContext({
        monthly_income_inr: 100000,
        monthly_investable_surplus_inr: 70000, // 70% of income
      });
      const result = normalizePlanInput(normalizeBands(context));
      expect(result.profile.investmentCapacity).toBe(70000);
      expect(result.constraints.flags.maxAllowedSip).toBe(60000);
      expect(result.constraints.flags.isOverLimit).toBe(true);
      expect(result.constraints.flags.overLimitAmount).toBe(10000);
      expect(result.constraints.flags.utilizationPercent).toBe(70);
      expect(result.constraints.reasons.some((r) => r.includes("preserving user input"))).toBe(true);
    });

    it("preserves capacity and reports metadata when within the cap", () => {
      const context = createMockContext({
        monthly_income_inr: 100000,
        monthly_investable_surplus_inr: 30000, // 30% of income
      });
      const result = normalizePlanInput(normalizeBands(context));
      expect(result.profile.investmentCapacity).toBe(30000);
      expect(result.constraints.flags.maxAllowedSip).toBe(60000);
      expect(result.constraints.flags.isOverLimit).toBe(false);
      expect(result.constraints.flags.overLimitAmount).toBe(null);
      expect(result.constraints.flags.utilizationPercent).toBe(30);
    });
  });

  describe("hard feasibility constraints", () => {
    it("marks impossible when required SIP exceeds 70% income", () => {
      const context = createMockContext({
        monthly_income_inr: 30000,
        monthly_investable_surplus_inr: 20000,
        target_amount_inr: 100000000, // Very high target
        target_horizon_years: 5, // Short horizon
        risk_appetite: "aggressive",
      });
      const result = normalizePlanInput(context);
      expect(result.constraints.feasibilityVerdict).toBe("not_viable");
      expect(result.constraints.reasons.some(r => r.includes("70%"))).toBe(true);
    });

    it("marks extreme_mismatch when corpus > 1Cr with short horizon", () => {
      const context = createMockContext({
        monthly_income_inr: 10000000, // Extremely high income to avoid impossible check
        monthly_investable_surplus_inr: 4000000,
        target_amount_inr: 100000000,
        target_horizon_years: 3, // 3 years
        risk_appetite: "aggressive",
      });
      const result = normalizePlanInput(context);
      expect(result.constraints.feasibilityVerdict).toBe("extreme_mismatch");
      expect(result.constraints.reasons.some(r => r.includes("structurally unrealistic"))).toBe(true);
    });

    it("marks high_risk for aggressive plans", () => {
      const context = createMockContext({
        monthly_income_inr: 400000, // Income that avoids impossible but triggers high_risk
        monthly_investable_surplus_inr: 250000, // 62.5% of income
        target_amount_inr: 100000000, // Target that requires ~55-60% of income over 15 years
        target_horizon_years: 15, // Longer horizon to reduce required SIP %
        risk_appetite: "aggressive",
      });
      const result = normalizePlanInput(context);
      expect(result.constraints.feasibilityVerdict).toBe("high_risk");
      expect(result.constraints.flags.highSipRisk).toBe(true);
    });

    it("marks null for reasonable plans (feasible by default)", () => {
      const context = createMockContext({
        monthly_income_inr: 200000,
        monthly_investable_surplus_inr: 40000, // 20% of income
        target_amount_inr: 20000000,
        target_horizon_years: 10,
        risk_appetite: "moderate",
      });
      const result = normalizePlanInput(context);
      expect(result.constraints.feasibilityVerdict).toBe(null);
    });
  });

  describe("confidence and tone", () => {
    it("sets safe confidence for low SIP ratio", () => {
      const context = createMockContext({
        monthly_income_inr: 100000,
        monthly_investable_surplus_inr: 15000, // 15% of income
        target_amount_inr: 20000000,
        target_horizon_years: 10,
      });
      const result = normalizePlanInput(context);
      expect(result.constraints.confidenceTag).toBe("safe");
    });

    it("sets balanced confidence for moderate SIP ratio", () => {
      const context = createMockContext({
        monthly_income_inr: 100000,
        monthly_investable_surplus_inr: 30000, // 30% of income
        target_amount_inr: 20000000,
        target_horizon_years: 10,
      });
      const result = normalizePlanInput(context);
      expect(result.constraints.confidenceTag).toBe("balanced");
    });

    it("sets aggressive confidence for high SIP ratio", () => {
      const context = createMockContext({
        monthly_income_inr: 100000,
        monthly_investable_surplus_inr: 45000, // 45% of income (will be clamped to 40%)
        target_amount_inr: 20000000,
        target_horizon_years: 10,
      });
      const result = normalizePlanInput(context);
      expect(result.constraints.confidenceTag).toBe("aggressive");
    });

    it("sets direct_corrective tone for impossible plans", () => {
      const context = createMockContext({
        monthly_income_inr: 50000,
        monthly_investable_surplus_inr: 25000,
        target_amount_inr: 100000000,
        target_horizon_years: 5,
        risk_appetite: "aggressive",
      });
      const result = normalizePlanInput(context);
      expect(result.constraints.tone).toBe("direct_corrective");
    });

    it("sets cautious_optimism tone for high_risk plans", () => {
      const context = createMockContext({
        monthly_income_inr: 2000000,
        monthly_investable_surplus_inr: 1200000, // 60% of income (will be clamped to 40%)
        target_amount_inr: 300000000,
        target_horizon_years: 10,
        risk_appetite: "aggressive",
      });
      const result = normalizePlanInput(context);
      expect(result.constraints.tone).toBe("cautious_optimism");
    });

    it("sets confidence tone for reasonable plans", () => {
      const context = createMockContext({
        monthly_income_inr: 200000,
        monthly_investable_surplus_inr: 40000,
        target_amount_inr: 5000000, // Lower target to be truly reasonable
        target_horizon_years: 10,
      });
      const result = normalizePlanInput(context);
      expect(result.constraints.tone).toBe("confidence");
    });
  });

  describe("non-corpus goals", () => {
    it("sets null feasibilityVerdict for insurance planning", () => {
      const context = createMockContext({
        primary_financial_goal: "insurance_planning",
        monthly_income_inr: 50000,
        monthly_investable_surplus_inr: 5000,
        target_amount_inr: 100000000,
        target_horizon_years: 5,
      });
      const result = normalizePlanInput(context);
      expect(result.constraints.feasibilityVerdict).toBe(null);
      expect(result.goalIntent.isCorpusGoal).toBe(false);
    });

    it("sets null feasibilityVerdict for tax saving", () => {
      const context = createMockContext({
        primary_financial_goal: "tax_saving",
        monthly_income_inr: 50000,
        monthly_investable_surplus_inr: 5000,
        target_amount_inr: 100000000,
        target_horizon_years: 5,
      });
      const result = normalizePlanInput(context);
      expect(result.constraints.feasibilityVerdict).toBe(null);
      expect(result.goalIntent.isCorpusGoal).toBe(false);
    });
  });

  describe("numeric alias compatibility", () => {
    it("prefers numeric aliases when both numeric and band values exist", () => {
      const context = createMockContext({
        monthlyIncomeInr: 125000,
        sipCapacityInr: 42000,
        timeHorizonYears: 11,
        monthly_income_inr: null,
        monthly_investable_surplus_inr: null,
        target_horizon_years: null,
        monthly_income_band: "50000_100000",
        monthly_investment_capacity_band: "25000_50000",
        target_goal_horizon_band: "5_10_years",
      });

      const result = normalizePlanInput(normalizeBands(context));

      expect(result.profile.income).toBe(125000);
      expect(result.profile.investmentCapacity).toBe(42000);
      expect(result.timeHorizonMonths).toBe(132);
    });

    it("falls back to band values when numeric aliases are missing", () => {
      const context = createMockContext({
        monthlyIncomeInr: null,
        sipCapacityInr: null,
        timeHorizonYears: null,
        monthly_income_inr: null,
        monthly_investable_surplus_inr: null,
        target_horizon_years: null,
        monthly_income_band: "50000_100000",
        monthly_investment_capacity_band: "25000_50000",
        target_goal_horizon_band: "5_10_years",
      });

      const result = normalizePlanInput(normalizeBands(context));

      expect(result.profile.income).toBe(75000);
      expect(result.profile.investmentCapacity).toBe(37500);
      expect(result.timeHorizonMonths).toBe(96);
    });
  });
});
