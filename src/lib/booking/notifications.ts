import { Resend } from "resend";
import { parseExtraRecipientsFromEnv } from "./recipients";

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

export function getBookingReminderExtraEmailIds(bookingRow: Record<string, unknown> | null): string[] {
  if (!bookingRow) return [];

  const metadata = bookingRow.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return [];

  const meta = metadata as Record<string, unknown>;
  const ids: string[] = [];

  const maybeExtras = meta.resendReminderEmailIds;
  if (Array.isArray(maybeExtras)) {
    for (const v of maybeExtras) {
      if (typeof v === "string" && v.trim().length > 0) ids.push(v.trim());
    }
  }

  return ids;
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
  const normalizedLead = leadEmail.trim();

  // Send primary message to the lead
  const leadSend = await resend.emails.send({
    from: getFromAddress(),
    to: [normalizedLead],
    subject,
    text,
    html,
  });

  if (leadSend.error) {
    throw new Error(`Booking confirmation email failed: ${JSON.stringify(leadSend.error)}`);
  }

  // Send separate copies to extra recipients (do not fail the whole flow if extras fail)
  const extras = extra.filter((e) => e.toLowerCase() !== normalizedLead.toLowerCase());
  if (extras.length > 0) {
    await Promise.allSettled(
      extras.map((recipient) =>
        resend.emails.send({
          from: getFromAddress(),
          to: [recipient],
          subject,
          text,
          html,
        }).then((res) => {
          if (res.error) {
            console.warn(`Extra booking confirmation send failed for ${recipient}: ${JSON.stringify(res.error)}`);
          }
        }),
      ),
    );
  }
}

export type ScheduledReminderIds = {
  leadReminderId: string | null;
  extraReminderIds: string[];
};

export async function scheduleBookingReminderEmail(
  bookingRow: Record<string, unknown> | null,
): Promise<ScheduledReminderIds> {
  if (!bookingRow) {
    return { leadReminderId: null, extraReminderIds: [] };
  }

  const resend = getResendClient();
  if (!resend) {
    console.warn("Booking reminder scheduling skipped: missing RESEND_API_KEY environment variable.");
    return { leadReminderId: null, extraReminderIds: [] };
  }

  const leadEmail = getStringField(bookingRow, ["lead_email", "leadEmail"]);
  const startsAt = getStringField(bookingRow, ["starts_at", "startsAt"]);

  if (!leadEmail || !startsAt) {
    return { leadReminderId: null, extraReminderIds: [] };
  }

  const reminderScheduledAt = getReminderScheduledAt(startsAt);
  if (!reminderScheduledAt) {
    return { leadReminderId: null, extraReminderIds: [] };
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
  const normalizedLead = leadEmail.trim();

  // Schedule primary reminder for the lead
  const leadSend = await resend.emails.send({
    from: getFromAddress(),
    to: [normalizedLead],
    subject,
    text,
    html,
    scheduledAt: reminderScheduledAt,
  });

  if (leadSend.error) {
    throw new Error(`Booking reminder scheduling failed: ${JSON.stringify(leadSend.error)}`);
  }

  const leadReminderId = typeof leadSend.data?.id === "string" && leadSend.data.id.trim().length > 0 ? leadSend.data.id.trim() : null;

  // Schedule separate reminders for extra recipients (best-effort); capture their ids
  const extras = extra.filter((e) => e.toLowerCase() !== normalizedLead.toLowerCase());
  const extraIds: string[] = [];

  if (extras.length > 0) {
    const results = await Promise.allSettled(
      extras.map((recipient) =>
        resend
          .emails
          .send({
            from: getFromAddress(),
            to: [recipient],
            subject,
            text,
            html,
            scheduledAt: reminderScheduledAt,
          })
          .then((res) => ({ recipient, res })),
      ),
    );

    for (const r of results) {
      if (r.status === "fulfilled") {
        const { recipient, res } = r.value as { recipient: string; res: any };
        if (!res?.error && typeof res?.data?.id === "string" && res.data.id.trim().length > 0) {
          extraIds.push(res.data.id.trim());
        } else {
          console.warn(`Extra booking reminder scheduling failed for ${recipient}: ${JSON.stringify(res?.error ?? res)}`);
        }
      } else {
        console.warn(`Extra booking reminder scheduling threw for a recipient: ${String((r as PromiseRejectedResult).reason)}`);
      }
    }
  }

  return { leadReminderId, extraReminderIds: extraIds };
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

export async function rescheduleBookingReminderEmails(reminderEmailIds: string[], startsAtIso: string): Promise<void> {
  if (!Array.isArray(reminderEmailIds) || reminderEmailIds.length === 0) return;

  const resend = getResendClient();
  if (!resend) {
    console.warn("Booking reminder reschedule skipped: missing RESEND_API_KEY environment variable.");
    return;
  }

  const reminderScheduledAt = getReminderScheduledAt(startsAtIso);
  if (!reminderScheduledAt) return;

  const results = await Promise.allSettled(
    reminderEmailIds.map((id) => resend.emails.update({ id, scheduledAt: reminderScheduledAt })),
  );

  for (const r of results) {
    if ((r as PromiseRejectedResult).reason) {
      console.warn(`Rescheduling extra reminder failed: ${String((r as PromiseRejectedResult).reason)}`);
    } else if ((r as PromiseFulfilledResult<any>).value?.error) {
      console.warn(`Rescheduling extra reminder returned error: ${JSON.stringify((r as PromiseFulfilledResult<any>).value.error)}`);
    }
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

export async function cancelBookingReminderEmails(reminderEmailIds: string[]): Promise<void> {
  if (!Array.isArray(reminderEmailIds) || reminderEmailIds.length === 0) return;

  const resend = getResendClient();
  if (!resend) {
    console.warn("Booking reminder cancel skipped: missing RESEND_API_KEY environment variable.");
    return;
  }

  const results = await Promise.allSettled(reminderEmailIds.map((id) => resend.emails.cancel(id)));

  for (const r of results) {
    if ((r as PromiseRejectedResult).reason) {
      console.warn(`Cancelling extra reminder failed: ${String((r as PromiseRejectedResult).reason)}`);
    } else if ((r as PromiseFulfilledResult<any>).value?.error) {
      console.warn(`Cancelling extra reminder returned error: ${JSON.stringify((r as PromiseFulfilledResult<any>).value.error)}`);
    }
  }
}
