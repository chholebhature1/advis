import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { invalidateAgentContext } from "@/lib/agent/context";

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

function yearsToLegacyHorizonBand(years: number): string {
  if (years <= 3) return "1_3_years";
  if (years <= 5) return "3_5_years";
  if (years <= 10) return "5_10_years";
  return "10_plus_years";
}

function horizonBandToYears(band: string | undefined): number | null {
  if (!band) return null;
  const normalized = band.toLowerCase();
  if (normalized === "1_3_years") return 2;
  if (normalized === "3_5_years") return 4;
  if (normalized === "5_10_years") return 8;
  if (normalized === "10_plus_years") return 12;
  return null;
}

function capacityToLegacyBand(amount: number): string {
  if (amount <= 0) return "not_sure";
  if (amount <= 10000) return "5000_10000";
  if (amount <= 25000) return "10000_25000";
  if (amount <= 50000) return "25000_50000";
  return "50000_plus";
}

function capacityBandToAmount(band: string | undefined): number | null {
  if (!band) return null;
  const normalized = band.toLowerCase();
  if (normalized === "5000_10000") return 7500;
  if (normalized === "10000_25000") return 17500;
  if (normalized === "25000_50000") return 37500;
  if (normalized === "50000_plus") return 75000;
  if (normalized === "not_sure") return 0;
  return null;
}

function incomeToLegacyBand(amount: number): string {
  if (amount <= 0) return "not_sure";
  if (amount < 25000) return "below_25000";
  if (amount <= 50000) return "25000_50000";
  if (amount <= 100000) return "50000_100000";
  if (amount <= 300000) return "100000_300000";
  return "300000_plus";
}

function incomeBandToAmount(band: string | undefined): number | null {
  if (!band) return null;
  const normalized = band.toLowerCase();
  if (normalized === "below_25000") return 20000;
  if (normalized === "25000_50000") return 37500;
  if (normalized === "50000_100000") return 75000;
  if (normalized === "100000_300000") return 200000;
  if (normalized === "300000_plus") return 350000;
  if (normalized === "not_sure") return 0;
  return null;
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

    const answers = { ...(body.answers as Record<string, unknown>) } as Record<string, unknown>;

    // Coerce common numeric onboarding keys to numbers when possible
    const coerceToNumber = (v: unknown): number | null => {
      if (v === null || v === undefined) return null;
      if (typeof v === "number" && Number.isFinite(v)) return v;
      if (typeof v === "string") {
        const trimmed = v.trim().replace(/,/g, "");
        if (trimmed === "") return null;
        const parsed = Number(trimmed);
        return Number.isFinite(parsed) ? parsed : null;
      }
      return null;
    };

    // Accept both snake_case and camelCase forms emitted by clients
    // Also accept conditional custom fields: time_horizon_custom_years, sip_custom_amount, income_custom_amount
    const monthlyIncome =
      coerceToNumber(
        answers.monthly_income_inr ??
          answers.monthlyIncomeInr ??
          answers.income_custom_amount ??
          answers.incomeCustomAmount,
      );
    const sipCapacity =
      coerceToNumber(
        answers.monthly_investable_surplus_inr ??
          answers.sip_capacity_inr ??
          answers.sipCapacityInr ??
          answers.sip_custom_amount ??
          answers.sipCustomAmount,
      );
    const horizonYears =
      coerceToNumber(
        answers.target_horizon_years ??
          answers.time_horizon_years ??
          answers.timeHorizonYears ??
          answers.time_horizon_custom_years ??
          answers.timeHorizonCustomYears,
      );

    // Raw band values if provided by client
    const horizonBandRaw = (answers.time_horizon_band ?? answers.target_goal_horizon_band ?? answers.timeHorizonBand) as string | undefined;
    const capacityBandRaw = (answers.monthly_investment_capacity_band ?? answers.monthlyInvestmentCapacityBand) as string | undefined;
    const incomeBandRaw = (answers.monthly_income_band ?? answers.monthlyIncomeBand) as string | undefined;

    // DEBUG LOG: Log extracted values before resolution
    console.log("[API Submit] Extracted raw values:", {
      monthlyIncome,
      sipCapacity,
      horizonYears,
      horizonBandRaw,
      capacityBandRaw,
      incomeBandRaw,
      income_custom_amount: answers.income_custom_amount,
      sip_custom_amount: answers.sip_custom_amount,
      time_horizon_custom_years: answers.time_horizon_custom_years,
    });

    // Horizon: numeric-first, band fallback. Always emit both numeric + canonical band when resolved.
    const resolvedHorizonYears = horizonYears !== null
      ? Math.round(horizonYears)
      : horizonBandToYears(horizonBandRaw);
    if (resolvedHorizonYears !== null) {
      answers.target_horizon_years = resolvedHorizonYears;
      answers.time_horizon_years = resolvedHorizonYears;
      answers.time_horizon_band = yearsToLegacyHorizonBand(resolvedHorizonYears);
    } else if (typeof horizonBandRaw === "string") {
      answers.time_horizon_band = String(horizonBandRaw).toLowerCase();
    }

    // SIP capacity: numeric-first, band fallback. Always emit both numeric + canonical band when resolved.
    const resolvedCapacity = sipCapacity !== null
      ? sipCapacity
      : capacityBandToAmount(capacityBandRaw);
    if (resolvedCapacity !== null) {
      answers.monthly_investable_surplus_inr = resolvedCapacity;
      answers.sip_capacity_inr = resolvedCapacity;
      answers.monthly_investment_capacity_band = capacityToLegacyBand(resolvedCapacity);
    } else if (typeof capacityBandRaw === "string") {
      answers.monthly_investment_capacity_band = String(capacityBandRaw).toLowerCase();
    }

    // Income: numeric-first, band fallback. Always emit both numeric + canonical band when resolved.
    const resolvedIncome = monthlyIncome !== null
      ? Math.round(monthlyIncome)
      : incomeBandToAmount(incomeBandRaw);
    if (resolvedIncome !== null) {
      answers.monthly_income_inr = resolvedIncome;
      answers.monthly_income_band = incomeToLegacyBand(resolvedIncome);
    } else if (typeof incomeBandRaw === "string") {
      answers.monthly_income_band = String(incomeBandRaw).toLowerCase();
    }

    // DEBUG LOG: Final resolved values before sending to RPC
    console.log("[API Submit] Final resolved values:", {
      monthly_income_inr: answers.monthly_income_inr,
      monthly_investable_surplus_inr: answers.monthly_investable_surplus_inr,
      target_horizon_years: answers.target_horizon_years,
      monthly_income_band: answers.monthly_income_band,
      monthly_investment_capacity_band: answers.monthly_investment_capacity_band,
      time_horizon_band: answers.time_horizon_band,
      phone_e164: answers.phone_e164,
    });

    // Phone validation (STRICT)
    const phone = answers.phone_e164;
    if (typeof phone === "string") {
      const phoneRegex = /^(\+91)?[6-9]\d{9}$/;
      if (!phoneRegex.test(phone)) {
        return NextResponse.json(
          { error: "Invalid mobile number. Please enter a valid 10-digit Indian mobile number." },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json({ error: "Mobile number is required." }, { status: 400 });
    }

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

    // Invalidate agent context cache to ensure fresh data on next AI interaction
    invalidateAgentContext(authData.user.id);

    return NextResponse.json({ ok: true, result: data }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected onboarding submit error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
