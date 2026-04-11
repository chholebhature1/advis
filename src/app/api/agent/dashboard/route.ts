import { NextResponse } from "next/server";
import { createAuthedSupabaseClient, getBearerToken, resolveAuthedUser } from "@/lib/agent/server";
import { loadAgentContext } from "@/lib/agent/context";
import { generateDashboardActionPlan } from "@/lib/agent/nim";

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
    const aiSummary = await generateDashboardActionPlan(context);

    return NextResponse.json(
      {
        ok: true,
        aiSummary,
        disclaimer:
          "Generated for educational planning support. Review with a qualified advisor before implementation.",
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected dashboard insight error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
