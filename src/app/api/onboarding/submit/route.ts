import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type SubmitBody = {
  sessionId?: unknown;
  answers?: unknown;
};

function getSupabaseServerCredentials() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  return { supabaseUrl, supabasePublishableKey };
}

function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const accessToken = getBearerToken(request);
    if (!accessToken) {
      return NextResponse.json({ error: "Missing bearer token." }, { status: 401 });
    }

    const body = (await request.json()) as SubmitBody;
    if (typeof body.sessionId !== "string" || body.sessionId.trim().length === 0) {
      return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
    }

    if (!isRecord(body.answers)) {
      return NextResponse.json({ error: "answers must be an object." }, { status: 400 });
    }

    const answers = body.answers;

    const { supabaseUrl, supabasePublishableKey } = getSupabaseServerCredentials();
    const supabase = createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "Unauthorized request." }, { status: 401 });
    }

    const { data, error } = await supabase.rpc("submit_onboarding_payload", {
      p_session_id: body.sessionId,
      p_payload: answers,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, result: data }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected onboarding submit error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
