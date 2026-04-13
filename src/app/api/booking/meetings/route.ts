import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/agent/server";
import {
  BookingValidationError,
  isRecord,
  parseEmail,
  parseIsoDateTime,
  parseOptionalIsoDateTime,
  parseOptionalPhoneE164,
  parseOptionalString,
  parseRequiredString,
} from "@/lib/booking/validation";

export const runtime = "nodejs";

type AdvisorRow = {
  id: string;
  meeting_duration_mins: number;
};

type BookingPostBody = {
  advisorId?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
  leadName?: unknown;
  leadEmail?: unknown;
  leadPhoneE164?: unknown;
  notes?: unknown;
  timezone?: unknown;
  source?: unknown;
  metadata?: unknown;
};

function parseSource(value: unknown): string {
  const source = parseOptionalString(value, "source", { maxLength: 80 });
  return source ?? "website";
}

function parseMetadata(value: unknown): Record<string, unknown> {
  if (value === undefined || value === null) {
    return {};
  }

  if (!isRecord(value)) {
    throw new BookingValidationError("metadata must be an object.");
  }

  return value;
}

function parseAdvisorId(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  return parseRequiredString(value, "advisorId", { minLength: 8, maxLength: 64 });
}

async function resolveAdvisor(advisorId: string | null): Promise<AdvisorRow> {
  const supabase = createServiceSupabaseClient();

  const baseQuery = supabase
    .from("booking_advisors")
    .select("id,meeting_duration_mins")
    .eq("is_active", true);

  const result = advisorId
    ? await baseQuery.eq("id", advisorId).maybeSingle()
    : await baseQuery.order("created_at", { ascending: true }).limit(1).maybeSingle();

  if (result.error) {
    throw result.error;
  }

  const advisor = (result.data ?? null) as AdvisorRow | null;

  if (!advisor) {
    throw new BookingValidationError("No active booking advisor configured.", 404);
  }

  return advisor;
}

function classifyBookingRpcError(error: Error): { status: number; message: string } {
  const lower = error.message.toLowerCase();

  if (lower.includes("booking_meetings_no_overlap") || lower.includes("conflicting key value")) {
    return { status: 409, message: "This time slot is no longer available. Please choose another slot." };
  }

  if (lower.includes("meeting end time") || lower.includes("invalid input") || lower.includes("violates")) {
    return { status: 400, message: error.message };
  }

  return { status: 500, message: error.message };
}

export async function POST(request: Request) {
  try {
    const raw = (await request.json()) as BookingPostBody;

    if (!isRecord(raw)) {
      throw new BookingValidationError("Request body must be an object.");
    }

    const advisorId = parseAdvisorId(raw.advisorId);
    const startsAtIso = parseIsoDateTime(raw.startsAt, "startsAt");
    const endsAtFromBody = parseOptionalIsoDateTime(raw.endsAt, "endsAt");

    const leadName = parseRequiredString(raw.leadName, "leadName", { minLength: 2, maxLength: 120 });
    const leadEmail = parseEmail(raw.leadEmail, "leadEmail");
    const leadPhoneE164 = parseOptionalPhoneE164(raw.leadPhoneE164, "leadPhoneE164");
    const notes = parseOptionalString(raw.notes, "notes", { maxLength: 2000 }) ?? "";
    const timezone = parseOptionalString(raw.timezone, "timezone", { maxLength: 120 }) ?? "Asia/Kolkata";
    const source = parseSource(raw.source);
    const metadata = parseMetadata(raw.metadata);

    const startDate = new Date(startsAtIso);
    const minBookable = Date.now() + 5 * 60 * 1000;

    if (startDate.getTime() < minBookable) {
      throw new BookingValidationError("Bookings must be scheduled at least 5 minutes in advance.");
    }

    const advisor = await resolveAdvisor(advisorId);

    const endsAtIso =
      endsAtFromBody ?? new Date(startDate.getTime() + advisor.meeting_duration_mins * 60 * 1000).toISOString();

    if (new Date(endsAtIso).getTime() <= startDate.getTime()) {
      throw new BookingValidationError("endsAt must be after startsAt.");
    }

    const supabase = createServiceSupabaseClient();

    const rpcResult = await supabase.rpc("book_meeting_slot", {
      p_advisor_id: advisor.id,
      p_lead_name: leadName,
      p_lead_email: leadEmail,
      p_lead_phone_e164: leadPhoneE164,
      p_notes: notes,
      p_timezone: timezone,
      p_starts_at: startsAtIso,
      p_ends_at: endsAtIso,
      p_source: source,
      p_metadata: metadata,
    });

    if (rpcResult.error) {
      const classified = classifyBookingRpcError(new Error(rpcResult.error.message));
      return NextResponse.json({ error: classified.message }, { status: classified.status });
    }

    const bookingRow = (rpcResult.data ?? null) as Record<string, unknown> | null;

    return NextResponse.json(
      {
        ok: true,
        booking: bookingRow,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof BookingValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Unexpected booking create error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
