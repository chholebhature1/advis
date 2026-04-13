import { NextResponse } from "next/server";
import { runDueBookingReminders } from "@/lib/booking/server";
import { BookingValidationError, parsePositiveInteger } from "@/lib/booking/validation";

export const runtime = "nodejs";

function getExpectedSecret(): string | null {
  const value =
    process.env.BOOKING_REMINDERS_CRON_SECRET ?? process.env.ALERTS_CRON_SECRET ?? process.env.CRON_SECRET;

  if (!value || value.trim().length === 0) {
    return null;
  }

  return value.trim();
}

function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

function getIncomingSecret(request: Request): string | null {
  const fromHeader =
    request.headers.get("x-pravix-booking-secret") ?? request.headers.get("x-pravix-cron-secret") ?? null;

  if (fromHeader && fromHeader.trim().length > 0) {
    return fromHeader.trim();
  }

  const bearer = getBearerToken(request);
  return bearer && bearer.trim().length > 0 ? bearer.trim() : null;
}

function parseLimitFromQuery(request: Request): number | null {
  const rawLimit = new URL(request.url).searchParams.get("limit");
  if (!rawLimit) {
    return null;
  }

  return parsePositiveInteger(rawLimit, "limit", { min: 1, max: 250 });
}

async function parseLimitFromBody(request: Request): Promise<number | null> {
  try {
    const body = (await request.json()) as { limit?: unknown };
    if (!body || typeof body !== "object" || !("limit" in body)) {
      return null;
    }

    return parsePositiveInteger(body.limit, "limit", { min: 1, max: 250 });
  } catch {
    return null;
  }
}

async function run(request: Request) {
  try {
    const expectedSecret = getExpectedSecret();
    if (!expectedSecret) {
      return NextResponse.json(
        { error: "Missing BOOKING_REMINDERS_CRON_SECRET (or ALERTS_CRON_SECRET / CRON_SECRET)." },
        { status: 500 },
      );
    }

    const incomingSecret = getIncomingSecret(request);

    if (!incomingSecret) {
      return NextResponse.json({ error: "Missing cron secret." }, { status: 401 });
    }

    if (incomingSecret !== expectedSecret) {
      return NextResponse.json({ error: "Invalid cron secret." }, { status: 401 });
    }

    const queryLimit = parseLimitFromQuery(request);
    const bodyLimit = request.method === "POST" ? await parseLimitFromBody(request) : null;
    const limit = bodyLimit ?? queryLimit ?? 100;

    const result = await runDueBookingReminders(limit);

    return NextResponse.json(
      {
        ok: true,
        generatedAt: new Date().toISOString(),
        limit,
        result,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof BookingValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Unexpected booking reminders runner error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
