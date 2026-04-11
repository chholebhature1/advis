import { afterEach, describe, expect, it, vi } from "vitest";
import type { AgentContext } from "@/lib/agent/types";
import { generateAdvisorChatReply } from "./nim";

const testContext: AgentContext = {
  profile: {
    full_name: "Ananya Patel",
    email: "ananya@example.com",
    phone_e164: "+919999999999",
    date_of_birth: "1994-02-10",
    city: "Ahmedabad",
    state: "Gujarat",
    country_code: "IN",
    tax_residency_country: "IN",
    occupation_title: "Software Engineer",
    employment_type: "salaried",
    monthly_income_inr: 150000,
    monthly_expenses_inr: 70000,
    monthly_emi_inr: 10000,
    monthly_investable_surplus_inr: 45000,
    current_savings_inr: 1800000,
    emergency_fund_months: 4,
    loss_tolerance_pct: 18,
    liquidity_needs_notes: "Need moderate liquidity in 18 months for family commitments.",
    risk_appetite: "moderate",
    target_horizon_years: 9,
    tax_regime: "new",
    kyc_status: "verified",
    onboarding_completed_at: "2026-04-01T09:00:00.000Z",
  },
  latestRiskAssessment: {
    risk_score: 61,
    risk_bucket: "medium",
    drawdown_tolerance_pct: 18,
    time_horizon_years: 9,
  },
  goals: [
    {
      title: "Home down payment",
      category: "home_purchase",
      target_amount_inr: 5000000,
      target_date: "2031-12-31",
      priority: "high",
    },
  ],
  latestTaxProfile: {
    financial_year: "2025-26",
    tax_regime: "new",
    annual_taxable_income_inr: 1600000,
    section_80c_used_inr: 60000,
    section_80d_used_inr: 15000,
    home_loan_interest_inr: 0,
    capital_gains_short_term_inr: 0,
    capital_gains_long_term_inr: 0,
  },
  communicationPreferences: {
    preferred_channel: "email",
    phone_e164: "+919999999999",
    email: "ananya@example.com",
    whatsapp_opt_in: true,
    email_opt_in: true,
    push_opt_in: true,
    quiet_hours_start: "23:00",
    quiet_hours_end: "07:00",
    timezone: "Asia/Kolkata",
  },
  holdings: [
    {
      instrument_symbol: "NIFTYETF",
      instrument_name: "Nifty ETF",
      asset_class: "equity",
      sector: "diversified",
      quantity: 100,
      average_buy_price_inr: 205,
      current_price_inr: 238,
    },
  ],
  enabledAlertsCount: 2,
};

describe("generateAdvisorChatReply personalization guard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("injects user-specific context when model output is generic", async () => {
    process.env.NVIDIA_NIM_API_KEY = "test-key";

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  recommendation: "Build a diversified SIP plan.",
                  reason: "Diversification can reduce risk over time.",
                  riskWarning: "Markets are volatile and returns are not guaranteed.",
                  nextAction: "Start one SIP this week and monitor monthly.",
                }),
              },
            },
          ],
        }),
      })) as typeof fetch,
    );

    const reply = await generateAdvisorChatReply({
      message: "How should I invest this month?",
      history: [],
      context: testContext,
    });

    expect(reply.structured.reason.toLowerCase()).toContain("ananya");
    expect(reply.structured.reason.toLowerCase()).toContain("monthly investable surplus");
    expect(reply.structured.reason.toLowerCase()).toContain("home down payment");
  });
});
