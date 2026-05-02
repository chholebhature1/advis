import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { loadAgentContext } from "./context";
import { generateFinancialSnapshot } from "./financial-engine";
import type { AgentProfileSnapshot } from "./types";

type QueryResult<T> = {
  data: T;
  error: null;
};

class MockQuery<T> implements PromiseLike<QueryResult<T>> {
  constructor(private readonly result: QueryResult<T>) {}

  select(): MockQuery<T> {
    return this;
  }

  eq(): MockQuery<T> {
    return this;
  }

  order(): MockQuery<T> {
    return this;
  }

  limit(): MockQuery<T> {
    return this;
  }

  maybeSingle(): MockQuery<T> {
    return this;
  }

  then<TResult1 = QueryResult<T>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.result).then(onfulfilled, onrejected);
  }
}

function createMockSupabase(profile: AgentProfileSnapshot): SupabaseClient {
  const resultMap: Record<string, QueryResult<unknown>> = {
    profiles: { data: profile, error: null },
    risk_assessments: {
      data: {
        risk_score: 55,
        risk_bucket: "moderate",
        drawdown_tolerance_pct: null,
        time_horizon_years: 10,
      },
      error: null,
    },
    financial_goals: { data: [], error: null },
    communication_preferences: {
      data: {
        preferred_channel: "email",
        phone_e164: profile.phone_e164,
        email: profile.email,
        whatsapp_opt_in: false,
        email_opt_in: true,
        push_opt_in: false,
        quiet_hours_start: null,
        quiet_hours_end: null,
        timezone: "Asia/Kolkata",
      },
      error: null,
    },
    portfolio_holdings: { data: [], error: null },
  };

  return {
    from(table: string) {
      const result = resultMap[table] ?? { data: null, error: null };
      return new MockQuery(result as QueryResult<never>);
    },
  } as unknown as SupabaseClient;
}

