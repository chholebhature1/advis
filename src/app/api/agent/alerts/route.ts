import { NextResponse } from "next/server";
import { createAuthedSupabaseClient, getBearerToken, resolveAuthedUser } from "@/lib/agent/server";
import { dispatchSmartAlerts, evaluateSmartAlertsForUser } from "@/lib/agent/alerts";

export const runtime = "nodejs";

function shouldDispatch(request: Request): boolean {
  const url = new URL(request.url);
  return url.searchParams.get("dispatch") === "true";
}

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

    const evaluation = await evaluateSmartAlertsForUser(supabase, user.id);

    if (!shouldDispatch(request)) {
      return NextResponse.json(
        {
          ok: true,
          mode: "evaluate",
          ...evaluation,
        },
        { status: 200 },
      );
    }

    const dispatched = await dispatchSmartAlerts(supabase, evaluation);

    return NextResponse.json(
      {
        ok: true,
        mode: "dispatch",
        ...dispatched,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected smart alerts error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}