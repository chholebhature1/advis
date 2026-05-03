import { describe, it, expect, vi } from "vitest";
import {
  sanitizeProfileInput,
  validateNoLeak,
  generateSanitizationReport,
} from "../src/lib/agent/input-sanitizer";
import type { AgentProfileSnapshot } from "../src/lib/agent/types";

describe("Input Sanitizer", () => {
  it("should extract ONLY required numeric fields from profile", () => {
    const profile: AgentProfileSnapshot = {
      // KEEP: Numeric fields
      monthly_income_inr: 350000,
      monthly_investable_surplus_inr: 60000,
      target_horizon_years: 12,
      target_amount_inr: 50000000,
      monthly_expenses_inr: 250000,
      monthly_emi_inr: 15000,
      current_savings_inr: 500000,
      emergency_fund_months: 6,
      risk_appetite: "moderate",
      date_of_birth: "1990-05-15",
      primary_financial_goal: "wealth_creation",
      employment_type: "salaried",
      tax_regime: "new",

      // REMOVE: Band fields
      target_goal_horizon_band: "5_10_years",
      monthly_investment_capacity_band: "50000_plus",
      monthly_income_band: "100000_300000",

      // REMOVE: Metadata
      full_name: "John Doe",
      email: "john@example.com",
      phone_e164: "+911234567890",
      kyc_status: "verified",

      // REMOVE: Timestamps & consent
      onboarding_completed_at: "2026-01-15T10:00:00Z",

      // Other fields (will be kept if numeric)
      has_existing_investments: true,
      existing_investment_types: ["mutual_funds", "stocks"],
      income_input_type: "exact",
      income_range_min_inr: null,
      income_range_max_inr: null,
    };

    const sanitized = sanitizeProfileInput(profile, false);

    // Verify KEPT fields
    expect(sanitized).not.toBeNull();
    expect(sanitized!.monthlyIncomeInr).toBe(350000);
    expect(sanitized!.monthlyInvestableSurplusInr).toBe(60000);
    expect(sanitized!.targetHorizonYears).toBe(12);
    expect(sanitized!.targetAmountInr).toBe(50000000);
    expect(sanitized!.riskAppetite).toBe("moderate");
    expect(sanitized!.primaryFinancialGoal).toBe("wealth_creation");

    // Verify REMOVED fields DO NOT exist in sanitized output
    // @ts-expect-error - deliberately checking removed fields don't exist
    expect(sanitized!.monthlyIncomeBand).toBeUndefined();
    // @ts-expect-error - deliberately checking removed fields don't exist
    expect(sanitized!.fullName).toBeUndefined();
    // @ts-expect-error - deliberately checking removed fields don't exist
    expect(sanitized!.email).toBeUndefined();
    // @ts-expect-error - deliberately checking removed fields don't exist
    expect(sanitized!.onboardingCompletedAt).toBeUndefined();
  });

  it("should validate NO band values leak into sanitized input", () => {
    const cleanSanitized = {
      monthlyIncomeInr: 350000,
      monthlyInvestableSurplusInr: 60000,
      targetHorizonYears: 12,
      riskAppetite: "moderate",
      primaryFinancialGoal: "wealth_creation",
      // All other fields omitted for brevity
      incomeInputType: null,
      incomeRangeMinInr: null,
      incomeRangeMaxInr: null,
      monthlyExpensesInr: null,
      monthlyEmiInr: null,
      currentSavingsInr: null,
      emergencyFundMonths: null,
      targetAmountInr: null,
      dateOfBirth: null,
      employmentType: null,
      taxRegime: null,
      hasExistingInvestments: null,
      existingInvestmentTypes: null,
    };

    const isClean = validateNoLeak(cleanSanitized);
    expect(isClean).toBe(true);
  });

  it("should detect band leakage if risk has band format", () => {
    const leakyRisk = {
      monthlyIncomeInr: 350000,
      riskAppetite: "50000_plus", // ⚠️ Band format!
      // Other fields...
      incomeInputType: null,
      incomeRangeMinInr: null,
      incomeRangeMaxInr: null,
      monthlyExpensesInr: null,
      monthlyEmiInr: null,
      monthlyInvestableSurplusInr: null,
      currentSavingsInr: null,
      emergencyFundMonths: null,
      targetHorizonYears: null,
      targetAmountInr: null,
      primaryFinancialGoal: null,
      dateOfBirth: null,
      employmentType: null,
      taxRegime: null,
      hasExistingInvestments: null,
      existingInvestmentTypes: null,
    };

    // Suppress console.warn for this test
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const isClean = validateNoLeak(leakyRisk);
    warnSpy.mockRestore();

    expect(isClean).toBe(false);
  });

  it("should detect band leakage if goal has _band suffix", () => {
    const leakyGoal = {
      monthlyIncomeInr: 350000,
      primaryFinancialGoal: "wealth_creation_band", // ⚠️ Band format!
      // Other fields...
      incomeInputType: null,
      incomeRangeMinInr: null,
      incomeRangeMaxInr: null,
      monthlyExpensesInr: null,
      monthlyEmiInr: null,
      monthlyInvestableSurplusInr: null,
      currentSavingsInr: null,
      emergencyFundMonths: null,
      targetHorizonYears: null,
      targetAmountInr: null,
      riskAppetite: null,
      dateOfBirth: null,
      employmentType: null,
      taxRegime: null,
      hasExistingInvestments: null,
      existingInvestmentTypes: null,
    };

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const isClean = validateNoLeak(leakyGoal);
    warnSpy.mockRestore();

    expect(isClean).toBe(false);
  });

  it("should handle null profile gracefully", () => {
    const sanitized = sanitizeProfileInput(null, false);
    expect(sanitized).toBeNull();
  });

  it("should freeze sanitized object to prevent mutations", () => {
    const profile: AgentProfileSnapshot = {
      monthly_income_inr: 350000,
      full_name: "John Doe",
      email: "john@example.com",
      // ... other fields
    } as any;

    const sanitized = sanitizeProfileInput(profile, false);
    expect(sanitized).not.toBeNull();

    // Attempt to modify should throw in strict mode (Object.freeze prevents mutation)
    const attemptMutation = () => {
      if (sanitized) {
        (sanitized as any).monthlyIncomeInr = 999999;
      }
    };

    // Object.freeze prevents mutation
    expect(() => attemptMutation()).toThrow();
    
    // Value shouldn't actually change
    expect(sanitized!.monthlyIncomeInr).toBe(350000);
  });

  it("should generate sanitization report showing kept vs removed fields", () => {
    const profile: AgentProfileSnapshot = {
      monthly_income_inr: 350000,
      monthly_income_band: "100000_300000",
      full_name: "John Doe",
      email: "john@example.com",
      target_horizon_years: 12,
      risk_appetite: "moderate",
    } as any;

    const report = generateSanitizationReport(profile);

    // Check report structure
    expect(report.keptFields).toContain("monthlyIncomeInr");
    expect(report.keptFields).toContain("targetHorizonYears");
    expect(report.keptFields).toContain("riskAppetite");

    // Check removed fields are categorized correctly
    expect(report.removedFields.bands).toContain("monthly_income_band");
    expect(report.removedFields.metadata).toContain("full_name");
    expect(report.removedFields.metadata).toContain("email");
  });

  it("should preserve income range fields when provided", () => {
    const profile: AgentProfileSnapshot = {
      monthly_income_inr: null,
      income_input_type: "range",
      income_range_min_inr: 300000,
      income_range_max_inr: 500000,
      monthly_investable_surplus_inr: 60000,
      target_horizon_years: 12,
    } as any;

    const sanitized = sanitizeProfileInput(profile, false);

    expect(sanitized).not.toBeNull();
    expect(sanitized!.incomeInputType).toBe("range");
    expect(sanitized!.incomeRangeMinInr).toBe(300000);
    expect(sanitized!.incomeRangeMaxInr).toBe(500000);
  });

  it("should handle profile with many null fields", () => {
    const profile: AgentProfileSnapshot = {
      monthly_income_inr: 350000,
      monthly_investable_surplus_inr: null,
      target_horizon_years: null,
      target_amount_inr: null,
      risk_appetite: null,
    } as any;

    const sanitized = sanitizeProfileInput(profile, false);

    expect(sanitized).not.toBeNull();
    expect(sanitized!.monthlyIncomeInr).toBe(350000);
    expect(sanitized!.monthlyInvestableSurplusInr).toBeNull();
    expect(sanitized!.targetHorizonYears).toBeNull();
  });

  it("should NOT include band fields in sanitized output", () => {
    const profile: AgentProfileSnapshot = {
      monthly_income_inr: 350000,
      target_goal_horizon_band: "5_10_years",
      monthly_investment_capacity_band: "50000_plus",
      monthly_income_band: "100000_300000",
    } as any;

    const sanitized = sanitizeProfileInput(profile, false);
    expect(sanitized).not.toBeNull();

    // Bands should NOT be in sanitized output structure
    const sanitizedKeys = Object.keys(sanitized!);
    expect(sanitizedKeys).not.toContain("target_goal_horizon_band");
    expect(sanitizedKeys).not.toContain("monthly_investment_capacity_band");
    expect(sanitizedKeys).not.toContain("monthly_income_band");
    expect(sanitizedKeys).not.toContain("targetGoalHorizonBand");
    expect(sanitizedKeys).not.toContain("monthlyInvestmentCapacityBand");
    expect(sanitizedKeys).not.toContain("monthlyIncomeBand");
  });

  it("should extract all required financial calculation fields", () => {
    const profile: AgentProfileSnapshot = {
      monthly_income_inr: 350000,
      monthly_investable_surplus_inr: 60000,
      monthly_expenses_inr: 250000,
      monthly_emi_inr: 15000,
      current_savings_inr: 500000,
      target_horizon_years: 12,
      target_amount_inr: 50000000,
      emergency_fund_months: 6,
      risk_appetite: "moderate",
      employment_type: "salaried",
      tax_regime: "new",
    } as any;

    const sanitized = sanitizeProfileInput(profile, false);
    expect(sanitized).not.toBeNull();

    // All fields should be extractable
    expect(sanitized!.monthlyIncomeInr).toBe(350000);
    expect(sanitized!.monthlyInvestableSurplusInr).toBe(60000);
    expect(sanitized!.monthlyExpensesInr).toBe(250000);
    expect(sanitized!.monthlyEmiInr).toBe(15000);
    expect(sanitized!.currentSavingsInr).toBe(500000);
    expect(sanitized!.targetHorizonYears).toBe(12);
    expect(sanitized!.targetAmountInr).toBe(50000000);
    expect(sanitized!.emergencyFundMonths).toBe(6);
    expect(sanitized!.riskAppetite).toBe("moderate");
    expect(sanitized!.employmentType).toBe("salaried");
    expect(sanitized!.taxRegime).toBe("new");
  });

  it("should NOT pass user metadata or notes", () => {
    const profile: AgentProfileSnapshot = {
      monthly_income_inr: 350000,
      full_name: "John Doe",
      email: "john@example.com",
      phone_e164: "+911234567890",
      city: "Bangalore",
      state: "Karnataka",
      country_code: "IN",
      occupation_title: "Software Engineer",
      liquidity_needs_notes: "Need liquidity for house purchase",
      kyc_status: "verified",
      onboarding_completed_at: "2026-01-15T10:00:00Z",
    } as any;

    const sanitized = sanitizeProfileInput(profile, false);
    expect(sanitized).not.toBeNull();

    // Metadata should NOT be accessible
    const sanitizedKeys = Object.keys(sanitized!);
    expect(sanitizedKeys).not.toContain("full_name");
    expect(sanitizedKeys).not.toContain("email");
    expect(sanitizedKeys).not.toContain("phone_e164");
    expect(sanitizedKeys).not.toContain("city");
    expect(sanitizedKeys).not.toContain("state");
    expect(sanitizedKeys).not.toContain("country_code");
    expect(sanitizedKeys).not.toContain("occupation_title");
    expect(sanitizedKeys).not.toContain("liquidity_needs_notes");
    expect(sanitizedKeys).not.toContain("kyc_status");
    expect(sanitizedKeys).not.toContain("onboarding_completed_at");
  });
});
