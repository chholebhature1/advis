import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AgentCommunicationSnapshot,
  AgentContext,
  AgentGoalSnapshot,
  AgentHoldingSnapshot,
  AgentProfileSnapshot,
  AgentReadiness,
  AgentRiskSnapshot,
  AgentTaxSnapshot,
} from "@/lib/agent/types";

const CONTEXT_CACHE_TTL_MS = 15_000;

type CachedAgentContext = {
  context: AgentContext;
  expiresAt: number;
};

const contextCache = new Map<string, CachedAgentContext>();
const inFlightContextLoads = new Map<string, Promise<AgentContext>>();

function getFreshCachedContext(userId: string): AgentContext | null {
  const cached = contextCache.get(userId);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    contextCache.delete(userId);
    return null;
  }

  return cached.context;
}

function storeCachedContext(userId: string, context: AgentContext) {
  contextCache.set(userId, {
    context,
    expiresAt: Date.now() + CONTEXT_CACHE_TTL_MS,
  });
}

export async function loadAgentContext(supabase: SupabaseClient, userId: string): Promise<AgentContext> {
  const cached = getFreshCachedContext(userId);
  if (cached) {
    return cached;
  }

  const existingInFlight = inFlightContextLoads.get(userId);
  if (existingInFlight) {
    return existingInFlight;
  }

  const loadPromise = (async () => {
    const profileQuery = supabase
      .from("profiles")
      .select(
        "full_name,email,phone_e164,date_of_birth,city,state,country_code,tax_residency_country,occupation_title,employment_type,monthly_income_inr,monthly_expenses_inr,monthly_emi_inr,monthly_investable_surplus_inr,current_savings_inr,emergency_fund_months,loss_tolerance_pct,liquidity_needs_notes,risk_appetite,target_horizon_years,tax_regime,kyc_status,onboarding_completed_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const riskQuery = supabase
      .from("risk_assessments")
      .select("risk_score,risk_bucket,drawdown_tolerance_pct,time_horizon_years")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const goalsQuery = supabase
      .from("financial_goals")
      .select("title,category,target_amount_inr,target_date,priority")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(8);

    const taxQuery = supabase
      .from("tax_profiles")
      .select(
        "financial_year,tax_regime,annual_taxable_income_inr,section_80c_used_inr,section_80d_used_inr,home_loan_interest_inr,capital_gains_short_term_inr,capital_gains_long_term_inr",
      )
      .eq("user_id", userId)
      .order("financial_year", { ascending: false })
      .limit(1)
      .maybeSingle();

    const communicationQuery = supabase
      .from("communication_preferences")
      .select("preferred_channel,phone_e164,email,whatsapp_opt_in,email_opt_in,push_opt_in,quiet_hours_start,quiet_hours_end,timezone")
      .eq("user_id", userId)
      .maybeSingle();

    const holdingsQuery = supabase
      .from("portfolio_holdings")
      .select("instrument_symbol,instrument_name,asset_class,sector,quantity,average_buy_price_inr,current_price_inr")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    const alertsQuery = supabase
      .from("alert_preferences")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("enabled", true);

    const [profileResult, riskResult, goalsResult, taxResult, communicationResult, holdingsResult, alertsResult] =
      await Promise.all([
        profileQuery,
        riskQuery,
        goalsQuery,
        taxQuery,
        communicationQuery,
        holdingsQuery,
        alertsQuery,
      ]);

    if (profileResult.error) {
      throw profileResult.error;
    }

    if (riskResult.error) {
      throw riskResult.error;
    }

    if (goalsResult.error) {
      throw goalsResult.error;
    }

    if (taxResult.error) {
      throw taxResult.error;
    }

    if (communicationResult.error) {
      throw communicationResult.error;
    }

    if (holdingsResult.error) {
      throw holdingsResult.error;
    }

    if (alertsResult.error) {
      throw alertsResult.error;
    }

    const context: AgentContext = {
      profile: (profileResult.data ?? null) as AgentProfileSnapshot | null,
      latestRiskAssessment: (riskResult.data ?? null) as AgentRiskSnapshot | null,
      goals: (goalsResult.data ?? []) as AgentGoalSnapshot[],
      latestTaxProfile: (taxResult.data ?? null) as AgentTaxSnapshot | null,
      communicationPreferences: (communicationResult.data ?? null) as AgentCommunicationSnapshot | null,
      holdings: (holdingsResult.data ?? []) as AgentHoldingSnapshot[],
      enabledAlertsCount: alertsResult.count ?? 0,
    };

    storeCachedContext(userId, context);
    return context;
  })();

  inFlightContextLoads.set(userId, loadPromise);

  try {
    return await loadPromise;
  } finally {
    inFlightContextLoads.delete(userId);
  }
}

export function getAgentReadiness(context: AgentContext): AgentReadiness {
  return {
    hasProfile: context.profile !== null,
    hasRiskAssessment: context.latestRiskAssessment !== null,
    hasGoals: context.goals.length > 0,
    hasTaxProfile: context.latestTaxProfile !== null,
    hasHoldings: context.holdings.length > 0,
  };
}
