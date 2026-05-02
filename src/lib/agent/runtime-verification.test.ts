import { describe, expect, it } from "vitest";
import { generateExplanation } from "./explanation-layer";
import type { FinancialSnapshot } from "./types";

function makeTestSnapshot(): FinancialSnapshot {
  return {
    sipOriginal: 60000,
    sipUsed: 60000,
    maxAllowedSip: 90000,
    isOverLimit: false,
    utilizationPercent: 50,
    utilization: { type: "exact", exactPercent: 50 },
    requiredSip: 160000,
    projectedCorpus: 4800000,
    gapAmount: 100000,
    goalDeltaPercent: -4,
    userProfile: {
      income: 120000,
      incomeInputType: "exact",
      incomeRangeMinInr: null,
      incomeRangeMaxInr: null,
      expenses: 0,
      emi: 0,
      investmentCapacity: 60000,
      currentSavings: 0,
      emergencyFundMonths: 6,
      riskProfile: "moderate",
      employmentType: null,
      hasExistingInvestments: false,
      existingInvestmentTypes: [],
      age: null,
      taxRegime: null,
    },
    goal: {
      title: "Wealth Building",
      targetAmount: 5000000,
      timeHorizonMonths: 84,
      priority: "high",
      category: "wealth_creation",
    },
    feasibility: {
      isFeasible: false,
      confidence: "low",
      requiredSip: 160000,
      currentSip: 60000,
      gapAmount: 100000,
      gapPercentage: 62.5,
      expectedCorpus: 4800000,
      shortfall: 200000,
      achievementProbability: 45,
      returnScenarios: [],
    },
    allocation: { equity: 60, debt: 25, gold: 10, liquid: 5, rationale: "test", rebalancingNeeded: false },
    emergencyFund: { requiredMonths: 6, requiredAmount: 0, currentAmount: 0, shortfall: 0, isAdequate: true, priority: "adequate" },
    strategyOptions: [],
    warnings: [],
    recommendations: [],
    inflationAdjustedGoal: 0,
    generatedAt: new Date().toISOString(),
    rebalancingNeeded: false,
    version: "1.0.0",
    timeHorizon: { band: "5_10_years", resolvedYears: 7, label: "7 years" },
    expectedReturn: 0.12,
    scenarioOutcomes: { conservative: 4500000, moderate: 4800000, optimistic: 5100000 },
    actualOutcome: { withCurrentSip: 4800000, shortfall: 200000, percentageOfGoal: 96 },
    gapStrategies: [],
    stepUpSuggestion: undefined,
    utilizationInsight: { level: "aggressive", ratio: 50, message: "Test", potential: null },
    actionPlan: [],
    milestoneRoadmap: [],
    behavioralProfile: { archetype: "test", summary: "Test", insight: "Test", recommendation: "Test" },
    decision: {
      feasibility: "not_viable",
      sustainability: "unsustainable",
      incomeUtilization: 0.5,
      gapAmount: 100000,
      likelyCorpus: 4800000,
      goalAmount: 5000000,
      timeYears: 7,
      percentageOfGoal: 96,
      gapPercentage: 62.5,
      primaryAction: "Lower the goal or raise income before committing to this path.",
      secondaryAction: "If needed, extend the timeline as far as practical and re-run the plan.",
      optionalAction: "Use a smaller intermediate target to keep momentum alive.",
      reasoning: "Required SIP is too far above current capacity under the low-income scenario.",
      primaryActionType: "reduce_goal",
      sipBufferPercent: -62.5,
      sipBufferLabel: "62.5% below required SIP (shortfall)",
      stepUpMode: "recommended",
      safetyMargin: 0.96,
      safetyTier: "tight",
      headerTone: "far_off",
      riskNote: "Test risk note",
    },
    goalIntent: { kind: "wealth_creation", rawTargetAmount: 5000000, derivedCorpus: 5000000, annualIncomeTarget: null, taxSavingTarget: null, termCoverTarget: null, healthCoverTarget: null, isCorpusGoal: true, note: null, warnings: [] },
    constraints: { feasibilityVerdict: "high_risk", flags: { maxAllowedSip: 90000, isOverLimit: false, overLimitAmount: null, utilizationPercent: 50, highSipRisk: true, stepUpCappedAtIncome: false, expensesInferred: false }, confidenceTag: "balanced", tone: "cautious_optimism", reasons: [] },
    dataQuality: { hasFallbacks: false, missingFields: [], confidence: "high", fallbackCount: 0, defaultedFields: [] },
  } as FinancialSnapshot;
}

describe("runtime verification: system test override", () => {
  it("returns SYSTEM TEST ACTIVE when SYSTEM_TEST_ACTIVE=1", async () => {
    process.env.SYSTEM_TEST_ACTIVE = "1";
    const snapshot = makeTestSnapshot();
    const explanation = await generateExplanation(snapshot, null);

    // Log for inspection
    // eslint-disable-next-line no-console
    console.log("VERIFICATION SNAPSHOT DECISION:", snapshot.decision);
    // eslint-disable-next-line no-console
    console.log("VERIFICATION EXPLANATION:", explanation);

    expect(explanation.summary).toBe("SYSTEM TEST ACTIVE");
  });
});
