import { NextResponse } from "next/server";
import { getPublicAvailability } from "@/lib/booking/server";
import { BookingValidationError, parseDateKey, parsePositiveInteger, parseRequiredString } from "@/lib/booking/validation";

export const runtime = "nodejs";

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

    const availability = await getPublicAvailability({
      advisorId,
      fromDateKey,
      days,
    });

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

    const message = error instanceof Error ? error.message : "Unexpected availability error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
