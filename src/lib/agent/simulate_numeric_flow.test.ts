import { it, describe, expect } from "vitest";
import type { AgentContext, AgentProfileSnapshot } from "./types";
import { normalizeBands } from "./band-resolver";
import { generateFinancialSnapshot } from "./financial-engine";

function makeRawContext(profile: Partial<AgentProfileSnapshot>): AgentContext {
  return {
    profile: { ...profile, user_id: "test-user" } as AgentProfileSnapshot,
    latestRiskAssessment: null,
    goals: [],
    communicationPreferences: null,
    holdings: [],
    dataQuality: {
      hasFallbacks: false,
      missingFields: [],
      confidence: "high",
      fallbackCount: 0,
      defaultedFields: [],
    },
  } as unknown as AgentContext;
}

describe("simulate numeric onboarding flow", () => {
  it("propagates exact numeric inputs into the engine (normal case)", () => {
    const raw = makeRawContext({
      monthly_income_inr: 300000,
      monthly_investable_surplus_inr: 60000,
      target_horizon_years: 12,
      target_goal_custom_amount_inr: 5_000_000,
    });

    const normalized = normalizeBands(raw, true);
    const snapshot = generateFinancialSnapshot(normalized, true);

    // Observability asserts
    expect(snapshot.userProfile.income).toBe(300000);
    expect(snapshot.userProfile.investmentCapacity).toBe(60000);
    expect(snapshot.goal.targetAmount).toBe(5_000_000);
    expect(snapshot.timeHorizon.resolvedYears).toBeGreaterThanOrEqual(12);
    expect(Number.isFinite(snapshot.requiredSip)).toBe(true);
  });

  it("edge: very high income, low SIP", () => {
    const raw = makeRawContext({
      monthly_income_inr: 2_000_000,
      monthly_investable_surplus_inr: 5000,
      target_horizon_years: 20,
      target_goal_custom_amount_inr: 10_000_000,
    });

    const normalized = normalizeBands(raw, true);
    const snapshot = generateFinancialSnapshot(normalized, true);

    expect(snapshot.userProfile.income).toBe(2_000_000);
    expect(snapshot.userProfile.investmentCapacity).toBe(5000);
    expect(Number.isFinite(snapshot.requiredSip)).toBe(true);
  });

  it("edge: very low SIP relative to income (short timeline)", () => {
    const raw = makeRawContext({
      monthly_income_inr: 150000,
      monthly_investable_surplus_inr: 1000,
      target_horizon_years: 5,
      target_goal_custom_amount_inr: 7_000_000,
    });

    const normalized = normalizeBands(raw, true);
    const snapshot = generateFinancialSnapshot(normalized, true);

    expect(snapshot.userProfile.income).toBe(150000);
    expect(snapshot.userProfile.investmentCapacity).toBe(1000);
    expect(Number.isFinite(snapshot.requiredSip)).toBe(true);
  });

  it("keeps exact numeric SIP even when band token is 50000_plus", () => {
    const raw = makeRawContext({
      monthly_income_inr: 300000,
      monthly_investable_surplus_inr: 150000,
      monthly_investment_capacity_band: "50000_plus",
      target_horizon_years: 10,
      target_goal_custom_amount_inr: 8_000_000,
    });

    const normalized = normalizeBands(raw, true);
    const snapshot = generateFinancialSnapshot(normalized, true);

    expect(snapshot.sipOriginal).toBe(150000);
    expect(snapshot.sipUsed).toBe(150000);
    expect(snapshot.userProfile.investmentCapacity).toBe(150000);
  });

  it("keeps exact numeric SIP at 75000 without rounding to lower band", () => {
    const raw = makeRawContext({
      monthly_income_inr: 200000,
      monthly_investable_surplus_inr: 75000,
      monthly_investment_capacity_band: "25000_50000",
      target_horizon_years: 8,
      target_goal_custom_amount_inr: 6_000_000,
    });

    const normalized = normalizeBands(raw, true);
    const snapshot = generateFinancialSnapshot(normalized, true);

    expect(snapshot.sipOriginal).toBe(75000);
    expect(snapshot.sipUsed).toBe(75000);
    expect(snapshot.userProfile.investmentCapacity).toBe(75000);
  });

  it("uses band fallback only when numeric SIP is missing", () => {
    const raw = makeRawContext({
      monthly_income_inr: 200000,
      monthly_investable_surplus_inr: null,
      monthly_investment_capacity_band: "25000_50000",
      target_horizon_years: 8,
      target_goal_custom_amount_inr: 6_000_000,
    });

    const normalized = normalizeBands(raw, true);
    const snapshot = generateFinancialSnapshot(normalized, true);

    expect(normalized.profile?.monthly_investable_surplus_inr).toBe(37500);
    expect(snapshot.sipOriginal).toBe(37500);
    expect(snapshot.sipUsed).toBe(37500);
  });

  it("does not cap SIP above safe level; only flags warning metadata", () => {
    const raw = makeRawContext({
      monthly_income_inr: 200000,
      monthly_investable_surplus_inr: 150000,
      target_horizon_years: 8,
      target_goal_custom_amount_inr: 6_000_000,
    });

    const normalized = normalizeBands(raw, true);
    const snapshot = generateFinancialSnapshot(normalized, true);

    expect(snapshot.sipOriginal).toBe(150000);
    expect(snapshot.sipUsed).toBe(150000);
    expect(snapshot.maxAllowedSip).toBe(120000);
    expect(snapshot.isOverLimit).toBe(true);
  });

  it("trace: INPUT SIP -> CONTEXT -> ENGINE -> SNAPSHOT remains unchanged", () => {
    const inputSip = 150000;
    const raw = makeRawContext({
      monthly_income_inr: 300000,
      monthly_investable_surplus_inr: inputSip,
      monthly_investment_capacity_band: "25000_50000",
      target_horizon_years: 10,
      target_goal_custom_amount_inr: 8_000_000,
    });

    const normalized = normalizeBands(raw, true);
    const contextSip = normalized.profile?.monthly_investable_surplus_inr ?? null;
    const snapshot = generateFinancialSnapshot(normalized, true);
    const engineSip = normalized.profile?.monthly_investable_surplus_inr ?? null;
    const outputSip = snapshot.sipOriginal;

    // Debug trace for manual verification during test runs
    // eslint-disable-next-line no-console
    console.log("SIP TRACE", {
      inputSip,
      contextSip,
      engineSip,
      snapshotSip: outputSip,
    });

    expect(contextSip).toBe(inputSip);
    expect(engineSip).toBe(inputSip);
    expect(outputSip).toBe(inputSip);
  });
});
