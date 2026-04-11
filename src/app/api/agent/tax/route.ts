import { NextResponse } from "next/server";
import { loadAgentContext } from "@/lib/agent/context";
import { createAuthedSupabaseClient, getBearerToken, resolveAuthedUser } from "@/lib/agent/server";
import { buildTaxOptimizationSummary } from "@/lib/agent/tax-optimization";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const accessToken = getBearerToken(request);
    if (!accessToken) {
      return NextResponse.json({ error: "Missing bearer token." }, { status: 401 });
    }

    const supabase = createAuthedSupabaseClient(accessToken);
    const user = await resolveAuthedUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized request." }, { status: 401 });
    }

    const context = await loadAgentContext(supabase, user.id);
    const summary = buildTaxOptimizationSummary({
      taxRegime: context.latestTaxProfile?.tax_regime ?? context.profile?.tax_regime ?? null,
      annualTaxableIncomeInr: context.latestTaxProfile?.annual_taxable_income_inr ?? 0,
      section80cUsedInr: context.latestTaxProfile?.section_80c_used_inr ?? 0,
      section80dUsedInr: context.latestTaxProfile?.section_80d_used_inr ?? 0,
      homeLoanInterestInr: context.latestTaxProfile?.home_loan_interest_inr ?? 0,
      monthlyInvestableSurplusInr: context.profile?.monthly_investable_surplus_inr ?? 0,
      capitalGainsShortTermInr: context.latestTaxProfile?.capital_gains_short_term_inr ?? 0,
      capitalGainsLongTermInr: context.latestTaxProfile?.capital_gains_long_term_inr ?? 0,
      financialYear: context.latestTaxProfile?.financial_year ?? null,
    });

    return NextResponse.json({ ok: true, summary }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected tax assistant error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
