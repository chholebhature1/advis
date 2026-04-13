import { NextResponse } from "next/server";
import {
  createAuthedSupabaseClient,
  getBearerToken,
  resolveAuthedUser,
} from "@/lib/agent/server";
import {
  BookingValidationError,
  isRecord,
  parseBoolean,
  parseEmail,
  parseIsoDateTime,
  parseOptionalString,
  parsePositiveInteger,
  parseRequiredString,
} from "@/lib/booking/validation";

export const runtime = "nodejs";

type AdvisorRow = {
  id: string;
  user_id: string | null;
  display_name: string;
  email: string;
  timezone: string;
  is_active: boolean;
  meeting_duration_mins: number;
  buffer_before_mins: number;
  buffer_after_mins: number;
  created_at: string;
  updated_at: string;
};

type RuleRow = {
  id: string;
  advisor_id: string;
  day_of_week: number;
  start_minute: number;
  end_minute: number;
  slot_duration_mins: number;
  is_active: boolean;
};

type TimeOffRow = {
  id: string;
  advisor_id: string;
  starts_at: string;
  ends_at: string;
  reason: string;
};

type AdvisorUpdateInput = {
  displayName?: unknown;
  email?: unknown;
  timezone?: unknown;
  isActive?: unknown;
  meetingDurationMins?: unknown;
  bufferBeforeMins?: unknown;
  bufferAfterMins?: unknown;
};

type RuleInput = {
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
  slotDurationMins: number;
  isActive: boolean;
};

type TimeOffInput = {
  startsAt: string;
  endsAt: string;
  reason: string;
};

type PutBody = {
  advisor?: unknown;
  rules?: unknown;
  timeOff?: unknown;
};

