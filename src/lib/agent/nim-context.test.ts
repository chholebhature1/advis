import { describe, expect, it } from "vitest";
import type { AgentContext } from "@/lib/agent/types";
import { buildContextBlock } from "./nim";

const baseContext: AgentContext = {
  profile: {
    full_name: "Riya Sharma",
    email: "riya@example.com",
    phone_e164: "+919876543210",
    date_of_birth: "1992-08-17",
    city: "Pune",
    state: "Maharashtra",
    country_code: "IN",
    tax_residency_country: "IN",
    occupation_title: "Product Manager",
    employment_type: "salaried",
    monthly_income_inr: 180000,
    monthly_expenses_inr: 90000,
    monthly_emi_inr: 18000,
    monthly_investable_surplus_inr: 55000,
    current_savings_inr: 2200000,
    emergency_fund_months: 5,
    loss_tolerance_pct: 20,
    liquidity_needs_notes: "Need moderate liquidity for possible home down payment in 2 years.",
    risk_appetite: "moderate",
    target_horizon_years: 10,
    tax_regime: "old",
    kyc_status: "verified",
    onboarding_completed_at: "2026-03-20T10:00:00.000Z",
  },
  latestRiskAssessment: {
    risk_score: 64,
    risk_bucket: "medium",
    drawdown_tolerance_pct: 20,
    time_horizon_years: 10,
  },
  goals: [
    {
      title: "Child education fund",
      category: "child_education",
      target_amount_inr: 3500000,
      target_date: "2034-06-30",
      priority: "high",
    },
    {
      title: "Retirement corpus",
      category: "retirement",
      target_amount_inr: 25000000,
      target_date: "2047-03-31",
      priority: "medium",
    },
  ],
  latestTaxProfile: {
    financial_year: "2025-26",
    tax_regime: "old",
    annual_taxable_income_inr: 1900000,
    section_80c_used_inr: 85000,
    section_80d_used_inr: 20000,
    home_loan_interest_inr: 0,
    capital_gains_short_term_inr: 0,
    capital_gains_long_term_inr: 30000,
  },
  communicationPreferences: {
    preferred_channel: "whatsapp",
    phone_e164: "+919876543210",
    email: "riya@example.com",
    whatsapp_opt_in: true,
    email_opt_in: true,
    push_opt_in: false,
    quiet_hours_start: "22:00",
    quiet_hours_end: "07:00",
    timezone: "Asia/Kolkata",
  },
  holdings: [
    {
      instrument_symbol: "NIFTYBEES",
      instrument_name: "Nippon India ETF Nifty BeES",
      asset_class: "equity",
      sector: "diversified",
      quantity: 220,
      average_buy_price_inr: 215,
      current_price_inr: 248,
    },
    {
      instrument_symbol: "GOLDBEES",
      instrument_name: "Nippon India ETF Gold BeES",
      asset_class: "gold",
      sector: "commodity",
      quantity: 100,
      average_buy_price_inr: 48,
      current_price_inr: 61,
    },
  ],
  enabledAlertsCount: 3,
};

describe("buildContextBlock personalization", () => {
  it("includes onboarding profile, holdings summary, and personalization anchor", () => {
    const block = buildContextBlock(baseContext);
    const parsed = JSON.parse(block) as Record<string, unknown>;

    expect(parsed.personalizationAnchor).toBeTypeOf("string");

    const onboardingProfile = parsed.onboardingProfile as Record<string, unknown>;
    expect(onboardingProfile.employment_type).toBe("salaried");
    expect(onboardingProfile.monthly_emi_inr).toBe(18000);

    const holdingsSummary = parsed.holdingsSummary as Record<string, unknown>;
    expect(holdingsSummary.totalHoldings).toBe(2);

    const topHoldings = holdingsSummary.topHoldings as Array<Record<string, unknown>>;
    expect(topHoldings[0]?.symbol).toBe("NIFTYBEES");

    const goalsSummary = parsed.goalsSummary as Record<string, unknown>;
    expect(goalsSummary.totalGoals).toBe(2);
  });

  it("changes context block for different users", () => {
    const firstBlock = buildContextBlock(baseContext);

    const secondContext: AgentContext = {
      ...baseContext,
      profile: {
        ...baseContext.profile,
        full_name: "Arjun Rao",
        risk_appetite: "aggressive",
        monthly_investable_surplus_inr: 120000,
        employment_type: "business_owner",
      },
      latestRiskAssessment: {
        ...baseContext.latestRiskAssessment,
        risk_bucket: "high",
      },
      goals: [
        {
          title: "Second home purchase",
          category: "home_purchase",
          target_amount_inr: 12000000,
          target_date: "2030-12-31",
          priority: "high",
        },
      ],
      holdings: [
        {
          instrument_symbol: "BANKETF",
          instrument_name: "Bank ETF",
          asset_class: "equity",
          sector: "banking",
          quantity: 700,
          average_buy_price_inr: 49,
          current_price_inr: 55,
        },
      ],
    };

    const secondBlock = buildContextBlock(secondContext);

    expect(secondBlock).not.toEqual(firstBlock);

    const firstParsed = JSON.parse(firstBlock) as Record<string, unknown>;
    const secondParsed = JSON.parse(secondBlock) as Record<string, unknown>;

    expect(firstParsed.personalizationAnchor).not.toEqual(secondParsed.personalizationAnchor);
  });
});
