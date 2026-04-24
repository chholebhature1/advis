import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/agent/server";
import { cancelBookingReminderEmail, getBookingReminderEmailId, getBookingReminderExtraEmailIds, cancelBookingReminderEmails } from "@/lib/booking/notifications";
import { BookingValidationError, isRecord, parseEmail, parseOptionalString } from "@/lib/booking/validation";

export const runtime = "nodejs";

type CancelBody = {
  leadEmail?: unknown;
  reason?: unknown;
};

function classifyCancelError(error: Error): { status: number; message: string } {
  const lower = error.message.toLowerCase();

  if (lower.includes("meeting not found")) {
    return { status: 404, message: "Meeting not found." };
  }

  if (lower.includes("leademail does not match")) {
    return { status: 403, message: "leadEmail does not match this meeting." };
  }

  if (lower.includes("cannot be cancelled")) {
    return { status: 409, message: "This meeting can no longer be cancelled." };
  }

  if (lower.includes("invalid input") || lower.includes("violates")) {
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

    const raw = (await request.json()) as CancelBody;
    if (!isRecord(raw)) {
      throw new BookingValidationError("Request body must be an object.");
    }

    const leadEmail = parseEmail(raw.leadEmail, "leadEmail");
    const reason = parseOptionalString(raw.reason, "reason", { maxLength: 500 }) ?? "Cancelled by user request";

    const supabase = createServerSupabaseClient();

    const rpcResult = await supabase.rpc("public_cancel_booking_slot", {
      p_booking_id: id,
      p_lead_email: leadEmail,
      p_reason: reason,
    });

    if (rpcResult.error) {
      const classified = classifyCancelError(new Error(rpcResult.error.message));
      return NextResponse.json({ error: classified.message }, { status: classified.status });
    }

    const bookingRow = (rpcResult.data ?? null) as Record<string, unknown> | null;
    const leadReminderId = getBookingReminderEmailId(bookingRow);
    const extraReminderIds = getBookingReminderExtraEmailIds(bookingRow);

    if (leadReminderId) {
      try {
        await cancelBookingReminderEmail(leadReminderId);
      } catch (reminderError) {
        console.error("Booking reminder cancel synchronization failed for lead.", reminderError);
      }
    }

    if (Array.isArray(extraReminderIds) && extraReminderIds.length > 0) {
      try {
        await cancelBookingReminderEmails(extraReminderIds);
      } catch (extraCancelError) {
        console.error("Booking reminder cancel synchronization failed for extras.", extraCancelError);
      }
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

    const message = error instanceof Error ? error.message : "Unexpected booking cancel error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
