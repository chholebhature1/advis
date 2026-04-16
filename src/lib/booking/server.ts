import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceSupabaseClient } from "@/lib/agent/server";

type BookingAdvisorRow = {
  id: string;
  display_name: string;
  email: string;
  timezone: string;
  is_active: boolean;
  meeting_duration_mins: number;
  buffer_before_mins: number;
  buffer_after_mins: number;
};

type AvailabilityRuleRow = {
  advisor_id: string;
  day_of_week: number;
  start_minute: number;
  end_minute: number;
  slot_duration_mins: number;
  is_active: boolean;
};

type MeetingRow = {
  id: string;
  advisor_id: string;
  starts_at: string;
  ends_at: string;
  status: "pending" | "confirmed" | "rescheduled" | "cancelled" | "completed" | "no_show";
  lead_name: string;
  lead_email: string;
  lead_phone_e164: string | null;
  timezone: string;
};

type TimeOffRow = {
  advisor_id: string;
  starts_at: string;
  ends_at: string;
};

type ReminderRow = {
  id: string;
  booking_id: string;
  channel: "email" | "sms" | "whatsapp" | "push";
  scheduled_for: string;
  status: "queued" | "sent" | "failed" | "skipped";
  attempt_count: number;
};

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

type DateOnlyParts = {
  year: number;
  month: number;
  day: number;
};

const ACTIVE_MEETING_STATUSES: Array<"pending" | "confirmed" | "rescheduled" | "cancelled" | "completed" | "no_show"> = ["pending", "confirmed", "rescheduled"];

export type BookingAdvisor = {
  id: string;
  displayName: string;
  email: string;
  timezone: string;
  meetingDurationMins: number;
  bufferBeforeMins: number;
  bufferAfterMins: number;
};

export type AvailabilitySlot = {
  startsAt: string;
  endsAt: string;
  timeLabel: string;
};

export type AvailabilityDate = {
  dateKey: string;
  weekdayLabel: string;
  monthLabel: string;
  dayNumber: number;
  isAvailable: boolean;
  slots: AvailabilitySlot[];
};

export type PublicAvailabilityPayload = {
  advisor: BookingAdvisor | null;
  generatedAt: string;
  dates: AvailabilityDate[];
};

export type ReminderRunResult = {
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
};

function parseDateOnlyInTimezone(date: Date, timezone: string): DateOnlyParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);

  const year = Number(parts.find((part) => part.type === "year")?.value ?? "0");
  const month = Number(parts.find((part) => part.type === "month")?.value ?? "0");
  const day = Number(parts.find((part) => part.type === "day")?.value ?? "0");

  return { year, month, day };
}

function parseDateTimeInTimezone(date: Date, timezone: string): DateParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);

  const year = Number(parts.find((part) => part.type === "year")?.value ?? "0");
  const month = Number(parts.find((part) => part.type === "month")?.value ?? "0");
  const day = Number(parts.find((part) => part.type === "day")?.value ?? "0");
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0") % 24;
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  const second = Number(parts.find((part) => part.type === "second")?.value ?? "0");

  return { year, month, day, hour, minute, second };
}

function dateOnlyToKey(value: DateOnlyParts): string {
  return `${value.year}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`;
}

function addDaysToDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map((value) => Number(value));
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function parseDateKey(dateKey: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateKey.split("-").map((value) => Number(value));
  return { year, month, day };
}

function getTimezoneOffsetMs(date: Date, timezone: string): number {
  const parts = parseDateTimeInTimezone(date, timezone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - date.getTime();
}

function zonedDateTimeToUtc(dateKey: string, minuteOfDay: number, timezone: string): Date {
  const parsed = parseDateKey(dateKey);
  const hours = Math.floor(minuteOfDay / 60);
  const minutes = minuteOfDay % 60;

  const utcGuess = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day, hours, minutes, 0));
  const offsetMs = getTimezoneOffsetMs(utcGuess, timezone);

  return new Date(utcGuess.getTime() - offsetMs);
}

function minuteToTimeLabel(minuteOfDay: number): string {
  const hours24 = Math.floor(minuteOfDay / 60);
  const minutes = minuteOfDay % 60;
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;

  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
}

function rangesOverlap(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA < endB && startB < endA;
}

