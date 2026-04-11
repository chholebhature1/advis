import { describe, expect, it } from "vitest";
import { buildTaxOptimizationSummary } from "./tax-optimization";

describe("buildTaxOptimizationSummary", () => {
  it("prefers new regime for low-income rebate scenario", () => {
    const summary = buildTaxOptimizationSummary({
      taxRegime: "old",
      annualTaxableIncomeInr: 650000,
      section80cUsedInr: 0,
      section80dUsedInr: 0,
      homeLoanInterestInr: 0,
      now: new Date("2026-01-15T00:00:00.000Z"),
    });

    expect(summary.regimeHint.suggestedRegime).toBe("new");
    expect(summary.regimeHint.estimatedTaxOldInr).toBe(32500);
    expect(summary.regimeHint.estimatedTaxNewInr).toBe(0);
    expect(summary.regimeHint.estimatedPotentialSavingsInr).toBe(32500);
    expect(summary.regimeHint.message.toLowerCase()).toContain("new regime appears better");
  });

  it("flags close-call regime when estimates are nearly identical", () => {
    const summary = buildTaxOptimizationSummary({
      taxRegime: "old",
      annualTaxableIncomeInr: 1125000,
      section80cUsedInr: 150000,
      section80dUsedInr: 0,
      homeLoanInterestInr: 200000,
      now: new Date("2026-01-15T00:00:00.000Z"),
    });

    expect(summary.regimeHint.suggestedRegime).toBe("old");
    expect(summary.regimeHint.estimatedTaxOldInr).toBe(57500);
    expect(summary.regimeHint.estimatedTaxNewInr).toBe(57500);
    expect(summary.regimeHint.estimatedTaxDeltaInr).toBe(0);
    expect(summary.regimeHint.estimatedPotentialSavingsInr).toBe(0);
    expect(summary.regimeHint.confidence).toBe("low");
    expect(summary.regimeHint.message.toLowerCase()).toContain("estimate is close");
  });

  it("prefers old regime for high-deduction scenario", () => {
    const summary = buildTaxOptimizationSummary({
      taxRegime: "new",
      annualTaxableIncomeInr: 2000000,
      section80cUsedInr: 150000,
      section80dUsedInr: 150000,
      homeLoanInterestInr: 200000,
      now: new Date("2026-01-15T00:00:00.000Z"),
    });

    expect(summary.regimeHint.suggestedRegime).toBe("old");
    expect(summary.regimeHint.estimatedTaxOldInr).toBe(247500);
    expect(summary.regimeHint.estimatedTaxNewInr).toBe(267500);
    expect(summary.regimeHint.estimatedTaxDeltaInr).toBe(-20000);
    expect(summary.regimeHint.estimatedPotentialSavingsInr).toBe(20000);
    expect(summary.regimeHint.message.toLowerCase()).toContain("old regime appears better");
  });
});