function normalizeAdvisor(row: AdvisorRow) {
  return {
    id: row.id,
    userId: row.user_id,
    displayName: row.display_name,
    email: row.email,
    timezone: row.timezone,
    isActive: row.is_active,
    meetingDurationMins: row.meeting_duration_mins,
    bufferBeforeMins: row.buffer_before_mins,
    bufferAfterMins: row.buffer_after_mins,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeRule(row: RuleRow) {
  return {
    id: row.id,
    advisorId: row.advisor_id,
    dayOfWeek: row.day_of_week,
    startMinute: row.start_minute,
    endMinute: row.end_minute,
    slotDurationMins: row.slot_duration_mins,
    isActive: row.is_active,
  };
}

function normalizeTimeOff(row: TimeOffRow) {
  return {
    id: row.id,
    advisorId: row.advisor_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    reason: row.reason,
  };
}

function parseAdvisorUpdate(value: unknown): Record<string, string | number | boolean> {
  if (value === undefined || value === null) {
    return {};
  }

  if (!isRecord(value)) {
    throw new BookingValidationError("advisor must be an object.");
  }

  const input = value as AdvisorUpdateInput;
  const payload: Record<string, string | number | boolean> = {};

  if (input.displayName !== undefined) {
    payload.display_name = parseRequiredString(input.displayName, "advisor.displayName", {
      minLength: 2,
      maxLength: 120,
    });
  }

  if (input.email !== undefined) {
    payload.email = parseEmail(input.email, "advisor.email");
  }

  if (input.timezone !== undefined) {
    payload.timezone = parseRequiredString(input.timezone, "advisor.timezone", { minLength: 2, maxLength: 120 });
  }

  if (input.isActive !== undefined) {
    payload.is_active = parseBoolean(input.isActive, "advisor.isActive");
  }

  if (input.meetingDurationMins !== undefined) {
    payload.meeting_duration_mins = parsePositiveInteger(input.meetingDurationMins, "advisor.meetingDurationMins", {
      min: 10,
      max: 180,
    });
  }

  if (input.bufferBeforeMins !== undefined) {
    payload.buffer_before_mins = parsePositiveInteger(input.bufferBeforeMins, "advisor.bufferBeforeMins", {
      min: 0,
      max: 60,
    });
  }

  if (input.bufferAfterMins !== undefined) {
    payload.buffer_after_mins = parsePositiveInteger(input.bufferAfterMins, "advisor.bufferAfterMins", {
      min: 0,
      max: 60,
    });
  }

  return payload;
}

function parseRules(value: unknown): RuleInput[] {
  if (!Array.isArray(value)) {
    throw new BookingValidationError("rules must be an array.");
  }

  const rules: RuleInput[] = [];

  value.forEach((item, index) => {
    if (!isRecord(item)) {
      throw new BookingValidationError(`rules[${index}] must be an object.`);
    }

    const dayOfWeek = parsePositiveInteger(item.dayOfWeek, `rules[${index}].dayOfWeek`, { min: 0, max: 6 });
    const startMinute = parsePositiveInteger(item.startMinute, `rules[${index}].startMinute`, { min: 0, max: 1439 });
    const endMinute = parsePositiveInteger(item.endMinute, `rules[${index}].endMinute`, { min: 1, max: 1440 });

    if (endMinute <= startMinute) {
      throw new BookingValidationError(`rules[${index}].endMinute must be greater than startMinute.`);
    }

    const slotDurationMins =
      item.slotDurationMins === undefined
        ? 30
        : parsePositiveInteger(item.slotDurationMins, `rules[${index}].slotDurationMins`, { min: 10, max: 180 });

    const isActive = item.isActive === undefined ? true : parseBoolean(item.isActive, `rules[${index}].isActive`);

    rules.push({
      dayOfWeek,
      startMinute,
      endMinute,
      slotDurationMins,
      isActive,
    });
  });

  return rules;
}

function parseTimeOff(value: unknown): TimeOffInput[] {
  if (!Array.isArray(value)) {
    throw new BookingValidationError("timeOff must be an array.");
  }

  const windows: TimeOffInput[] = [];

  value.forEach((item, index) => {
    if (!isRecord(item)) {
      throw new BookingValidationError(`timeOff[${index}] must be an object.`);
    }

    const startsAt = parseIsoDateTime(item.startsAt, `timeOff[${index}].startsAt`);
    const endsAt = parseIsoDateTime(item.endsAt, `timeOff[${index}].endsAt`);

    if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      throw new BookingValidationError(`timeOff[${index}].endsAt must be after startsAt.`);
    }

    const reason = parseOptionalString(item.reason, `timeOff[${index}].reason`, { maxLength: 500 }) ?? "";

    windows.push({
      startsAt,
      endsAt,
      reason,
    });
  });

  return windows;
}

async function getAuthedContext(request: Request) {
  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return { supabase: null, userId: null, userEmail: null };
  }

  const supabase = createAuthedSupabaseClient(accessToken);
  const user = await resolveAuthedUser(supabase);

  if (!user) {
    return { supabase: null, userId: null, userEmail: null };
  }

  return {
    supabase,
    userId: user.id,
    userEmail: user.email ?? null,
  };
}

async function loadAdvisorSnapshot(
  supabase: ReturnType<typeof createAuthedSupabaseClient>,
  userId: string,
) {
  const advisorResult = await supabase
    .from("booking_advisors")
    .select(
      "id,user_id,display_name,email,timezone,is_active,meeting_duration_mins,buffer_before_mins,buffer_after_mins,created_at,updated_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (advisorResult.error) {
    throw advisorResult.error;
  }

  const advisor = (advisorResult.data ?? null) as AdvisorRow | null;

  if (!advisor) {
    return {
      advisor: null,
      rules: [],
      timeOff: [],
    };
  }

  const [rulesResult, timeOffResult] = await Promise.all([
    supabase
      .from("booking_availability_rules")
      .select("id,advisor_id,day_of_week,start_minute,end_minute,slot_duration_mins,is_active")
      .eq("advisor_id", advisor.id)
      .order("day_of_week", { ascending: true })
      .order("start_minute", { ascending: true }),
    supabase
      .from("booking_advisor_time_off")
      .select("id,advisor_id,starts_at,ends_at,reason")
      .eq("advisor_id", advisor.id)
      .order("starts_at", { ascending: true }),
  ]);

  if (rulesResult.error) {
    throw rulesResult.error;
  }

  if (timeOffResult.error) {
    throw timeOffResult.error;
  }

  const rules = (rulesResult.data ?? []) as RuleRow[];
  const timeOff = (timeOffResult.data ?? []) as TimeOffRow[];

  return {
    advisor: normalizeAdvisor(advisor),
    rules: rules.map((row) => normalizeRule(row)),
    timeOff: timeOff.map((row) => normalizeTimeOff(row)),
  };
}