function normalizeAdvisor(row: BookingAdvisorRow): BookingAdvisor {
  return {
    id: row.id,
    displayName: row.display_name,
    email: row.email,
    timezone: row.timezone,
    meetingDurationMins: row.meeting_duration_mins,
    bufferBeforeMins: row.buffer_before_mins,
    bufferAfterMins: row.buffer_after_mins,
  };
}

async function loadAdvisor(
  supabase: SupabaseClient,
  advisorId?: string,
): Promise<BookingAdvisorRow | null> {
  const baseQuery = supabase
    .from("booking_advisors")
    .select("id,display_name,email,timezone,is_active,meeting_duration_mins,buffer_before_mins,buffer_after_mins")
    .eq("is_active", true);

  if (advisorId) {
    const result = await baseQuery.eq("id", advisorId).maybeSingle();

    if (result.error) {
      throw result.error;
    }

    return (result.data ?? null) as BookingAdvisorRow | null;
  }

  const result = await baseQuery.order("created_at", { ascending: true }).limit(1).maybeSingle();

  if (result.error) {
    throw result.error;
  }

  return (result.data ?? null) as BookingAdvisorRow | null;
}

function buildDateLabels(dateKey: string, timezone: string) {
  const midnightUtc = zonedDateTimeToUtc(dateKey, 0, timezone);

  const weekdayLabel = new Intl.DateTimeFormat("en-IN", {
    timeZone: timezone,
    weekday: "short",
  }).format(midnightUtc);

  const monthLabel = new Intl.DateTimeFormat("en-IN", {
    timeZone: timezone,
    month: "short",
  }).format(midnightUtc);

  const dayNumber = Number(
    new Intl.DateTimeFormat("en-IN", {
      timeZone: timezone,
      day: "2-digit",
    }).format(midnightUtc),
  );

  return { weekdayLabel, monthLabel, dayNumber };
}

