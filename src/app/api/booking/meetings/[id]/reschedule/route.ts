import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/agent/server";
import {
  BookingValidationError,
  isRecord,
  parseEmail,
  parseIsoDateTime,
  parseOptionalIsoDateTime,
  parseOptionalString,
} from "@/lib/booking/validation";

export const runtime = "nodejs";

type BookingRow = {
  id: string;
  lead_email: string;
  starts_at: string;
  ends_at: string;
};

type RescheduleBody = {
  leadEmail?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
  reason?: unknown;
};

function classifyRescheduleError(error: Error): { status: number; message: string } {
  const lower = error.message.toLowerCase();

  if (lower.includes("booking_meetings_no_overlap") || lower.includes("conflicting key value")) {
    return { status: 409, message: "Selected slot overlaps with another booking. Please choose another time." };
  }

  if (lower.includes("cannot be rescheduled")) {
    return { status: 409, message: "This meeting can no longer be rescheduled." };
  }

  if (lower.includes("rescheduled end time") || lower.includes("invalid input") || lower.includes("violates")) {
    return { status: 400, message: error.message };
  }

  return { status: 500, message: error.message };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    if (!id || id.trim().length === 0) {
      throw new BookingValidationError("Meeting id is required.");
    }

    const raw = (await request.json()) as RescheduleBody;
    if (!isRecord(raw)) {
      throw new BookingValidationError("Request body must be an object.");
    }

    const leadEmail = parseEmail(raw.leadEmail, "leadEmail");
    const startsAtIso = parseIsoDateTime(raw.startsAt, "startsAt");
    const endsAtFromBody = parseOptionalIsoDateTime(raw.endsAt, "endsAt");
    const reason = parseOptionalString(raw.reason, "reason", { maxLength: 500 }) ?? "";

    const startDate = new Date(startsAtIso);
    if (startDate.getTime() < Date.now() + 5 * 60 * 1000) {
      throw new BookingValidationError("Reschedules must be at least 5 minutes in advance.");
    }

    const supabase = createServiceSupabaseClient();

    const bookingResult = await supabase
      .from("booking_meetings")
      .select("id,lead_email,starts_at,ends_at")
      .eq("id", id)
      .maybeSingle();

    if (bookingResult.error) {
      throw bookingResult.error;
    }

    const booking = (bookingResult.data ?? null) as BookingRow | null;

    if (!booking) {
      return NextResponse.json({ error: "Meeting not found." }, { status: 404 });
    }

    if (booking.lead_email.toLowerCase() !== leadEmail) {
      return NextResponse.json({ error: "leadEmail does not match this meeting." }, { status: 403 });
    }

    const currentDurationMs = Math.max(
      10 * 60 * 1000,
      new Date(booking.ends_at).getTime() - new Date(booking.starts_at).getTime(),
    );

    const endsAtIso = endsAtFromBody ?? new Date(startDate.getTime() + currentDurationMs).toISOString();

    if (new Date(endsAtIso).getTime() <= startDate.getTime()) {
      throw new BookingValidationError("endsAt must be after startsAt.");
    }

    const rpcResult = await supabase.rpc("reschedule_booking_slot", {
      p_booking_id: id,
      p_new_starts_at: startsAtIso,
      p_new_ends_at: endsAtIso,
      p_reason: reason,
    });

    if (rpcResult.error) {
      const classified = classifyRescheduleError(new Error(rpcResult.error.message));
      return NextResponse.json({ error: classified.message }, { status: classified.status });
    }

    const bookingRow = (rpcResult.data ?? null) as Record<string, unknown> | null;

    return NextResponse.json(
      {
        ok: true,
        booking: bookingRow,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof BookingValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Unexpected booking reschedule error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
