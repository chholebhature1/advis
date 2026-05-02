import { NextResponse } from "next/server";
import { createAuthedSupabaseClient, getBearerToken, resolveAuthedUser } from "@/lib/agent/server";
import { loadAgentContext } from "@/lib/agent/context";
import { generateDashboardActionPlanV2 } from "@/lib/agent/nim";
import { generateFinancialSnapshot } from "@/lib/agent/financial-engine";
import { generateExplanation } from "@/lib/agent/explanation-layer";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const debug = new URL(request.url).searchParams.get("debug") === "true";
    const accessToken = getBearerToken(request);
    if (!accessToken) {
      return NextResponse.json({ error: "Missing bearer token." }, { status: 401 });
    }

    const supabase = createAuthedSupabaseClient(accessToken);
    const user = await resolveAuthedUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized request." }, { status: 401 });
    }

    const context = await loadAgentContext(supabase, user.id, debug);
    const snapshot = generateFinancialSnapshot(context, debug);
    const [explanation, aiSummary] = await Promise.all([
      generateExplanation(snapshot, context.profile),
      generateDashboardActionPlanV2({ snapshot }),
    ]);

    // PRODUCTION LOGGING
    console.log(`[AGENT] DASHBOARD_SNAPSHOT_GENERATED: ${snapshot.decision.feasibility}`);

    // Return both AI explanation and deterministic snapshot data
    // Include engine/explanation version stamps for runtime verification
    const explanationWithVersion = { ...explanation, version: "v2-explanation" };

    return NextResponse.json(
      {
        ok: true,
        aiSummary,
        explanation: explanationWithVersion,
        engineVersion: "v2-final",
        sipOriginal: snapshot.sipOriginal,
        sipUsed: snapshot.sipUsed,
        maxAllowedSip: snapshot.maxAllowedSip,
        isOverLimit: snapshot.isOverLimit,
        utilizationPercent: snapshot.utilizationPercent,
        requiredSip: snapshot.requiredSip,
        projectedCorpus: snapshot.projectedCorpus,
        gapAmount: snapshot.gapAmount,
        decision: snapshot.decision,
        feasibility: snapshot.feasibility,
        allocation: snapshot.allocation,
        goal: snapshot.goal,
        userProfile: snapshot.userProfile,
        goalIntent: snapshot.goalIntent,
        constraints: snapshot.constraints,
        snapshot: {
          goal: snapshot.goal,
          feasibility: snapshot.feasibility,
          userProfile: snapshot.userProfile,
          sipOriginal: snapshot.sipOriginal,
          sipUsed: snapshot.sipUsed,
          maxAllowedSip: snapshot.maxAllowedSip,
          isOverLimit: snapshot.isOverLimit,
          utilizationPercent: snapshot.utilizationPercent,
          utilization: snapshot.utilization,
          requiredSip: snapshot.requiredSip,
          projectedCorpus: snapshot.projectedCorpus,
          gapAmount: snapshot.gapAmount,
          goalDeltaPercent: snapshot.goalDeltaPercent,
          allocation: snapshot.allocation,
          goalIntent: snapshot.goalIntent,
          constraints: snapshot.constraints,
          strategyOptions: snapshot.strategyOptions,
          warnings: snapshot.warnings,
          recommendations: snapshot.recommendations,
          // Advisor-quality fields
          timeHorizon: snapshot.timeHorizon,
          expectedReturn: snapshot.expectedReturn,
          scenarioOutcomes: snapshot.scenarioOutcomes,
          actualOutcome: snapshot.actualOutcome,
          gapStrategies: snapshot.gapStrategies,
          stepUpSuggestion: snapshot.stepUpSuggestion,
          // Phase 1 & 10
          utilizationInsight: snapshot.utilizationInsight,
          actionPlan: snapshot.actionPlan,
          // Phase 5 & 11
          milestoneRoadmap: snapshot.milestoneRoadmap,
          behavioralProfile: snapshot.behavioralProfile,
          // Decision layer - single source of truth
          decision: snapshot.decision,
        },
        disclaimer:
          "Generated for educational planning support. Review with a qualified advisor before implementation.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("DASHBOARD ROUTE ERROR:", error);
    const message = error instanceof Error ? error.message : "Unexpected dashboard insight error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
