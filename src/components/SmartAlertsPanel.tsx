"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, BellRing, Loader2, RefreshCcw, SendHorizontal } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type SmartAlertItem = {
  alertType: string;
  title: string;
  message: string;
  severity: "low" | "medium" | "high";
  metricValue: number | null;
  metricLabel: string | null;
  channel: "whatsapp" | "email" | "sms" | "push" | null;
  destination: string | null;
  routeStatus: "ready" | "deferred" | "blocked" | "suppressed";
  routeReason: string;
};

type Summary = {
  evaluatedUserCount: number;
  triggeredCount: number;
  readyCount: number;
  deferredCount: number;
  blockedCount: number;
  suppressedCount: number;
};

type AlertsSubscription = {
  plan: "free" | "starter" | "pro";
  status: "trialing" | "active" | "past_due" | "canceled" | "paused";
  isPaidPlan: boolean;
  canUseWhatsappChannel: boolean;
  upgradeMessage: string | null;
};

type AlertsPayload = {
  ok?: boolean;
  mode?: string;
  alerts?: SmartAlertItem[];
  summary?: Summary;
  subscription?: AlertsSubscription;
  error?: string;
};

type SmartAlertsPanelProps = {
  refreshKey: number;
};

const EMPTY_SUMMARY: Summary = {
  evaluatedUserCount: 0,
  triggeredCount: 0,
  readyCount: 0,
  deferredCount: 0,
  blockedCount: 0,
  suppressedCount: 0,
};

function getSeverityClassName(severity: SmartAlertItem["severity"]): string {
  if (severity === "high") {
    return "border-finance-red/35 bg-finance-red/10 text-finance-red";
  }

  if (severity === "medium") {
    return "border-amber-300/40 bg-amber-100/60 text-amber-800";
  }

  return "border-finance-border bg-finance-surface text-finance-text";
}

function getRouteBadgeClassName(status: SmartAlertItem["routeStatus"]): string {
  if (status === "ready") {
    return "border border-finance-green/35 bg-finance-green/10 text-finance-green";
  }

  if (status === "deferred") {
    return "border border-amber-300/40 bg-amber-100/60 text-amber-800";
  }

  if (status === "blocked") {
    return "border border-finance-red/35 bg-finance-red/10 text-finance-red";
  }

  return "border border-finance-border bg-finance-surface text-finance-muted";
}

function labelFromAlertType(alertType: string): string {
  if (alertType === "market_crash") {
    return "Crash Alert";
  }

  if (alertType === "rebalance") {
    return "Rebalance Drift";
  }

  if (alertType === "sip_due") {
    return "SIP Due";
  }

  if (alertType === "tax_deadline") {
    return "Tax Deadline";
  }

  return alertType;
}