export async function getPublicAvailability(options?: {
  advisorId?: string;
  fromDateKey?: string;
  days?: number;
}): Promise<PublicAvailabilityPayload> {
  const supabase = createServiceSupabaseClient();
  const advisorRow = await loadAdvisor(supabase, options?.advisorId);

  if (!advisorRow) {
    return {
      advisor: null,
      generatedAt: new Date().toISOString(),
      dates: [],
    };
  }

  const advisor = normalizeAdvisor(advisorRow);
  const maxDays = Math.min(Math.max(options?.days ?? 14, 1), 30);
  const now = new Date();

  const defaultFromDateKey = dateOnlyToKey(parseDateOnlyInTimezone(now, advisor.timezone));
  const fromDateKey = options?.fromDateKey ?? defaultFromDateKey;
  const toDateKey = addDaysToDateKey(fromDateKey, maxDays);

  const windowStartUtc = zonedDateTimeToUtc(fromDateKey, 0, advisor.timezone);
  const windowEndUtc = zonedDateTimeToUtc(toDateKey, 0, advisor.timezone);

  const [rulesResult, meetingsResult, timeOffResult] = await Promise.all([
    supabase
      .from("booking_availability_rules")
      .select("advisor_id,day_of_week,start_minute,end_minute,slot_duration_mins,is_active")
      .eq("advisor_id", advisor.id)
      .eq("is_active", true),
    supabase
      .from("booking_meetings")
      .select("id,advisor_id,starts_at,ends_at,status,lead_name,lead_email,lead_phone_e164,timezone")
      .eq("advisor_id", advisor.id)
      .in("status", [...ACTIVE_MEETING_STATUSES])
      .lt("starts_at", windowEndUtc.toISOString())
      .gt("ends_at", windowStartUtc.toISOString()),
    supabase
      .from("booking_advisor_time_off")
      .select("advisor_id,starts_at,ends_at")
      .eq("advisor_id", advisor.id)
      .lt("starts_at", windowEndUtc.toISOString())
      .gt("ends_at", windowStartUtc.toISOString()),
  ]);

  if (rulesResult.error) {
    throw rulesResult.error;
  }

  if (meetingsResult.error) {
    throw meetingsResult.error;
  }

  if (timeOffResult.error) {
    throw timeOffResult.error;
  }

  const rules = (rulesResult.data ?? []) as AvailabilityRuleRow[];
  const meetings = (meetingsResult.data ?? []) as MeetingRow[];
  const timeOff = (timeOffResult.data ?? []) as TimeOffRow[];

  const bookedRanges = meetings.map((meeting) => ({
    start: new Date(meeting.starts_at),
    end: new Date(meeting.ends_at),
  }));

  const timeOffRanges = timeOff.map((window) => ({
    start: new Date(window.starts_at),
    end: new Date(window.ends_at),
  }));

  const dates: AvailabilityDate[] = [];
  const minBookableStart = new Date(now.getTime() + 15 * 60 * 1000);

  for (let offset = 0; offset < maxDays; offset += 1) {
    const dateKey = addDaysToDateKey(fromDateKey, offset);
    const parsed = parseDateKey(dateKey);
    const dayOfWeek = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day)).getUTCDay();
    const dayRules = rules.filter((rule) => rule.day_of_week === dayOfWeek);

    const slots: AvailabilitySlot[] = [];

    for (const rule of dayRules) {
      const slotDuration = Math.max(10, rule.slot_duration_mins || advisor.meetingDurationMins);
      const firstMinute = Math.max(0, rule.start_minute + advisor.bufferBeforeMins);
      const lastStartMinute = Math.min(1440, rule.end_minute - advisor.bufferAfterMins - slotDuration);

      for (let minute = firstMinute; minute <= lastStartMinute; minute += slotDuration) {
        const slotStart = zonedDateTimeToUtc(dateKey, minute, advisor.timezone);
        const slotEnd = new Date(slotStart.getTime() + slotDuration * 60 * 1000);

        if (slotStart <= minBookableStart) {
          continue;
        }

        const conflictsBooking = bookedRanges.some((range) => rangesOverlap(slotStart, slotEnd, range.start, range.end));
        if (conflictsBooking) {
          continue;
        }

        const conflictsTimeOff = timeOffRanges.some((range) => rangesOverlap(slotStart, slotEnd, range.start, range.end));
        if (conflictsTimeOff) {
          continue;
        }

        slots.push({
          startsAt: slotStart.toISOString(),
          endsAt: slotEnd.toISOString(),
          timeLabel: minuteToTimeLabel(minute),
        });
      }
    }

    const labels = buildDateLabels(dateKey, advisor.timezone);

    dates.push({
      dateKey,
      weekdayLabel: labels.weekdayLabel,
      monthLabel: labels.monthLabel,
      dayNumber: labels.dayNumber,
      isAvailable: slots.length > 0,
      slots,
    });
  }

  return {
    advisor,
    generatedAt: now.toISOString(),
    dates,
  };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing ${name} environment variable.`);
  }

  return value;
}

function formatReminderMessage(booking: MeetingRow, advisor: BookingAdvisorRow): { subject: string; body: string } {
  const start = new Date(booking.starts_at);
  const dateLabel = start.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: booking.timezone || advisor.timezone || "Asia/Kolkata",
  });

  return {
    subject: `[Pravix] Reminder: Meeting at ${dateLabel}`,
    body: `Hi ${booking.lead_name}, this is a reminder for your Pravix meeting with ${advisor.display_name} on ${dateLabel}.`,
  };
}

async function dispatchReminder(
  reminder: ReminderRow,
  booking: MeetingRow,
  advisor: BookingAdvisorRow,
): Promise<{ provider: string; messageId: string | null; response: Record<string, unknown> }> {
  const message = formatReminderMessage(booking, advisor);

  if (reminder.channel === "email") {
    const apiKey = requireEnv("RESEND_API_KEY");
    const from = process.env.BOOKING_EMAIL_FROM || process.env.ALERTS_EMAIL_FROM || "no-reply@pravix.ai";

    const resend = new Resend(apiKey);
    const payload = await resend.emails.send({
      from,
      to: [booking.lead_email],
      subject: message.subject,
      text: message.body,
      html: `<p>${message.body}</p>`,
    });

    if (payload.error) {
      throw new Error(`Resend booking reminder failed: ${JSON.stringify(payload.error)}`);
    }

    return {
      provider: "resend",
      messageId: typeof payload.data?.id === "string" ? payload.data.id : null,
      response: {
        data: payload.data ?? null,
      },
    };
  }

  if (reminder.channel === "sms" || reminder.channel === "whatsapp") {
    const accountSid = requireEnv("TWILIO_ACCOUNT_SID");
    const authToken = requireEnv("TWILIO_AUTH_TOKEN");
    const from = reminder.channel === "whatsapp" ? requireEnv("TWILIO_WHATSAPP_FROM") : requireEnv("TWILIO_SMS_FROM");

    if (!booking.lead_phone_e164) {
      throw new Error("Booking has no phone number for SMS/WhatsApp reminder.");
    }

    const normalizeAddress = (channel: "sms" | "whatsapp", value: string) => {
      if (channel === "sms") {
        return value;
      }

      return value.startsWith("whatsapp:") ? value : `whatsapp:${value}`;
    };

    const params = new URLSearchParams({
      To: normalizeAddress(reminder.channel, booking.lead_phone_e164),
      From: normalizeAddress(reminder.channel, from),
      Body: message.body,
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      },
    );

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok) {
      throw new Error(`Twilio booking reminder failed (${response.status}): ${JSON.stringify(payload)}`);
    }

    return {
      provider: "twilio",
      messageId: typeof payload.sid === "string" ? payload.sid : null,
      response: payload,
    };
  }

  throw new Error(`Channel ${reminder.channel} is not supported for booking reminders.`);
}

async function markReminderSkipped(
  supabase: SupabaseClient,
  reminderId: string,
  reason: string,
): Promise<void> {
  await supabase
    .from("booking_reminders")
    .update({
      status: "skipped",
      provider_response: { reason },
      updated_at: new Date().toISOString(),
    })
    .eq("id", reminderId);
}

export async function runDueBookingReminders(limit = 100): Promise<ReminderRunResult> {
  const supabase = createServiceSupabaseClient();
  const nowIso = new Date().toISOString();

  const remindersResult = await supabase
    .from("booking_reminders")
    .select("id,booking_id,channel,scheduled_for,status,attempt_count")
    .eq("status", "queued")
    .lte("scheduled_for", nowIso)
    .order("scheduled_for", { ascending: true })
    .limit(Math.max(1, Math.min(limit, 250)));

  if (remindersResult.error) {
    throw remindersResult.error;
  }

  const reminders = (remindersResult.data ?? []) as ReminderRow[];

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const reminder of reminders) {
    const bookingResult = await supabase
      .from("booking_meetings")
      .select("id,advisor_id,starts_at,ends_at,status,lead_name,lead_email,lead_phone_e164,timezone")
      .eq("id", reminder.booking_id)
      .maybeSingle();

    if (bookingResult.error) {
      throw bookingResult.error;
    }

    const booking = (bookingResult.data ?? null) as MeetingRow | null;

    if (!booking || !ACTIVE_MEETING_STATUSES.includes(booking.status as "pending" | "confirmed" | "rescheduled")) {
      skipped += 1;
      await markReminderSkipped(supabase, reminder.id, "Booking not active.");
      continue;
    }

    const advisorResult = await supabase
      .from("booking_advisors")
      .select("id,display_name,email,timezone,is_active,meeting_duration_mins,buffer_before_mins,buffer_after_mins")
      .eq("id", booking.advisor_id)
      .maybeSingle();

    if (advisorResult.error) {
      throw advisorResult.error;
    }

    const advisor = (advisorResult.data ?? null) as BookingAdvisorRow | null;

    if (!advisor) {
      skipped += 1;
      await markReminderSkipped(supabase, reminder.id, "Advisor not found.");
      continue;
    }

    try {
      const provider = await dispatchReminder(reminder, booking, advisor);

      await supabase
        .from("booking_reminders")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          attempt_count: reminder.attempt_count + 1,
          provider: provider.provider,
          provider_message_id: provider.messageId,
          provider_response: provider.response,
          updated_at: new Date().toISOString(),
        })
        .eq("id", reminder.id);

      await supabase.from("booking_activity_log").insert({
        booking_id: booking.id,
        event_type: "reminder_sent",
        event_payload: {
          reminder_id: reminder.id,
          channel: reminder.channel,
          provider: provider.provider,
        },
      });

      sent += 1;
    } catch (dispatchError) {
      const message = dispatchError instanceof Error ? dispatchError.message : "Unknown reminder dispatch error.";

      await supabase
        .from("booking_reminders")
        .update({
          status: "failed",
          attempt_count: reminder.attempt_count + 1,
          provider_response: { error: message },
          updated_at: new Date().toISOString(),
        })
        .eq("id", reminder.id);

      await supabase.from("booking_activity_log").insert({
        booking_id: booking.id,
        event_type: "reminder_failed",
        event_payload: {
          reminder_id: reminder.id,
          channel: reminder.channel,
          error: message,
        },
      });

      failed += 1;
    }
  }

  return {
    processed: reminders.length,
    sent,
    failed,
    skipped,
  };
}
