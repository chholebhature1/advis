import { NextResponse } from "next/server";
import { createAuthedSupabaseClient, getBearerToken, resolveAuthedUser } from "@/lib/agent/server";
import { getAgentReadiness, loadAgentContext } from "@/lib/agent/context";
import { generateFinancialSnapshot } from "@/lib/agent/financial-engine";

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
    const readiness = getAgentReadiness(context);

    // Use snapshot for consistent data across all endpoints
    const firstName = context.profile?.full_name?.split(" ")[0] ?? "there";

    return NextResponse.json(
      {
        ok: true,
        greeting: `Hi ${firstName}, I can help you with SIP planning, risk-fit allocation, and tax-aware next steps.`,
        readiness,
        starterPrompts: [
          "Based on my profile, how should I allocate my monthly surplus?",
          "What are the top 3 actions I should take this month?",
          "How can I improve my tax efficiency this year?",
        ],
        snapshotPreview: {
          monthlySurplus: snapshot.feasibility.currentSip,
          requiredSip: snapshot.feasibility.requiredSip,
          goalFeasible: snapshot.feasibility.isFeasible,
          achievementProbability: snapshot.feasibility.achievementProbability,
          riskProfile: snapshot.userProfile.riskProfile,
          topAllocation: `${snapshot.allocation.equity}% equity / ${snapshot.allocation.debt}% debt`,
          holdingsCount: snapshot.holdingsAnalysis?.holdingsCount ?? 0,
          concentrationRisk: snapshot.holdingsAnalysis?.concentrationRisk ?? null,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected bootstrap error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
