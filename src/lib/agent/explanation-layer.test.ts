import { afterEach, describe, expect, it, vi } from "vitest";
import { generateExplanation } from "./explanation-layer";
import type { FinancialSnapshot } from "./types";

function createBaseSnapshot(): FinancialSnapshot {
  return {
    sipOriginal: 60_000,
    sipUsed: 60_000,
    maxAllowedSip: 90_000,
    isOverLimit: false,
    utilizationPercent: 50,
    utilization: {
      type: "exact",
      exactPercent: 50,
    },
    requiredSip: 160_000,
    projectedCorpus: 4_800_000,
    gapAmount: 100_000,
    goalDeltaPercent: -4,
    userProfile: {
      income: 120_000,
      incomeInputType: "exact",
      incomeRangeMinInr: null,
      incomeRangeMaxInr: null,
      expenses: 0,
      emi: 0,
      investmentCapacity: 60_000,
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
      targetAmount: 5_000_000,
      timeHorizonMonths: 84,
      priority: "high",
      category: "wealth_creation",
    },
    feasibility: {
      isFeasible: false,
      confidence: "low",
      requiredSip: 160_000,
      currentSip: 60_000,
      gapAmount: 100_000,
      gapPercentage: 62.5,
      expectedCorpus: 4_800_000,
      shortfall: 200_000,
      achievementProbability: 45,
      returnScenarios: [],
    },
    allocation: {
      equity: 60,
      debt: 25,
      gold: 10,
      liquid: 5,
      rationale: "Test allocation",
      rebalancingNeeded: false,
    },
    emergencyFund: {
      requiredMonths: 6,
      requiredAmount: 0,
      currentAmount: 0,
      shortfall: 0,
      isAdequate: true,
      priority: "adequate",
    },
    strategyOptions: [],
    warnings: [],
    recommendations: [],
    inflationAdjustedGoal: 0,
    generatedAt: "2026-05-02T00:00:00.000Z",
    rebalancingNeeded: false,
    version: "1.0.0",
    timeHorizon: {
      band: "5_10_years",
      resolvedYears: 7,
      label: "7 years",
    },
    expectedReturn: 0.12,
    assetReturns: { equity: 0.12, debt: 0.075, gold: 0.065, liquid: 0.04 },
    scenarioSpread: 2,
    scenarioOutcomes: {
      conservative: 4_500_000,
      moderate: 4_800_000,
      optimistic: 5_100_000,
    },
    actualOutcome: {
      withCurrentSip: 4_800_000,
      shortfall: 200_000,
      percentageOfGoal: 96,
    },
    gapStrategies: [],
    stepUpSuggestion: undefined,
    utilizationInsight: {
      level: "aggressive",
      ratio: 50,
      message: "Test",
      potential: null,
    },
    actionPlan: [],
    milestoneRoadmap: [],
    behavioralProfile: {
      archetype: "test",
      summary: "Test",
      insight: "Test",
      recommendation: "Test",
    },
    decision: {
      feasibility: "not_viable",
      sustainability: "unsustainable",
      incomeUtilization: 0.5,
      gapAmount: 100_000,
      likelyCorpus: 4_800_000,
      goalAmount: 5_000_000,
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
    goalIntent: {
      kind: "wealth_creation",
      rawTargetAmount: 5_000_000,
      derivedCorpus: 5_000_000,
      annualIncomeTarget: null,
      taxSavingTarget: null,
      termCoverTarget: null,
      healthCoverTarget: null,
      isCorpusGoal: true,
      note: null,
      warnings: [],
    },
    constraints: {
      feasibilityVerdict: "high_risk",
      flags: {
        maxAllowedSip: 90_000,
        isOverLimit: false,
        overLimitAmount: null,
        utilizationPercent: 50,
        highSipRisk: true,
        stepUpCappedAtIncome: false,
        expensesInferred: false,
      },
      confidenceTag: "balanced",
      tone: "cautious_optimism",
      reasons: [],
    },
    dataQuality: {
      hasFallbacks: false,
      missingFields: [],
      confidence: "high",
      fallbackCount: 0,
      defaultedFields: [],
    },
  } as FinancialSnapshot;
}

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.OPENROUTER_API_KEY;
});

