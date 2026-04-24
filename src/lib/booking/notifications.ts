import { Resend } from "resend";
import { mergeRecipients, parseExtraRecipientsFromEnv } from "./recipients";

function getStringField(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function getReminderScheduledAt(startsAtIso: string): string | null {
  const startsAt = new Date(startsAtIso);
  if (Number.isNaN(startsAt.getTime())) {
    return null;
  }

  const preferredReminderAt = new Date(startsAt.getTime() - 60 * 60 * 1000);
  const earliestAllowed = new Date(Date.now() + 60 * 1000);

  return (preferredReminderAt.getTime() > earliestAllowed.getTime() ? preferredReminderAt : earliestAllowed).toISOString();
}

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim() ?? "";
  if (!apiKey) {
    return null;
  }

  return new Resend(apiKey);
}

function getFromAddress(): string {
  return process.env.BOOKING_EMAIL_FROM?.trim() || process.env.ALERTS_EMAIL_FROM?.trim() || "no-reply@weberaexperts.com";
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatMeetingDateLabel(startsAtIso: string, timezone: string): string {
  const startsAtDate = new Date(startsAtIso);

  if (Number.isNaN(startsAtDate.getTime())) {
    return startsAtIso;
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: timezone,
  }).format(startsAtDate);
}

export function getBookingReminderEmailId(bookingRow: Record<string, unknown> | null): string | null {
  if (!bookingRow) {
    return null;
  }

  const metadata = bookingRow.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const reminderEmailId = (metadata as Record<string, unknown>).resendReminderEmailId;
  if (typeof reminderEmailId !== "string" || reminderEmailId.trim().length === 0) {
    return null;
  }

  return reminderEmailId.trim();
}

export async function sendBookingConfirmationEmail(bookingRow: Record<string, unknown> | null): Promise<void> {
  if (!bookingRow) {
    return;
  }

  const resend = getResendClient();
  if (!resend) {
    console.warn("Booking confirmation email skipped: missing RESEND_API_KEY environment variable.");
    return;
  }

  const leadEmail = getStringField(bookingRow, ["lead_email", "leadEmail"]);
  const startsAt = getStringField(bookingRow, ["starts_at", "startsAt"]);

  if (!leadEmail || !startsAt) {
    return;
  }

  const leadName = getStringField(bookingRow, ["lead_name", "leadName"]) ?? "there";
  const timezone = getStringField(bookingRow, ["timezone", "timeZone"]) ?? "Asia/Kolkata";
  const startsAtLabel = formatMeetingDateLabel(startsAt, timezone);

  const subject = `[Pravix] Booking confirmed for ${startsAtLabel}`;
  const text =
    `Hi ${leadName}, your discovery call is confirmed for ${startsAtLabel}. ` +
    "We will send a reminder email before your meeting.";
  const html =
    `<p>Hi ${escapeHtml(leadName)},</p>` +
    `<p>Your discovery call is confirmed for <strong>${escapeHtml(startsAtLabel)}</strong>.</p>` +
    "<p>We will send a reminder email before your meeting.</p>";

  const extra = parseExtraRecipientsFromEnv();
  const to = mergeRecipients(leadEmail, extra);

  const sendResult = await resend.emails.send({
    from: getFromAddress(),
    to,
    subject,
    text,
    html,
  });

  if (sendResult.error) {
    throw new Error(`Booking confirmation email failed: ${JSON.stringify(sendResult.error)}`);
  }
}

export async function scheduleBookingReminderEmail(bookingRow: Record<string, unknown> | null): Promise<string | null> {
  if (!bookingRow) {
    return null;
  }

  const resend = getResendClient();
  if (!resend) {
    console.warn("Booking reminder scheduling skipped: missing RESEND_API_KEY environment variable.");
    return null;
  }

  const leadEmail = getStringField(bookingRow, ["lead_email", "leadEmail"]);
  const startsAt = getStringField(bookingRow, ["starts_at", "startsAt"]);

  if (!leadEmail || !startsAt) {
    return null;
  }

  const reminderScheduledAt = getReminderScheduledAt(startsAt);
  if (!reminderScheduledAt) {
    return null;
  }

  const leadName = getStringField(bookingRow, ["lead_name", "leadName"]) ?? "there";
  const timezone = getStringField(bookingRow, ["timezone", "timeZone"]) ?? "Asia/Kolkata";
  const startsAtLabel = formatMeetingDateLabel(startsAt, timezone);

  const subject = `[Pravix] Reminder: Meeting at ${startsAtLabel}`;
  const text = `Hi ${leadName}, this is a reminder for your Pravix meeting at ${startsAtLabel}.`;
  const html =
    `<p>Hi ${escapeHtml(leadName)},</p>` +
    `<p>This is a reminder for your Pravix meeting at <strong>${escapeHtml(startsAtLabel)}</strong>.</p>`;

  const extra = parseExtraRecipientsFromEnv();
  const to = mergeRecipients(leadEmail, extra);

  const sendResult = await resend.emails.send({
    from: getFromAddress(),
    to,
    subject,
    text,
    html,
    scheduledAt: reminderScheduledAt,
  });

  if (sendResult.error) {
    throw new Error(`Booking reminder scheduling failed: ${JSON.stringify(sendResult.error)}`);
  }

  const reminderEmailId = sendResult.data?.id;
  return typeof reminderEmailId === "string" && reminderEmailId.trim().length > 0 ? reminderEmailId.trim() : null;
}

export async function rescheduleBookingReminderEmail(reminderEmailId: string, startsAtIso: string): Promise<void> {
  const resend = getResendClient();
  if (!resend) {
    console.warn("Booking reminder reschedule skipped: missing RESEND_API_KEY environment variable.");
    return;
  }

  const reminderScheduledAt = getReminderScheduledAt(startsAtIso);
  if (!reminderScheduledAt) {
    return;
  }

  const updateResult = await resend.emails.update({
    id: reminderEmailId,
    scheduledAt: reminderScheduledAt,
  });

  if (updateResult.error) {
    throw new Error(`Booking reminder reschedule failed: ${JSON.stringify(updateResult.error)}`);
  }
}

export async function cancelBookingReminderEmail(reminderEmailId: string): Promise<void> {
  const resend = getResendClient();
  if (!resend) {
    console.warn("Booking reminder cancel skipped: missing RESEND_API_KEY environment variable.");
    return;
  }

  const cancelResult = await resend.emails.cancel(reminderEmailId);

  if (cancelResult.error) {
    throw new Error(`Booking reminder cancel failed: ${JSON.stringify(cancelResult.error)}`);
  }
}