async function ensureAdvisor(
  supabase: ReturnType<typeof createAuthedSupabaseClient>,
  userId: string,
  userEmail: string | null,
) {
  const existing = await supabase
    .from("booking_advisors")
    .select(
      "id,user_id,display_name,email,timezone,is_active,meeting_duration_mins,buffer_before_mins,buffer_after_mins,created_at,updated_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (existing.error) {
    throw existing.error;
  }

  const existingAdvisor = (existing.data ?? null) as AdvisorRow | null;
  if (existingAdvisor) {
    return existingAdvisor;
  }

  const inserted = await supabase
    .from("booking_advisors")
    .insert({
      user_id: userId,
      display_name: "Pravix Advisor",
      email: userEmail ?? "advisor@pravix.ai",
      timezone: "Asia/Kolkata",
      is_active: true,
      meeting_duration_mins: 30,
      buffer_before_mins: 0,
      buffer_after_mins: 0,
    })
    .select(
      "id,user_id,display_name,email,timezone,is_active,meeting_duration_mins,buffer_before_mins,buffer_after_mins,created_at,updated_at",
    )
    .single();

  if (inserted.error) {
    throw inserted.error;
  }

  return inserted.data as AdvisorRow;
}

export async function GET(request: Request) {
  try {
    const auth = await getAuthedContext(request);

    if (!auth.supabase || !auth.userId) {
      return NextResponse.json({ error: "Missing or invalid bearer token." }, { status: 401 });
    }

    const snapshot = await loadAdvisorSnapshot(auth.supabase, auth.userId);

    return NextResponse.json(
      {
        ok: true,
        ...snapshot,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof BookingValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Unexpected advisor availability fetch error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await getAuthedContext(request);

    if (!auth.supabase || !auth.userId) {
      return NextResponse.json({ error: "Missing or invalid bearer token." }, { status: 401 });
    }

    const rawBody = (await request.json()) as PutBody;

    if (!isRecord(rawBody)) {
      throw new BookingValidationError("Request body must be an object.");
    }

    const advisorPatch = parseAdvisorUpdate(rawBody.advisor);
    const rules = rawBody.rules === undefined ? null : parseRules(rawBody.rules);
    const timeOff = rawBody.timeOff === undefined ? null : parseTimeOff(rawBody.timeOff);

    const advisor = await ensureAdvisor(auth.supabase, auth.userId, auth.userEmail);

    if (Object.keys(advisorPatch).length > 0) {
      const updateResult = await auth.supabase
        .from("booking_advisors")
        .update(advisorPatch)
        .eq("id", advisor.id)
        .eq("user_id", auth.userId);

      if (updateResult.error) {
        throw updateResult.error;
      }
    }

    if (rules !== null) {
      const deleteRules = await auth.supabase.from("booking_availability_rules").delete().eq("advisor_id", advisor.id);

      if (deleteRules.error) {
        throw deleteRules.error;
      }

      if (rules.length > 0) {
        const insertRules = await auth.supabase.from("booking_availability_rules").insert(
          rules.map((rule) => ({
            advisor_id: advisor.id,
            day_of_week: rule.dayOfWeek,
            start_minute: rule.startMinute,
            end_minute: rule.endMinute,
            slot_duration_mins: rule.slotDurationMins,
            is_active: rule.isActive,
          })),
        );

        if (insertRules.error) {
          throw insertRules.error;
        }
      }
    }

    if (timeOff !== null) {
      const deleteTimeOff = await auth.supabase.from("booking_advisor_time_off").delete().eq("advisor_id", advisor.id);

      if (deleteTimeOff.error) {
        throw deleteTimeOff.error;
      }

      if (timeOff.length > 0) {
        const insertTimeOff = await auth.supabase.from("booking_advisor_time_off").insert(
          timeOff.map((window) => ({
            advisor_id: advisor.id,
            starts_at: window.startsAt,
            ends_at: window.endsAt,
            reason: window.reason,
          })),
        );

        if (insertTimeOff.error) {
          throw insertTimeOff.error;
        }
      }
    }

    const snapshot = await loadAdvisorSnapshot(auth.supabase, auth.userId);

    return NextResponse.json(
      {
        ok: true,
        ...snapshot,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof BookingValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Unexpected advisor availability update error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