describe("financial trace", () => {
  it("preserves the band-resolved SIP and emits explicit limit metadata", async () => {
    const profile: AgentProfileSnapshot = {
      full_name: "Trace User",
      email: "trace@example.com",
      phone_e164: "+919999999999",
      date_of_birth: null,
      city: null,
      state: null,
      country_code: null,
      tax_residency_country: null,
      occupation_title: null,
      employment_type: null,
      monthly_income_inr: null,
      monthly_expenses_inr: null,
      monthly_emi_inr: null,
      monthly_investable_surplus_inr: null,
      current_savings_inr: 0,
      emergency_fund_months: 6,
      loss_tolerance_pct: null,
      liquidity_needs_notes: null,
      risk_appetite: "moderate",
      target_horizon_years: null,
      target_amount_inr: 5_000_000,
      tax_regime: null,
      kyc_status: "verified",
      onboarding_completed_at: null,
      primary_financial_goal: "wealth_creation",
      target_goal_horizon_band: "5_10_years",
      monthly_investment_capacity_band: "25000_50000",
      monthly_income_band: "50000_100000",
      has_existing_investments: false,
      existing_investment_types: [],
    };

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const supabase = createMockSupabase(profile);

    try {
      const context = await loadAgentContext(supabase, "trace-user", true);
      const snapshot = generateFinancialSnapshot(context, true);

      expect(context.profile?.monthly_investable_surplus_inr).toBe(37_500);
      expect(context.profile?.monthly_income_inr).toBe(75_000);
      expect(context.profile?.target_horizon_years).toBe(7.5);

      expect(snapshot.sipOriginal).toBe(37_500);
      expect(snapshot.sipUsed).toBe(37_500);
      expect(snapshot.maxAllowedSip).toBe(45_000);
      expect(snapshot.isOverLimit).toBe(false);
      expect(snapshot.utilizationPercent).toBe(50);
      expect(snapshot.requiredSip).toBeGreaterThan(0);
      expect(snapshot.projectedCorpus).toBe(snapshot.feasibility.expectedCorpus);
      expect(snapshot.gapAmount).toBe(snapshot.feasibility.gapAmount);
      expect(snapshot.feasibility.currentSip).toBe(37_500);
      expect(snapshot.feasibility.requiredSip).toBeGreaterThan(0);
      expect(snapshot.goal.targetAmount).toBe(5_000_000);
      expect(snapshot.goal.timeHorizonMonths).toBe(90);
      expect(snapshot.constraints.flags.maxAllowedSip).toBe(45_000);
      expect(snapshot.constraints.flags.isOverLimit).toBe(false);
      expect(snapshot.constraints.flags.overLimitAmount).toBe(null);
      expect(snapshot.constraints.flags.utilizationPercent).toBe(50);

      const allocationTotal =
        snapshot.allocation.equity +
        snapshot.allocation.debt +
        snapshot.allocation.gold +
        snapshot.allocation.liquid;

      expect(allocationTotal).toBe(snapshot.sipOriginal);

      const traceCalls = consoleSpy.mock.calls.filter(
        ([label]) =>
          typeof label === "string" &&
          ["RAW PROFILE", "NORMALIZED INPUT", "ENGINE INPUT", "SNAPSHOT OUTPUT"].includes(label),
      );

      expect(traceCalls.map(([label]) => label)).toEqual([
        "RAW PROFILE",
        "NORMALIZED INPUT",
        "ENGINE INPUT",
        "SNAPSHOT OUTPUT",
      ]);

      expect(traceCalls[0]?.[2]).toMatchObject({
        sip: 37_500,
        income: 75_000,
        horizon: 7.5,
        target: 5_000_000,
      });

      expect(traceCalls[1]?.[2]).toMatchObject({
        sip: 37_500,
        income: 75_000,
        horizon: 7.5,
        target: 5_000_000,
      });

      expect(traceCalls[2]?.[2]).toMatchObject({
        sipOriginal: 37_500,
        income: 75_000,
        horizon: 7.5,
        target: 5_000_000,
        maxAllowedSip: 45_000,
        isOverLimit: false,
        utilizationPercent: 50,
      });

      expect(traceCalls[3]?.[2]).toMatchObject({
        sipOriginal: 37_500,
        sipUsed: 37_500,
        income: 75_000,
        horizon: 7.5,
        target: 5_000_000,
        maxAllowedSip: 45_000,
        isOverLimit: false,
      });
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("handles missing schema fields without crashing", async () => {
    // Profile with missing income_input_type, income_range_min_inr, income_range_max_inr
    // This simulates a DB schema mismatch (legacy rows without new fields)
    const profileWithMissingFields: AgentProfileSnapshot = {
      full_name: "Legacy User",
      email: "legacy@example.com",
      phone_e164: "+919999999999",
      date_of_birth: null,
      city: null,
      state: null,
      country_code: null,
      tax_residency_country: null,
      occupation_title: null,
      employment_type: null,
      monthly_income_inr: 75_000,
      monthly_expenses_inr: 25_000,
      monthly_emi_inr: 10_000,
      monthly_investable_surplus_inr: 40_000,
      current_savings_inr: 500_000,
      emergency_fund_months: 6,
      loss_tolerance_pct: null,
      liquidity_needs_notes: null,
      risk_appetite: "moderate",
      target_horizon_years: 7.5,
      target_amount_inr: 5_000_000,
      tax_regime: null,
      kyc_status: "verified",
      onboarding_completed_at: null,
      primary_financial_goal: "wealth_creation",
      // MISSING: income_input_type, income_range_min_inr, income_range_max_inr
      // These will be undefined, simulating schema mismatch
      target_goal_horizon_band: "5_10_years",
      monthly_investment_capacity_band: "25000_50000",
      monthly_income_band: "50000_100000",
      has_existing_investments: false,
      existing_investment_types: [],
    };

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const supabase = createMockSupabase(profileWithMissingFields);

    try {
      // System should NOT crash
      const context = await loadAgentContext(supabase, "legacy-user", true);
      
      // Profile should still be loaded
      expect(context.profile).toBeTruthy();
      
      // Missing fields should be populated with safe defaults
      expect(context.profile?.income_input_type).toBe("exact");
      expect(context.profile?.income_range_min_inr).toBeNull();
      expect(context.profile?.income_range_max_inr).toBeNull();
      
      // Financial engine should still work
      const snapshot = generateFinancialSnapshot(context, true);
      expect(snapshot).toBeTruthy();
      expect(snapshot.sipOriginal).toBe(40_000);
      expect(snapshot.sipUsed).toBe(40_000);
      expect(snapshot.feasibility).toBeTruthy();
      expect(snapshot.feasibility.expectedCorpus).toBeGreaterThan(0);
      
      // Validation logs should appear
      const schemaValidationLogs = consoleSpy.mock.calls.filter(
        ([label]) => typeof label === "string" && label === "SCHEMA VALIDATION"
      );
      
      // At minimum, we should see RAW PROFILE and NORMALIZED INPUT
      const allLogs = consoleSpy.mock.calls.filter(
        ([label]) =>
          typeof label === "string" &&
          ["RAW PROFILE", "SCHEMA VALIDATION", "NORMALIZED INPUT", "CONTEXT AFTER TYPE GUARDS", "ENGINE INPUT", "SNAPSHOT OUTPUT"].includes(label),
      );
      
      expect(allLogs.length).toBeGreaterThan(0);
      expect(allLogs.map(([label]) => label)).toContain("RAW PROFILE");
      expect(allLogs.map(([label]) => label)).toContain("SCHEMA VALIDATION");
      
    } finally {
      consoleSpy.mockRestore();
    }
  });
});