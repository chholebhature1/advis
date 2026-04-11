import { NextResponse } from "next/server";
import {
  createAuthedSupabaseClient,
  createServiceSupabaseClient,
  getBearerToken,
  resolveAuthedUser,
} from "@/lib/agent/server";
import {
  dispatchSmartAlerts,
  evaluateSmartAlertsForUser,
  listCandidateUsersForDailyAutomation,
  type DispatchResult,
} from "@/lib/agent/alerts";

export const runtime = "nodejs";

function getCronSecret(request: Request): string | null {
  const secret = request.headers.get("x-pravix-cron-secret");
  return secret && secret.trim().length > 0 ? secret : null;
}

function getExpectedCronSecret(): string | null {
  const secret = process.env.ALERTS_CRON_SECRET ?? process.env.CRON_SECRET;
  return secret && secret.trim().length > 0 ? secret : null;
}

function mergeSummary(results: DispatchResult[]) {
  return results.reduce(
    (accumulator, result) => {
      accumulator.evaluatedUserCount += result.summary.evaluatedUserCount;
      accumulator.triggeredCount += result.summary.triggeredCount;
      accumulator.readyCount += result.summary.readyCount;
      accumulator.deferredCount += result.summary.deferredCount;
      accumulator.blockedCount += result.summary.blockedCount;
      accumulator.suppressedCount += result.summary.suppressedCount;
      accumulator.sentCount += result.alerts.filter((alert) => alert.dispatchStatus === "sent").length;
      accumulator.failedCount += result.alerts.filter((alert) => alert.dispatchStatus === "failed").length;
      accumulator.skippedCount += result.alerts.filter((alert) => alert.dispatchStatus === "skipped").length;
      return accumulator;
    },
    {
      evaluatedUserCount: 0,
      triggeredCount: 0,
      readyCount: 0,
      deferredCount: 0,
      blockedCount: 0,
      suppressedCount: 0,
      sentCount: 0,
      failedCount: 0,
      skippedCount: 0,
    },
  );
}

async function handleDaily(request: Request) {
  try {
    const accessToken = getBearerToken(request);
    const expectedSecret = getExpectedCronSecret();
    const headerSecret = getCronSecret(request);
    const isBearerCronSecret = !!accessToken && !!expectedSecret && accessToken === expectedSecret;

    // Bearer mode: run daily automation for the current authenticated user.
    if (accessToken && !isBearerCronSecret) {
      const supabase = createAuthedSupabaseClient(accessToken);
      const user = await resolveAuthedUser(supabase);

      if (!user) {
        return NextResponse.json({ error: "Unauthorized request." }, { status: 401 });
      }

      const evaluation = await evaluateSmartAlertsForUser(supabase, user.id);
      const dispatched = await dispatchSmartAlerts(supabase, evaluation);

      return NextResponse.json(
        {
          ok: true,
          mode: "user-daily",
          ...dispatched,
        },
        { status: 200 },
      );
    }

    // Cron mode: requires shared secret and service role key.
    const incomingSecret = headerSecret ?? (isBearerCronSecret ? accessToken : null);
    if (!incomingSecret) {
      return NextResponse.json({ error: "Missing authentication or cron secret." }, { status: 401 });
    }

    if (!expectedSecret) {
      return NextResponse.json(
        { error: "Missing ALERTS_CRON_SECRET or CRON_SECRET environment variable for cron mode." },
        { status: 500 },
      );
    }

    if (incomingSecret !== expectedSecret) {
      return NextResponse.json({ error: "Invalid cron secret." }, { status: 401 });
    }

    const serviceSupabase = createServiceSupabaseClient();
    const userIds = await listCandidateUsersForDailyAutomation(serviceSupabase, 500);

    const results: DispatchResult[] = [];
    const failures: Array<{ userId: string; error: string }> = [];

    for (const userId of userIds) {
      try {
        const evaluation = await evaluateSmartAlertsForUser(serviceSupabase, userId);
        const dispatched = await dispatchSmartAlerts(serviceSupabase, evaluation);
        results.push(dispatched);
      } catch (userError) {
        failures.push({
          userId,
          error: userError instanceof Error ? userError.message : "Unknown error",
        });
      }
    }

    const summary = mergeSummary(results);

    return NextResponse.json(
      {
        ok: true,
        mode: "cron-daily",
        generatedAt: new Date().toISOString(),
        scannedUserCount: userIds.length,
        processedUserCount: results.length,
        failedUserCount: failures.length,
        summary,
        failures: failures.slice(0, 20),
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected daily smart alerts error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleDaily(request);
}

export async function POST(request: Request) {
  return handleDaily(request);
}