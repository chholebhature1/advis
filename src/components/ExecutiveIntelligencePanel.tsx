"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, RefreshCcw } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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

type MarketIndicator = {
  id: string;
  displayName: string;
  value: number;
  changeAbs: number;
  changePct: number;
  trend: "up" | "down" | "flat";
};

type MarketIndicatorsResponse = {
  ok?: boolean;
  generatedAt?: string;
  source?: "live" | "fallback";
  indices?: MarketIndicator[];
};

type MarketTrendPoint = {
  label: string;
  close: number;
};

type MarketTrendResponse = {
  ok?: boolean;
  generatedAt?: string;
  source?: "live" | "fallback";
  symbol?: string;
  points?: MarketTrendPoint[];
};

type DashboardHorizon = "12m" | "24m" | "36m";

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

function formatIndexNumber(value: number): string {
  return value.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
}

function formatSignedNumber(value: number, digits = 2): string {
  const prefix = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${prefix}${Math.abs(value).toFixed(digits)}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function horizonLabel(horizon: DashboardHorizon): string {
  if (horizon === "24m") {
    return "24M";
  }

  if (horizon === "36m") {
    return "36M";
  }

  return "12M";
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
  const [marketIndices, setMarketIndices] = useState<MarketIndicatorsResponse | null>(null);
  const [marketTrend, setMarketTrend] = useState<MarketTrendResponse | null>(null);
  const [selectedHorizon, setSelectedHorizon] = useState<DashboardHorizon>("12m");

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
      const [intelligenceResult, indicesResult, trendResult] = await Promise.allSettled([
        fetch("/api/agent/intelligence", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch("/api/market/indices", {
          method: "GET",
          cache: "no-store",
        }),
        fetch(`/api/market/indices/history?horizon=${selectedHorizon}`, {
          method: "GET",
          cache: "no-store",
        }),
      ]);

      if (intelligenceResult.status !== "fulfilled") {
        throw new Error("Could not load executive intelligence.");
      }

      const payload = (await intelligenceResult.value.json().catch(() => ({}))) as IntelligenceApiPayload;
      if (!intelligenceResult.value.ok) {
        throw new Error(payload.error ?? "Could not load executive intelligence.");
      }

      const nextSnapshot = payload.snapshot ?? null;
      setSnapshot(nextSnapshot);

      if (nextSnapshot?.recommendedFocus) {
        onRecommendedFocusChange(nextSnapshot.recommendedFocus);
      }

      if (indicesResult.status === "fulfilled") {
        const indicesPayload = (await indicesResult.value.json().catch(() => ({}))) as MarketIndicatorsResponse;
        setMarketIndices(indicesResult.value.ok && indicesPayload.ok ? indicesPayload : null);
      } else {
        setMarketIndices(null);
      }

      if (trendResult.status === "fulfilled") {
        const trendPayload = (await trendResult.value.json().catch(() => ({}))) as MarketTrendResponse;
        setMarketTrend(trendResult.value.ok && trendPayload.ok ? trendPayload : null);
      } else {
        setMarketTrend(null);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load executive intelligence.");
      setSnapshot(null);
      setMarketIndices(null);
      setMarketTrend(null);
    } finally {
      setIsLoading(false);
    }
  }, [getAccessToken, onRecommendedFocusChange, selectedHorizon]);

  useEffect(() => {
    void loadIntelligence();
  }, [loadIntelligence, refreshKey]);

  useEffect(() => {
    let cancelled = false;

    async function refreshIndices() {
      try {
        const response = await fetch(`/api/market/indices?ts=${Date.now()}`, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Market indices API failed with status ${response.status}`);
        }

        const payload = (await response.json().catch(() => ({}))) as MarketIndicatorsResponse;
        if (!cancelled) {
          setMarketIndices(response.ok && payload.ok ? payload : null);
        }
      } catch {
        if (!cancelled) {
          setMarketIndices(null);
        }
      }
    }

    void refreshIndices();
    const refreshTimer = window.setInterval(() => {
      void refreshIndices();
    }, 500);

    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
    };
  }, []);

  const sentimentStatus = snapshot?.market.sentimentSourceStatus ?? "fallback";
  const fxStatus = snapshot?.market.fxSourceStatus ?? "fallback";
  const indicesStatus = marketIndices?.source ?? "fallback";
  const trendStatus = marketTrend?.source ?? "fallback";

  const sortedPriorities = useMemo(() => snapshot?.priorities ?? [], [snapshot]);
  const indexCards = useMemo(() => marketIndices?.indices ?? [], [marketIndices]);
  const trendPoints = useMemo(() => marketTrend?.points ?? [], [marketTrend]);
  const miniTrendPoints = useMemo(() => trendPoints.slice(-24), [trendPoints]);
  const horizonOptions: DashboardHorizon[] = ["12m", "24m", "36m"];
  const trendDeltaLabel = useMemo(() => {
    if (trendPoints.length < 2) {
      return "N/A";
    }

    const first = trendPoints[0]?.close ?? null;
    const last = trendPoints[trendPoints.length - 1]?.close ?? null;

    if (first === null || last === null || first <= 0) {
      return "N/A";
    }

    const abs = last - first;
    const pct = (abs / first) * 100;

    return `${formatSignedNumber(abs, 2)} (${formatSignedNumber(pct, 2)}%)`;
  }, [trendPoints]);

  const breadthProxy = useMemo(() => {
    if (!snapshot || indexCards.length === 0) {
      return null;
    }

    const advances = indexCards.filter((item) => item.changePct > 0).length;
    const declines = indexCards.filter((item) => item.changePct < 0).length;
    const avgIndexMove = indexCards.reduce((sum, item) => sum + item.changePct, 0) / indexCards.length;

    const fearGreed = snapshot.market.fearGreedIndex ?? 50;
    const fearGreedAdj = ((fearGreed - 50) / 50) * 20;
    const fxMove = snapshot.market.usdInrChangePct ?? 0;

    const first = trendPoints[0]?.close ?? null;
    const last = trendPoints[trendPoints.length - 1]?.close ?? null;
    const trendPct = first && first > 0 && last ? ((last - first) / first) * 100 : 0;

    const trendAdj = clamp(trendPct, -12, 12);
    const rawScore = 50 + avgIndexMove * 9 + fearGreedAdj - fxMove * 5 + trendAdj;
    const score = Math.round(clamp(rawScore, 0, 100));

    const universe = 500;
    const proxyAdvances = Math.round((score / 100) * universe);
    const proxyDeclines = universe - proxyAdvances;

    const regime =
      score >= 68
        ? "Broad Risk-On"
        : score <= 38
          ? "Defensive / Risk-Off"
          : "Mixed / Rotation";

    return {
      score,
      advances,
      declines,
      proxyAdvances,
      proxyDeclines,
      regime,
      avgIndexMove,
    };
  }, [indexCards, snapshot, trendPoints]);

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
              <StatusBadge label={`indices ${indicesStatus}`} tone={indicesStatus === "live" ? "success" : "warning"} />
              <StatusBadge label={`trend ${trendStatus}`} tone={trendStatus === "live" ? "success" : "warning"} />
              <span className="text-xs text-finance-muted">Generated {formatDateTime(snapshot.generatedAt)}</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-finance-text">{snapshot.executiveSummary}</p>
          </div>

          <div className="mt-4 grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
            {indexCards.map((indexItem) => {
              const gradientId = `miniSpark-${indexItem.id}`;

              return (
                <article
                  key={indexItem.id}
                  className="rounded-xl border border-finance-border bg-finance-panel p-5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(10,25,48,0.08)] sm:p-6"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs sm:text-sm font-medium text-finance-muted">{indexItem.displayName}</p>
                    <StatusBadge
                      label={indexItem.trend}
                      tone={indexItem.trend === "up" ? "success" : indexItem.trend === "down" ? "critical" : "neutral"}
                      className="px-2 py-0.5 text-[9px]"
                    />
                  </div>
                  <p className="mt-2 text-lg font-semibold text-finance-text sm:mt-2.5 sm:text-xl">
                    {formatIndexNumber(indexItem.value)}
                  </p>
                  <p className="mt-1 text-xs text-finance-muted">
                    {formatSignedNumber(indexItem.changeAbs)} • {formatSignedNumber(indexItem.changePct)}%
                  </p>

                  <div className="mt-3 h-14">
                    {miniTrendPoints.length > 1 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={miniTrendPoints} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={indexItem.trend === "down" ? "#dc2626" : "#2b5cff"} stopOpacity={0.28} />
                              <stop offset="95%" stopColor={indexItem.trend === "down" ? "#dc2626" : "#2b5cff"} stopOpacity={0.04} />
                            </linearGradient>
                          </defs>
                          <Tooltip
                            formatter={(value) => [formatIndexNumber(Number(value ?? 0)), "NIFTY Proxy"]}
                            contentStyle={{ backgroundColor: "#f7f9ff", borderColor: "#c5d8fb", borderRadius: "10px" }}
                            labelStyle={{ color: "#173a85" }}
                            itemStyle={{ color: "#3f66ab" }}
                          />
                          <Area
                            type="monotone"
                            dataKey="close"
                            stroke={indexItem.trend === "down" ? "#dc2626" : "#2b5cff"}
                            strokeWidth={1.8}
                            fill={`url(#${gradientId})`}
                            dot={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center rounded-lg border border-finance-border bg-white text-[11px] text-finance-muted">
                        Sparkline unavailable
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          {breadthProxy ? (
            <div className="mt-4 grid gap-3 sm:gap-4 md:grid-cols-3">
              <StatCard
                label="Breadth Proxy Score"
                value={`${breadthProxy.score}/100`}
                hint={`${breadthProxy.regime} • avg index move ${formatSignedNumber(breadthProxy.avgIndexMove)}%`}
                tone={breadthProxy.score >= 65 ? "positive" : breadthProxy.score <= 35 ? "critical" : "warning"}
              />
              <StatCard
                label="Index Adv / Dec"
                value={`${breadthProxy.advances} / ${breadthProxy.declines}`}
                hint="Based on tracked benchmark indices"
                tone={breadthProxy.advances > breadthProxy.declines ? "positive" : breadthProxy.advances < breadthProxy.declines ? "critical" : "default"}
              />
              <StatCard
                label="Proxy Market Breadth"
                value={`${breadthProxy.proxyAdvances} / ${breadthProxy.proxyDeclines}`}
                hint="Derived broad-market proxy (non-exchange official)"
                tone={breadthProxy.proxyAdvances > breadthProxy.proxyDeclines ? "positive" : "warning"}
              />
            </div>
          ) : null}

          <div className="mt-4 rounded-xl border border-finance-border bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-finance-text">NIFTY 50 trend ({horizonLabel(selectedHorizon)})</p>
              <p className="text-xs text-finance-muted">Change: {trendDeltaLabel}</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {horizonOptions.map((horizon) => (
                <button
                  key={horizon}
                  type="button"
                  onClick={() => setSelectedHorizon(horizon)}
                  disabled={isLoading}
                  className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-semibold transition-colors ${
                    selectedHorizon === horizon
                      ? "border-[#2b5cff] bg-[#edf4ff] text-[#2b5cff]"
                      : "border-finance-border bg-white text-finance-muted hover:bg-finance-surface"
                  } disabled:cursor-not-allowed disabled:opacity-70`}
                >
                  {horizonLabel(horizon)}
                </button>
              ))}
            </div>
            <div className="mt-3 h-56">
              {trendPoints.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendPoints} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="executiveTrendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2b5cff" stopOpacity={0.32} />
                        <stop offset="95%" stopColor="#2b5cff" stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d7e6ff" />
                    <XAxis dataKey="label" stroke="#6d86b4" fontSize={11} minTickGap={24} />
                    <YAxis stroke="#6d86b4" fontSize={11} domain={["dataMin - 80", "dataMax + 80"]} />
                    <Tooltip
                      formatter={(value) => [formatIndexNumber(Number(value ?? 0)), "Close"]}
                      contentStyle={{ backgroundColor: "#f7f9ff", borderColor: "#c5d8fb", borderRadius: "10px" }}
                      labelStyle={{ color: "#173a85" }}
                      itemStyle={{ color: "#3f66ab" }}
                    />
                    <Area type="monotone" dataKey="close" stroke="#2b5cff" strokeWidth={2.4} fill="url(#executiveTrendFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-xl border border-finance-border bg-finance-surface/40 text-sm text-finance-muted">
                  Trend data unavailable right now.
                </div>
              )}
            </div>
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

          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-finance-border bg-finance-surface/40 p-2.5">
            <button
              type="button"
              onClick={() => onFocusChange(null)}
              className={`inline-flex h-9 items-center rounded-full border px-3.5 text-xs font-semibold transition-all duration-150 ${
                manualFocus === null
                  ? "border-[#2b5cff] bg-[linear-gradient(135deg,#2b5cff_0%,#1f46cf_100%)] text-white shadow-[0_8px_18px_rgba(43,92,255,0.32)]"
                  : "border-[#c8d8f6] bg-white text-[#2a3f63] hover:border-[#adc5f4] hover:bg-[#f4f8ff]"
              }`}
            >
              Auto Focus ({moduleLabel[snapshot.recommendedFocus]})
            </button>
            {sortedPriorities.map((priority) => {
              const isManualSelected = manualFocus === priority.module;
              const isRecommended = snapshot.recommendedFocus === priority.module;

              return (
                <button
                  key={`focus-${priority.module}`}
                  type="button"
                  onClick={() => onFocusChange(priority.module)}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition-all duration-150 ${
                    isManualSelected
                      ? "border-[#2b5cff] bg-[linear-gradient(135deg,#2b5cff_0%,#1f46cf_100%)] text-white shadow-[0_8px_18px_rgba(43,92,255,0.32)]"
                      : isRecommended
                        ? "border-[#f0c772]/65 bg-[#fff6de] text-[#7d5f1f] shadow-[0_4px_12px_rgba(240,199,114,0.24)]"
                        : "border-[#c8d8f6] bg-white text-[#2a3f63] hover:border-[#adc5f4] hover:bg-[#f4f8ff]"
                  }`}
                >
                  Focus {moduleLabel[priority.module]}
                  {isRecommended ? (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] ${
                        isManualSelected ? "bg-white/20 text-white" : "bg-[#f8df9f] text-[#7a5914]"
                      }`}
                    >
                      AI
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <p className="mt-3 text-xs text-finance-muted">{snapshot.disclaimer}</p>
        </>
      )}
    </DashboardSectionCard>
  );
}

