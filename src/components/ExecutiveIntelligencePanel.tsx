"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, RefreshCcw } from "lucide-react";
import {
  DashboardSectionCard,
  EmptyState,
  StatCard,
  StatusBadge,
} from "@/components/dashboard/DashboardPrimitives";
import type { DashboardIntelligenceSnapshot, DashboardModuleKey } from "@/lib/agent/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type ExecutiveIntelligencePanelProps = {
  refreshKey: number;
  manualFocus: DashboardModuleKey | null;
  effectiveFocus: DashboardModuleKey | null;
  onFocusChange: (focus: DashboardModuleKey | null) => void;
  onRecommendedFocusChange: (focus: DashboardModuleKey) => void;
};

type IntelligenceApiPayload = {
  ok?: boolean;
  snapshot?: DashboardIntelligenceSnapshot;
  error?: string;
};

const moduleLabel: Record<DashboardModuleKey, string> = {
  alerts: "Alerts",
  profile: "Profile",
  holdings: "Holdings",
  tax: "Tax",
  advisor: "Copilot",
};

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatRate(value: number | null): string {
  if (value === null) {
    return "N/A";
  }

  return value.toFixed(3);
}

function formatPercent(value: number | null): string {
  if (value === null) {
    return "N/A";
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(3)}%`;
}

function confidenceTone(value: DashboardIntelligenceSnapshot["focusConfidence"]) {
  if (value === "high") {
    return "positive" as const;
  }

  if (value === "medium") {
    return "warning" as const;
  }

  return "default" as const;
}

export default function ExecutiveIntelligencePanel({
  refreshKey,
  manualFocus,
  effectiveFocus,
  onFocusChange,
  onRecommendedFocusChange,
}: ExecutiveIntelligencePanelProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<DashboardIntelligenceSnapshot | null>(null);

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

  const loadIntelligence = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await getAccessToken();
      const response = await fetch("/api/agent/intelligence", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = (await response.json().catch(() => ({}))) as IntelligenceApiPayload;
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not load executive intelligence.");
      }

      const nextSnapshot = payload.snapshot ?? null;
      setSnapshot(nextSnapshot);

      if (nextSnapshot?.recommendedFocus) {
        onRecommendedFocusChange(nextSnapshot.recommendedFocus);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load executive intelligence.");
      setSnapshot(null);
    } finally {
      setIsLoading(false);
    }
  }, [getAccessToken, onRecommendedFocusChange]);

  useEffect(() => {
    void loadIntelligence();
  }, [loadIntelligence, refreshKey]);

  const sentimentStatus = snapshot?.market.sentimentSourceStatus ?? "fallback";
  const fxStatus = snapshot?.market.fxSourceStatus ?? "fallback";

  const sortedPriorities = useMemo(() => snapshot?.priorities ?? [], [snapshot]);

  return (
    <DashboardSectionCard
      eyebrow="Executive Intelligence"
      title="Market pulse and relevance ranking"
      description="Power BI-style command strip using free macro signals + your profile context to prioritize execution."
      actions={
        <button
          type="button"
          onClick={() => void loadIntelligence()}
          disabled={isLoading}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-finance-border px-4 text-sm font-semibold text-finance-text transition-all duration-150 hover:bg-finance-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-finance-accent/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          Refresh Intelligence
        </button>
      }
    >
      {error ? (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-finance-red/25 bg-finance-red/10 p-3 text-sm text-finance-red sm:p-3.5">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          <p>{error}</p>
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-finance-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Computing executive priorities...
        </div>
      ) : !snapshot ? (
        <div className="mt-3">
          <EmptyState
            title="Executive intelligence is not ready"
            description="Refresh after signing in to load market pulse and module relevance scores."
          />
        </div>
      ) : (
        <>
          <section className="mt-2 grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Fear and Greed"
              value={snapshot.market.fearGreedIndex ?? "N/A"}
              hint={snapshot.market.fearGreedLabel}
              tone={
                snapshot.market.fearGreedIndex !== null && snapshot.market.fearGreedIndex <= 30
                  ? "warning"
                  : snapshot.market.fearGreedIndex !== null && snapshot.market.fearGreedIndex >= 70
                    ? "positive"
                    : "default"
              }
            />
            <StatCard
              label="USD/INR"
              value={formatRate(snapshot.market.usdInr)}
              hint={snapshot.market.usdInrPrevClose !== null ? `Prev ${snapshot.market.usdInrPrevClose.toFixed(3)}` : "Prev N/A"}
              tone="info"
            />
            <StatCard
              label="FX Move"
              value={formatPercent(snapshot.market.usdInrChangePct)}
              hint="vs previous close"
              tone={
                snapshot.market.usdInrChangePct !== null && Math.abs(snapshot.market.usdInrChangePct) >= 0.35
                  ? "warning"
                  : "default"
              }
            />
            <StatCard
              label="Focus Confidence"
              value={snapshot.focusConfidence.toUpperCase()}
              hint={`Auto: ${moduleLabel[snapshot.recommendedFocus]}`}
              tone={confidenceTone(snapshot.focusConfidence)}
            />
          </section>

          <div className="mt-4 rounded-xl border border-finance-border bg-finance-surface/60 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                label={`sentiment ${sentimentStatus}`}
                tone={sentimentStatus === "live" ? "success" : "warning"}
              />
              <StatusBadge label={`fx ${fxStatus}`} tone={fxStatus === "live" ? "success" : "warning"} />
              <span className="text-xs text-finance-muted">Generated {formatDateTime(snapshot.generatedAt)}</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-finance-text">{snapshot.executiveSummary}</p>
          </div>

          <div className="mt-4 rounded-xl border border-finance-border bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-finance-text">Module relevance ranking</p>
              <p className="text-xs text-finance-muted">Click to change dashboard focus</p>
            </div>

            <div className="mt-3 space-y-3">
              {sortedPriorities.map((priority) => {
                const isActive = effectiveFocus === priority.module;
                const scoreWidth = Math.max(6, Math.min(100, priority.score));

                return (
                  <button
                    key={priority.module}
                    type="button"
                    onClick={() => onFocusChange(priority.module)}
                    className={`w-full rounded-xl border p-3.5 text-left transition-all duration-150 sm:p-4 ${
                      isActive
                        ? "border-finance-accent bg-finance-accent/10 shadow-[0_6px_18px_rgba(43,92,255,0.14)]"
                        : "border-finance-border bg-finance-surface/40 hover:bg-finance-surface"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-finance-text">{moduleLabel[priority.module]} · {priority.title}</p>
                      <span className="text-xs font-semibold text-finance-muted">{priority.score}/100</span>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-finance-border-soft">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#2b5cff_0%,#3f73ff_100%)]"
                        style={{ width: `${scoreWidth}%` }}
                        aria-label={`${priority.module} score`}
                      />
                    </div>

                    <p className="mt-2 text-sm text-finance-text">{priority.rationale}</p>
                    <p className="mt-1 text-xs text-finance-muted">Next: {priority.suggestedAction}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onFocusChange(null)}
              className={`inline-flex h-9 items-center rounded-full border px-3.5 text-xs font-semibold transition-all duration-150 ${
                manualFocus === null
                  ? "border-finance-accent bg-finance-accent/10 text-finance-accent"
                  : "border-finance-border bg-white text-finance-text hover:bg-finance-surface"
              }`}
            >
              Auto Focus ({moduleLabel[snapshot.recommendedFocus]})
            </button>
            {sortedPriorities.map((priority) => (
              <button
                key={`focus-${priority.module}`}
                type="button"
                onClick={() => onFocusChange(priority.module)}
                className={`inline-flex h-9 items-center rounded-full border px-3.5 text-xs font-semibold transition-all duration-150 ${
                  manualFocus === priority.module
                    ? "border-finance-accent bg-finance-accent/10 text-finance-accent"
                    : "border-finance-border bg-white text-finance-text hover:bg-finance-surface"
                }`}
              >
                Focus {moduleLabel[priority.module]}
              </button>
            ))}
          </div>

          <p className="mt-3 text-xs text-finance-muted">{snapshot.disclaimer}</p>
        </>
      )}
    </DashboardSectionCard>
  );
}

