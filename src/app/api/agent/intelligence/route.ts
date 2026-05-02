import { NextResponse } from "next/server";
import { loadAgentContext } from "@/lib/agent/context";
import { buildDashboardIntelligence } from "@/lib/agent/intelligence";
import { generateFinancialSnapshot } from "@/lib/agent/financial-engine";
import { createAuthedSupabaseClient, getBearerToken, resolveAuthedUser } from "@/lib/agent/server";

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
    const financialSnapshot = generateFinancialSnapshot(context, debug);
    const intelligence = await buildDashboardIntelligence(financialSnapshot);

    return NextResponse.json({ ok: true, snapshot: intelligence }, { status: 200 });
  } catch (error) {
    console.error("INTELLIGENCE ROUTE ERROR:", error);
    const message = error instanceof Error ? error.message : "Unexpected intelligence error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
