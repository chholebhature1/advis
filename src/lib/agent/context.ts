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
import {
  normalizeBands,
  resolveHorizonBand,
  resolveIncomeBand,
  resolveMonthlyCapacityBand,
  resolveTargetAmount,
} from "./band-resolver";
import { validateProfileSchema, ensureProfileValid } from "./schema-validation";

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

export async function loadAgentContext(supabase: SupabaseClient, userId: string, debug = false): Promise<AgentContext> {
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
      .select("*")
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

    const rawProfile = (profileResult.data ?? null) as AgentProfileSnapshot | null;
    // Debug logging available for profile verification if needed
    // if (debug) { console.log("RAW PROFILE", rawProfile, {...}); }

    // SCHEMA VALIDATION: Check for missing fields before processing
    const schemaValidation = validateProfileSchema(rawProfile);
    // Schema validation logging available for debugging if needed
    // if (debug || schemaValidation.warnings.length > 0) {
    //   console.log("SCHEMA VALIDATION", {...});
    // }

    const dataQuality = {
      hasFallbacks: !schemaValidation.isValid,
      missingFields: schemaValidation.missingFields,
      confidence: schemaValidation.defaultedFields.includes("income_input_type")
        ? "low"
        : schemaValidation.fallbackCount > 0
          ? "medium"
          : "high",
      fallbackCount: schemaValidation.fallbackCount,
      defaultedFields: schemaValidation.defaultedFields,
    } as const;

    const rawContext: AgentContext = {
      profile: rawProfile,
      latestRiskAssessment: (riskResult.data ?? null) as AgentRiskSnapshot | null,
      goals: (goalsResult.data ?? []) as AgentGoalSnapshot[],
      communicationPreferences: (communicationResult.data ?? null) as AgentCommunicationSnapshot | null,
      holdings: (holdingsResult.data ?? []) as AgentHoldingSnapshot[],
      dataQuality,
    };

    // Normalize band values to actual numbers for Financial Engine
    const context = normalizeBands(rawContext, debug);

    // TYPE GUARDS: Ensure all required fields are defined (not undefined)
    const safeContext: AgentContext = {
      ...context,
      profile: context.profile ? ensureProfileValid(context.profile) : null,
    };

    if (debug) {
      console.log("CONTEXT AFTER TYPE GUARDS", {
        profileValid: safeContext.profile !== null,
        incomeInputType: safeContext.profile?.income_input_type,
        incomeRangeMin: safeContext.profile?.income_range_min_inr,
        incomeRangeMax: safeContext.profile?.income_range_max_inr,
      });
    }

    storeCachedContext(userId, safeContext);
    return safeContext;
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

/**
 * Invalidate cached agent context for a user
 * Call this when profile, goals, or holdings are updated
 */
export function invalidateAgentContext(userId: string): void {
  contextCache.delete(userId);
}