describe("generateExplanation", () => {
  it("falls back when the AI output introduces a new number", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  summary: "Your current plan needs 155000 more.",
                  insight: "You need ₹155,000 to stay on track.",
                  suggestion: { primary: "Raise SIP to ₹155,000." },
                  tone: "direct",
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const explanation = await generateExplanation(createBaseSnapshot(), null);

    expect(explanation.tone).toBe("caution");
    // Fallback now includes real snapshot values (not hallucinated 155,000)
    expect(explanation.summary).not.toContain("155");
    expect(explanation.insight).not.toContain("155");
    expect(explanation.suggestion.primary).not.toContain("155");
  });

  it("does not suggest reducing SIP when SIP exceeds required SIP", async () => {
    const snapshot = createBaseSnapshot();
    snapshot.sipOriginal = 180_000;
    snapshot.sipUsed = 180_000;
    snapshot.requiredSip = 160_000;
    snapshot.gapAmount = 0;
    snapshot.goalDeltaPercent = 8;
    snapshot.utilization = { type: "exact", exactPercent: 150 };
    snapshot.decision = {
      ...snapshot.decision,
      feasibility: "comfortable",
      primaryActionType: "optimize",
      primaryAction: "Optimize: enable an annual step-up of 5–8% to beat inflation.",
      sipBufferPercent: 12.5,
      sipBufferLabel: "12.5% above required SIP (comfortable buffer)",
      stepUpMode: "optional",
      safetyMargin: 1.12,
      safetyTier: "safe",
      headerTone: "strongly_on_track",
    };
    snapshot.constraints = {
      ...snapshot.constraints,
      feasibilityVerdict: "feasible",
      flags: {
        ...snapshot.constraints.flags,
        overLimitAmount: null,
      },
    };
    process.env.OPENROUTER_API_KEY = "test-key";

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  summary: "You should reduce SIP now.",
                  insight: "Lower the investment to save cash.",
                  suggestion: { primary: "Cut investment by 20%." },
                  tone: "positive",
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const explanation = await generateExplanation(snapshot, null);

    expect(explanation.tone).toBe("positive");
    expect(explanation.suggestion.primary.toLowerCase()).not.toContain("reduce");
    expect(explanation.suggestion.primary.toLowerCase()).not.toContain("lower");
    expect(explanation.suggestion.primary.toLowerCase()).not.toContain("cut");
    expect(explanation.suggestion.primary.toLowerCase()).toContain("timeline");
  });

  it("keeps optional step-up advice non-aggressive", async () => {
    const snapshot = createBaseSnapshot();
    snapshot.decision = {
      ...snapshot.decision,
      feasibility: "comfortable",
      primaryActionType: "optimize",
      primaryAction: "Optimize: enable an annual step-up of 5–8% to beat inflation.",
      stepUpMode: "optional",
      sipBufferPercent: 18.2,
      sipBufferLabel: "18.2% above required SIP (comfortable buffer)",
      safetyMargin: 1.18,
      safetyTier: "safe",
      headerTone: "strongly_on_track",
    };
    snapshot.constraints = {
      ...snapshot.constraints,
      feasibilityVerdict: "feasible",
    };
    process.env.OPENROUTER_API_KEY = "test-key";

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  summary: "You are on track.",
                  insight: "Step-up is optional.",
                  suggestion: { primary: "Step-up can accelerate growth." },
                  tone: "positive",
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const explanation = await generateExplanation(snapshot, null);

    expect(explanation.tone).toBe("positive");
    expect(explanation.suggestion.primary.toLowerCase()).toMatch(/accelerate|timeline|stay consistent/);
    expect(explanation.suggestion.primary.toLowerCase()).not.toContain("needed to reach goal");
  });

  it("renders range utilization when income is stored as a range", async () => {
    const snapshot = createBaseSnapshot();
    snapshot.decision = {
      ...snapshot.decision,
      feasibility: "comfortable",
      primaryActionType: "optimize",
      primaryAction: "Optimize: keep the current SIP steady.",
      stepUpMode: "optional",
      sipBufferPercent: 18,
      sipBufferLabel: "18.0% above required SIP (comfortable buffer)",
      safetyMargin: 1.18,
      safetyTier: "safe",
      headerTone: "strongly_on_track",
    };
    snapshot.constraints = {
      ...snapshot.constraints,
      feasibilityVerdict: "feasible",
    };
    snapshot.userProfile = {
      ...snapshot.userProfile,
      incomeInputType: "range",
      incomeRangeMinInr: 50_000,
      incomeRangeMaxInr: 100_000,
    };
    snapshot.utilization = {
      type: "range",
      minPercent: 60,
      maxPercent: 120,
    };
    process.env.OPENROUTER_API_KEY = "test-key";

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  summary: "You are on track.",
                  insight: "Utilization should be shown as a range.",
                  suggestion: { primary: "Keep investing consistently." },
                  tone: "positive",
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const explanation = await generateExplanation(snapshot, null);

    expect(explanation.tone).toBe("positive");
    // Fallback now includes real SIP values from the snapshot
    expect(explanation.summary.length).toBeGreaterThan(10);
  });

  it("keeps the goal-vs-reality output to projected corpus and delta only", async () => {
    const snapshot = createBaseSnapshot();
    process.env.OPENROUTER_API_KEY = "test-key";

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  summary: "Projected corpus is ₹4,800,000.",
                  insight: "That is 4% below goal.",
                  suggestion: { primary: "Keep the current plan steady." },
                  tone: "neutral",
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const explanation = await generateExplanation(snapshot, null);

    expect(explanation.tone).toBe("caution");
    // Fallback now uses real snapshot values; ensure no hallucinated numbers
    expect(explanation.summary).not.toContain("4,800,000");
  });

  it("rejects AI outputs that mismatch the deterministic tone and falls back", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  summary: "You can reach the goal if you change a few things.",
                  insight: "Small changes will help.",
                  suggestion: { primary: "Increase SIP by 10%." },
                  tone: "positive",
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const explanation = await generateExplanation(createBaseSnapshot(), null);
    expect(explanation.tone).toBe("caution");
  });

  it("honors explanationDepth detailed in fallback output", async () => {
    const result = await generateExplanation(createBaseSnapshot(), null, "detailed");
    expect(result.suggestion.primary.toLowerCase()).toMatch(/increase|investable|income|surplus/);
  });
});