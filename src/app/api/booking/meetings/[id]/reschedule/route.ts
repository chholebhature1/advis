import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/agent/server";
import {
  getBookingReminderEmailId,
  rescheduleBookingReminderEmail,
  scheduleBookingReminderEmail,
} from "@/lib/booking/notifications";
import {
  BookingValidationError,
  isRecord,
  parseEmail,
  parseIsoDateTime,
  parseOptionalIsoDateTime,
  parseOptionalString,
} from "@/lib/booking/validation";

export const runtime = "nodejs";

type RescheduleBody = {
  leadEmail?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
  reason?: unknown;
};

function classifyRescheduleError(error: Error): { status: number; message: string } {
  const lower = error.message.toLowerCase();

  if (lower.includes("meeting not found")) {
    return { status: 404, message: "Meeting not found." };
  }

  if (lower.includes("leademail does not match")) {
    return { status: 403, message: "leadEmail does not match this meeting." };
  }

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

    const supabase = createServerSupabaseClient();

    const endsAtIso = endsAtFromBody ?? null;

    if (endsAtIso && new Date(endsAtIso).getTime() <= startDate.getTime()) {
      throw new BookingValidationError("endsAt must be after startsAt.");
    }

    const rpcResult = await supabase.rpc("public_reschedule_booking_slot", {
      p_booking_id: id,
      p_lead_email: leadEmail,
      p_new_starts_at: startsAtIso,
      p_new_ends_at: endsAtIso,
      p_reason: reason,
    });

    if (rpcResult.error) {
      const classified = classifyRescheduleError(new Error(rpcResult.error.message));
      return NextResponse.json({ error: classified.message }, { status: classified.status });
    }

    let bookingRow = (rpcResult.data ?? null) as Record<string, unknown> | null;
    const reminderEmailId = getBookingReminderEmailId(bookingRow);

    try {
      if (reminderEmailId) {
        await rescheduleBookingReminderEmail(reminderEmailId, startsAtIso);
      } else {
        const scheduledReminderEmailId = await scheduleBookingReminderEmail(bookingRow);
        if (scheduledReminderEmailId) {
          const reminderRpcResult = await supabase.rpc("public_set_booking_reminder_email_id", {
            p_booking_id: id,
            p_lead_email: leadEmail,
            p_reminder_email_id: scheduledReminderEmailId,
          });

          if (reminderRpcResult.error) {
            console.error("Failed to persist scheduled reminder email id on rescheduled booking metadata.", reminderRpcResult.error);
          } else {
            bookingRow = (reminderRpcResult.data ?? bookingRow) as Record<string, unknown> | null;
          }
        }
      }
    } catch (reminderError) {
      console.error("Booking reminder synchronization failed after reschedule.", reminderError);
    }

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
