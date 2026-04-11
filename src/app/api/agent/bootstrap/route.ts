import { NextResponse } from "next/server";
import { createAuthedSupabaseClient, getBearerToken, resolveAuthedUser } from "@/lib/agent/server";
import { getAgentReadiness, loadAgentContext } from "@/lib/agent/context";

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
    const readiness = getAgentReadiness(context);

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
        profileSnapshot: {
          riskAppetite: context.profile?.risk_appetite ?? null,
          monthlyInvestableSurplusInr: context.profile?.monthly_investable_surplus_inr ?? null,
          goalsCount: context.goals.length,
          holdingsCount: context.holdings.length,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected bootstrap error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
