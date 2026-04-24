import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AgentCommunicationSnapshot,
  AgentContext,
  AgentGoalSnapshot,
  AgentHoldingSnapshot,
  AgentProfileSnapshot,
  AgentReadiness,
  AgentRiskSnapshot,
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
        "full_name,email,phone_e164,date_of_birth,city,state,country_code,tax_residency_country,occupation_title,employment_type,monthly_income_inr,monthly_expenses_inr,monthly_emi_inr,monthly_investable_surplus_inr,current_savings_inr,emergency_fund_months,loss_tolerance_pct,liquidity_needs_notes,risk_appetite,target_horizon_years,tax_regime,kyc_status,onboarding_completed_at,primary_financial_goal,target_goal_horizon_band,monthly_investment_capacity_band,monthly_income_band,has_existing_investments,existing_investment_types",
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

    const [profileResult, riskResult, goalsResult, communicationResult, holdingsResult] =
      await Promise.all([
        profileQuery,
        riskQuery,
        goalsQuery,
        communicationQuery,
        holdingsQuery,
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

    if (communicationResult.error) {
      throw communicationResult.error;
    }

    if (holdingsResult.error) {
      throw holdingsResult.error;
    }

    const context: AgentContext = {
      profile: (profileResult.data ?? null) as AgentProfileSnapshot | null,
      latestRiskAssessment: (riskResult.data ?? null) as AgentRiskSnapshot | null,
      goals: (goalsResult.data ?? []) as AgentGoalSnapshot[],
      communicationPreferences: (communicationResult.data ?? null) as AgentCommunicationSnapshot | null,
      holdings: (holdingsResult.data ?? []) as AgentHoldingSnapshot[],
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
    hasHoldings: context.holdings.length > 0,
  };
}