export default function SmartAlertsPanel({ refreshKey }: SmartAlertsPanelProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningDaily, setIsRunningDaily] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<SmartAlertItem[]>([]);
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [mode, setMode] = useState<string>("evaluate");
  const [subscription, setSubscription] = useState<AlertsSubscription | null>(null);

  const getAccessToken = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const { data, error: authError } = await supabase.auth.getSession();

    if (authError) {
      throw authError;
    }

    const token = data.session?.access_token;
    if (!token) {
      throw new Error("Authentication session expired. Please sign in again.");
    }

    return token;
  }, []);

  const callEndpoint = useCallback(
    async (url: string, method: "GET" | "POST"): Promise<AlertsPayload> => {
      const token = await getAccessToken();

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = (await response.json().catch(() => ({}))) as AlertsPayload;
      if (!response.ok) {
        throw new Error(payload.error ?? "Smart alerts request failed.");
      }

      return payload;
    },
    [getAccessToken],
  );

  const loadAlerts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const payload = await callEndpoint("/api/agent/alerts", "GET");
      setAlerts(payload.alerts ?? []);
      setSummary(payload.summary ?? EMPTY_SUMMARY);
      setMode(payload.mode ?? "evaluate");
      setSubscription(payload.subscription ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load smart alerts.");
    } finally {
      setIsLoading(false);
    }
  }, [callEndpoint]);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts, refreshKey]);

  async function runDailyAutomation() {
    setIsRunningDaily(true);
    setError(null);

    try {
      const payload = await callEndpoint("/api/agent/alerts/daily", "POST");
      setAlerts(payload.alerts ?? []);
      setSummary(payload.summary ?? EMPTY_SUMMARY);
      setMode(payload.mode ?? "user-daily");
      setSubscription(payload.subscription ?? null);
    } catch (dailyError) {
      setError(dailyError instanceof Error ? dailyError.message : "Could not run daily automation.");
    } finally {
      setIsRunningDaily(false);
    }
  }

  const sortedAlerts = useMemo(() => {
    return [...alerts].sort((a, b) => {
      const severityRank = { high: 3, medium: 2, low: 1 };
      return severityRank[b.severity] - severityRank[a.severity];
    });
  }, [alerts]);

  return (
    <section className="rounded-2xl border border-finance-border bg-finance-panel p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-finance-muted">Smart Alerts</p>
          <h2 className="mt-1 text-2xl font-semibold text-finance-text">Daily Rules and Channel Routing</h2>
          <p className="mt-1 text-sm text-finance-muted">
            Evaluates crash, rebalance drift, SIP due, and tax deadline alerts and routes them to your preferred channels.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadAlerts()}
            disabled={isLoading || isRunningDaily}
            className="inline-flex items-center gap-2 rounded-full border border-finance-border px-4 py-2 text-sm font-semibold text-finance-text hover:bg-finance-surface disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Refresh Alerts
          </button>

          <button
            type="button"
            onClick={() => void runDailyAutomation()}
            disabled={isLoading || isRunningDaily}
            className="inline-flex items-center gap-2 rounded-full bg-finance-accent px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isRunningDaily ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
            Run Daily Automation
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-finance-red/25 bg-finance-red/10 p-3 text-sm text-finance-red">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          <p>{error}</p>
        </div>
      )}

      <section className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl border border-finance-border bg-finance-panel p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-finance-muted">Triggered</p>
          <p className="mt-2 text-xl font-semibold text-finance-text">{summary.triggeredCount}</p>
        </article>
        <article className="rounded-xl border border-finance-border bg-finance-panel p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-finance-muted">Ready to Send</p>
          <p className="mt-2 text-xl font-semibold text-finance-green">{summary.readyCount}</p>
        </article>
        <article className="rounded-xl border border-finance-border bg-finance-panel p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-finance-muted">Deferred</p>
          <p className="mt-2 text-xl font-semibold text-amber-700">{summary.deferredCount}</p>
        </article>
        <article className="rounded-xl border border-finance-border bg-finance-panel p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-finance-muted">Blocked/Suppressed</p>
          <p className="mt-2 text-xl font-semibold text-finance-red">{summary.blockedCount + summary.suppressedCount}</p>
        </article>
      </section>

      <div className="mt-5 rounded-lg border border-finance-border bg-finance-surface/70 p-3 text-xs text-finance-muted">
        Evaluation mode: {mode || "evaluate"}
      </div>

      {subscription && (
        <div className="mt-3 rounded-lg border border-finance-border bg-finance-surface/70 p-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 text-finance-muted">
            <span>
              Plan: <span className="font-semibold uppercase text-finance-text">{subscription.plan}</span>
            </span>
            <span>
              Status: <span className="font-semibold uppercase text-finance-text">{subscription.status}</span>
            </span>
          </div>

          {subscription.canUseWhatsappChannel ? (
            <p className="mt-2 text-finance-green">WhatsApp channel is unlocked for your subscription.</p>
          ) : (
            <p className="mt-2 text-amber-700">{subscription.upgradeMessage ?? "Upgrade to unlock WhatsApp channel."}</p>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-finance-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Evaluating smart alerts...
        </div>
      ) : sortedAlerts.length === 0 ? (
        <div className="mt-6 rounded-xl border border-finance-border bg-finance-surface/70 p-4 text-sm text-finance-muted">
          No smart alerts are currently triggered for today.
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {sortedAlerts.map((alert, index) => (
            <article
              key={`${alert.alertType}-${index}`}
              className={`rounded-xl border p-4 ${getSeverityClassName(alert.severity)}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BellRing className="h-4 w-4" />
                  <p className="text-sm font-semibold">{labelFromAlertType(alert.alertType)}</p>
                </div>

                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${getRouteBadgeClassName(alert.routeStatus)}`}>
                  {alert.routeStatus}
                </span>
              </div>

              <p className="mt-2 font-semibold">{alert.title}</p>
              <p className="mt-1 text-sm leading-relaxed">{alert.message}</p>

              <div className="mt-3 grid gap-2 text-xs md:grid-cols-2">
                <p>
                  Channel: <span className="font-semibold">{alert.channel ?? "none"}</span>
                </p>
                <p>
                  Destination: <span className="font-semibold">{alert.destination ?? "not available"}</span>
                </p>
                <p>
                  Metric: <span className="font-semibold">{alert.metricLabel ?? "n/a"}</span>
                  {alert.metricValue !== null ? ` (${alert.metricValue})` : ""}
                </p>
                <p>
                  Route Note: <span className="font-semibold">{alert.routeReason}</span>
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}