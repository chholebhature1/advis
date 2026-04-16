import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/agent/server";
import { BookingValidationError, parseDateKey, parsePositiveInteger, parseRequiredString } from "@/lib/booking/validation";

export const runtime = "nodejs";

const BOOKING_TEMPORARY_UNAVAILABLE_MESSAGE =
  "Discovery call booking is temporarily unavailable while server setup is being completed. Please use the email option below.";

function isBookingInfrastructureError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("SUPABASE_SERVICE_ROLE_KEY") ||
    error.message.includes("get_public_booking_availability") ||
    error.message.toLowerCase().includes("permission denied")
  );
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const rawAdvisorId = url.searchParams.get("advisorId");
    const rawFromDate = url.searchParams.get("from");
    const rawDays = url.searchParams.get("days");

    const advisorId = rawAdvisorId
      ? parseRequiredString(rawAdvisorId, "advisorId", { minLength: 8, maxLength: 64 })
      : undefined;
    const fromDateKey = rawFromDate ? parseDateKey(rawFromDate, "from") : undefined;
    const days = rawDays ? parsePositiveInteger(rawDays, "days", { min: 1, max: 30 }) : undefined;

    const supabase = createServerSupabaseClient();
    const rpcArgs: Record<string, unknown> = {};

    if (advisorId) {
      rpcArgs.p_advisor_id = advisorId;
    }

    if (fromDateKey) {
      rpcArgs.p_from_date = fromDateKey;
    }

    if (typeof days === "number") {
      rpcArgs.p_days = days;
    }

    const rpcResult = await supabase.rpc("get_public_booking_availability", rpcArgs);

    if (rpcResult.error) {
      throw new Error(rpcResult.error.message);
    }

    const availability = rpcResult.data;

    return NextResponse.json(
      {
        ok: true,
        availability,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof BookingValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (isBookingInfrastructureError(error)) {
      return NextResponse.json({ error: BOOKING_TEMPORARY_UNAVAILABLE_MESSAGE }, { status: 503 });
    }

    const message = error instanceof Error ? error.message : "Unexpected availability error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
