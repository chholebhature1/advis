"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CircleUserRound, Loader2, LogOut, Minus, RefreshCcw, TrendingDown, TrendingUp } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import AuthPanel from "@/components/AuthPanel";
import AgentAdvisorPanel from "@/components/AgentAdvisorPanel";
import ExecutiveIntelligencePanel from "@/components/ExecutiveIntelligencePanel";
import HoldingsAnalyzerPanel from "@/components/HoldingsAnalyzerPanel";
import SmartAlertsPanel from "@/components/SmartAlertsPanel";
import TaxOptimizationPanel from "@/components/TaxOptimizationPanel";
import { DashboardSectionCard, EmptyState, StatCard, StatusBadge } from "@/components/dashboard/DashboardPrimitives";
import type { DashboardModuleKey } from "@/lib/agent/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type RiskAppetite = "conservative" | "moderate" | "aggressive";

type ProfileRow = {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  monthly_income_inr: number;
  current_savings_inr: number;
  risk_appetite: RiskAppetite;
  target_amount_inr: number;
  target_horizon_years: number;
  notes: string;
  consent_to_contact: boolean;
  source: string;
  created_at: string;
  updated_at: string;
};

type MarketIndicator = {
  id: "NIFTY50" | "BANKNIFTY" | "SENSEX";
  displayName: string;
  value: number;
  changeAbs: number;
  changePct: number;
  trend: "up" | "down" | "flat";
};

type MarketIndicatorsResponse = {
  ok: true;
  generatedAt: string;
  source: "live" | "fallback";
  indices: MarketIndicator[];
};

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function formatCurrency(value: number): string {
  return inrFormatter.format(value);
}

function formatRisk(value: RiskAppetite): string {
  if (value === "conservative") {
    return "Conservative";
  }

  if (value === "aggressive") {
    return "Aggressive";
  }

  return "Moderate";
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatIndexValue(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatSignedNumber(value: number, digits = 2): string {
  const prefix = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${prefix}${Math.abs(value).toFixed(digits)}`;
}

function formatSignedPercent(value: number): string {
  return `${formatSignedNumber(value, 2)}%`;
}

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [manualFocus, setManualFocus] = useState<DashboardModuleKey | null>(null);
  const [recommendedFocus, setRecommendedFocus] = useState<DashboardModuleKey | null>(null);
  const [marketIndicators, setMarketIndicators] = useState<MarketIndicator[]>([]);
  const [marketSource, setMarketSource] = useState<"live" | "fallback" | null>(null);
  const [marketGeneratedAt, setMarketGeneratedAt] = useState<string | null>(null);
  const [isMarketLoading, setIsMarketLoading] = useState(true);
  const [marketError, setMarketError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      setRefreshTick((current) => current + 1);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadMarketIndicators() {
      setIsMarketLoading(true);
      setMarketError(null);

      try {
        const response = await fetch("/api/market/indices", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Market API failed with status ${response.status}`);
        }

        const payload = (await response.json()) as MarketIndicatorsResponse;

        if (!cancelled) {
          setMarketIndicators(Array.isArray(payload.indices) ? payload.indices : []);
          setMarketSource(payload.source ?? "fallback");
          setMarketGeneratedAt(payload.generatedAt ?? null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setMarketError(loadError instanceof Error ? loadError.message : "Could not load market indicators.");
          setMarketSource("fallback");
        }
      } finally {
        if (!cancelled) {
          setIsMarketLoading(false);
        }
      }
    }

    void loadMarketIndicators();

    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  async function handleSignOut() {
    setIsSigningOut(true);
    setError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        throw signOutError;
      }

      setProfile(null);
      setSignedInEmail(null);
      setManualFocus(null);
      setRecommendedFocus(null);
      setRefreshTick((current) => current + 1);
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : "Could not sign out right now.");
    } finally {
      setIsSigningOut(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setIsLoading(true);
      setError(null);

      try {
        const supabase = getSupabaseBrowserClient();
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          if (!cancelled) {
            setSignedInEmail(null);
            setProfile(null);
          }
          return;
        }

        const { data, error: profileError } = await supabase
          .from("profiles")
          .select(
            "id,user_id,full_name,email,monthly_income_inr,current_savings_inr,risk_appetite,target_amount_inr,target_horizon_years,notes,consent_to_contact,source,created_at,updated_at",
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (profileError) {
          throw profileError;
        }

        if (!cancelled) {
          setSignedInEmail(user.email ?? null);
          setProfile((data?.[0] as ProfileRow | undefined) ?? null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Could not load your dashboard profile.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  useEffect(() => {
    if (!signedInEmail || !profile) {
      setManualFocus(null);
      setRecommendedFocus(null);
    }
  }, [signedInEmail, profile]);

  const latestCreatedAt = useMemo(() => formatDateTime(profile?.created_at ?? null), [profile?.created_at]);

  const latestUpdatedAt = useMemo(() => formatDateTime(profile?.updated_at ?? null), [profile?.updated_at]);

  const profileFreshness = useMemo(() => {
    if (!profile) {
      return { label: "Awaiting profile", tone: "neutral" as const };
    }

    const updatedAtMs = new Date(profile.updated_at).getTime();
    const ageInDays = Number.isFinite(updatedAtMs)
      ? Math.floor((Date.now() - updatedAtMs) / (1000 * 60 * 60 * 24))
      : 999;

    if (ageInDays <= 30) {
      return { label: "Up to date", tone: "success" as const };
    }

    if (ageInDays <= 90) {
      return { label: "Review soon", tone: "warning" as const };
    }

    return { label: "Needs review", tone: "critical" as const };
  }, [profile]);

  const targetGap = useMemo(() => {
    if (!profile) {
      return 0;
    }

    return Math.max(profile.target_amount_inr - profile.current_savings_inr, 0);
  }, [profile]);

  const greetingLabel = useMemo(() => {
    const hour = new Date().getHours();
    const dayPart = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
    const nameSource = profile?.full_name.trim() || signedInEmail?.split("@")[0] || "";

    if (nameSource) {
      return `Good ${dayPart}, ${nameSource.split(" ")[0]}`;
    }

    return `Good ${dayPart}`;
  }, [profile?.full_name, signedInEmail]);

  const marketStatus = useMemo(() => {
    if (isMarketLoading) {
      return { label: "Loading", tone: "neutral" as const };
    }

    if (marketSource === "live") {
      const suffix = marketGeneratedAt
        ? ` • ${new Date(marketGeneratedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
        : "";

      return { label: `Live feed${suffix}`, tone: "success" as const };
    }

    return { label: "Fallback feed", tone: "warning" as const };
  }, [isMarketLoading, marketGeneratedAt, marketSource]);

  const effectiveFocus = useMemo(() => manualFocus ?? recommendedFocus, [manualFocus, recommendedFocus]);

  const orderedModuleKeys = useMemo(() => {
    const baseOrder: DashboardModuleKey[] = ["alerts", "profile", "holdings", "tax", "advisor"];

    if (!effectiveFocus) {
      return baseOrder;
    }

    return [effectiveFocus, ...baseOrder.filter((moduleKey) => moduleKey !== effectiveFocus)];
  }, [effectiveFocus]);

  const getModuleContainerClassName = (moduleKey: DashboardModuleKey): string => {
    if (moduleKey === effectiveFocus) {
      return "rounded-2xl ring-2 ring-finance-accent/20 ring-offset-2 ring-offset-finance-bg shadow-[0_16px_34px_rgba(43,92,255,0.12)] transition-all duration-200";
    }

    return "rounded-2xl transition-all duration-200";
  };

  const renderSignedInModule = (moduleKey: DashboardModuleKey, activeProfile: ProfileRow) => {
    if (moduleKey === "alerts") {
      return <SmartAlertsPanel refreshKey={refreshTick} />;
    }

    if (moduleKey === "profile") {
      return (
        <DashboardSectionCard
          className="pt-1"
          eyebrow="Financial Snapshot"
          title="Your financial command snapshot"
          description="A quick status view before diving into portfolio and tax actions."
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-finance-text">{activeProfile.full_name}</p>
              <p className="text-sm text-finance-muted">{activeProfile.email}</p>
            </div>
            <StatusBadge label={profileFreshness.label} tone={profileFreshness.tone} />
          </div>

          <section className="mt-3 grid gap-3 sm:mt-4 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Monthly Income" value={formatCurrency(activeProfile.monthly_income_inr)} tone="default" />
            <StatCard label="Current Savings" value={formatCurrency(activeProfile.current_savings_inr)} tone="positive" />
            <StatCard label="Target Gap" value={formatCurrency(targetGap)} tone={targetGap > 0 ? "warning" : "positive"} />
            <StatCard
              label="Risk and Horizon"
              value={`${formatRisk(activeProfile.risk_appetite)} · ${activeProfile.target_horizon_years}y`}
              tone="info"
            />
          </section>

          <details className="mt-4 rounded-xl border border-finance-border bg-finance-surface/50 p-3.5 sm:p-4">
            <summary className="cursor-pointer text-sm font-semibold text-finance-text">
              Profile metadata and planner notes
            </summary>

            <section className="mt-3 grid gap-3 sm:gap-4 md:grid-cols-2">
              <article className="rounded-xl border border-finance-border bg-white p-3.5 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs uppercase tracking-[0.14em] text-finance-muted">Profile Metadata</p>
                  <StatusBadge
                    label={activeProfile.consent_to_contact ? "contact allowed" : "contact blocked"}
                    tone={activeProfile.consent_to_contact ? "success" : "warning"}
                  />
                </div>
                <p className="mt-2 text-sm text-finance-text">Source: {activeProfile.source}</p>
                <p className="mt-1 text-xs text-finance-muted">Captured: {latestCreatedAt}</p>
                <p className="mt-1 text-xs text-finance-muted">Last Updated: {latestUpdatedAt}</p>
              </article>

              <article className="rounded-xl border border-finance-border bg-white p-3.5 sm:p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-finance-muted">Planner Notes</p>
                <p className="mt-2 text-sm leading-relaxed text-finance-text">
                  {activeProfile.notes.trim() ? activeProfile.notes : "No additional notes provided in your latest submission."}
                </p>
              </article>
            </section>
          </details>
        </DashboardSectionCard>
      );
    }

    if (moduleKey === "holdings") {
      return (
        <HoldingsAnalyzerPanel
          refreshKey={refreshTick}
          onHoldingsChanged={() => setRefreshTick((current) => current + 1)}
        />
      );
    }

    if (moduleKey === "tax") {
      return <TaxOptimizationPanel refreshKey={refreshTick} />;
    }

    return <AgentAdvisorPanel refreshKey={refreshTick} />;
  };

  return (
    <>
      <SiteHeader />
      <div className="min-h-screen bg-finance-bg pb-12 pt-20 sm:pb-16 sm:pt-24">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <section className="rounded-xl border border-finance-border bg-white/92 px-4 py-3 shadow-[0_12px_30px_rgba(10,25,48,0.06)] backdrop-blur-md sm:px-5 sm:py-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-finance-text sm:text-base">{greetingLabel}</p>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setRefreshTick((current) => current + 1)}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-finance-border px-4 text-sm font-semibold text-finance-text transition-all duration-150 hover:bg-finance-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-finance-accent/30 active:scale-[0.98]"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Refresh
                </button>

                {signedInEmail ? (
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-finance-border px-4 text-sm font-semibold text-finance-text transition-all duration-150 hover:bg-finance-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-finance-accent/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSigningOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                    Sign Out
                  </button>
                ) : null}
              </div>
            </div>
          </section>

          <section className="mt-4 rounded-xl border border-finance-border bg-white/90 px-4 py-3.5 shadow-[0_10px_24px_rgba(10,25,48,0.05)] sm:px-5 sm:py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-finance-muted">Live Market Indicators</p>
                <p className="mt-1 text-sm font-medium text-finance-text sm:text-base">
                  NIFTY50, BANKNIFTY and SENSEX daily move
                </p>
              </div>

              <StatusBadge label={marketStatus.label} tone={marketStatus.tone} />
            </div>

            {isMarketLoading ? (
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <article
                    key={`market-skeleton-${index}`}
                    className="h-24 animate-pulse rounded-xl border border-finance-border bg-finance-surface/70"
                  />
                ))}
              </div>
            ) : (
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {marketIndicators.map((indicator) => {
                  const isUp = indicator.trend === "up";
                  const isDown = indicator.trend === "down";
                  const TrendIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
                  const toneCard = isUp
                    ? "border-finance-green/30 bg-finance-green/10"
                    : isDown
                      ? "border-finance-red/30 bg-finance-red/10"
                      : "border-finance-border bg-finance-surface/60";
                  const toneText = isUp ? "text-finance-green" : isDown ? "text-finance-red" : "text-finance-muted";

                  return (
                    <article key={indicator.id} className={`rounded-xl border p-3.5 sm:p-4 ${toneCard}`}>
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-xs uppercase tracking-[0.12em] text-finance-muted">{indicator.displayName}</p>
                        <TrendIcon className={`h-4 w-4 ${toneText}`} />
                      </div>

                      <p className="mt-2 text-xl font-semibold text-finance-text sm:text-2xl">
                        {formatIndexValue(indicator.value)}
                      </p>

                      <p className={`mt-1 text-sm font-medium ${toneText}`}>
                        {formatSignedPercent(indicator.changePct)} ({formatSignedNumber(indicator.changeAbs, 2)} pts)
                      </p>
                    </article>
                  );
                })}
              </div>
            )}

            {!isMarketLoading && marketIndicators.length === 0 ? (
              <p className="mt-3 text-xs text-finance-muted">No market indicators available right now.</p>
            ) : null}

            {marketError ? <p className="mt-3 text-xs text-finance-red">Market feed warning: {marketError}</p> : null}
          </section>

          {isLoading && (
            <DashboardSectionCard
              className="mt-5 sm:mt-6"
              eyebrow="Overview"
              title="Preparing your dashboard"
              description="Loading authenticated profile and advisory context."
            >
              <div className="flex items-center gap-3 text-finance-muted">
                <Loader2 className="h-5 w-5 animate-spin" />
                <p>Loading your profile snapshot...</p>
              </div>
            </DashboardSectionCard>
          )}

          {!isLoading && error && (
            <DashboardSectionCard
              className="mt-5 sm:mt-6"
              eyebrow="Overview"
              title="Dashboard temporarily unavailable"
              description="We could not fetch profile details right now."
            >
              <div className="rounded-xl border border-finance-red/25 bg-finance-red/10 p-4 text-finance-red">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5" />
                  <div>
                    <p className="font-semibold">Unable to load dashboard data</p>
                    <p className="mt-1 text-sm">{error}</p>
                  </div>
                </div>
              </div>
            </DashboardSectionCard>
          )}

          {!isLoading && !error && !signedInEmail && (
            <DashboardSectionCard
              className="mt-5 sm:mt-6"
              eyebrow="Overview"
              title="Sign in to activate your dashboard"
              description="Authentication unlocks personalized profile, alerts, and advisor modules."
            >
              <div className="flex items-start gap-3">
                <CircleUserRound className="h-5 w-5 mt-0.5 text-finance-muted" />
                <div>
                  <p className="font-semibold text-finance-text">You are not signed in</p>
                  <p className="mt-1 text-sm text-finance-muted">
                    Sign in to reliably view your own profile and plan inputs on this dashboard.
                  </p>
                  <AuthPanel onSignedIn={() => setRefreshTick((current) => current + 1)} />
                </div>
              </div>
            </DashboardSectionCard>
          )}

          {!isLoading && !error && signedInEmail && !profile && (
            <DashboardSectionCard
              className="mt-5 sm:mt-6"
              eyebrow="Overview"
              title="Complete onboarding to enable insights"
              description={`No profile rows are available yet for ${signedInEmail}.`}
            >
              <EmptyState
                title="Your personalized dashboard is waiting"
                description="Complete onboarding while signed in, then refresh this page to unlock profile and module analytics."
                action={
                  <Link
                    href="/onboarding"
                    className="inline-flex h-10 items-center rounded-full bg-finance-accent px-4 text-sm font-semibold text-white transition-all duration-150 hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-finance-accent/40 active:scale-[0.98]"
                  >
                    Complete Onboarding
                  </Link>
                }
              />
            </DashboardSectionCard>
          )}

          {!isLoading && !error && signedInEmail && profile && (
            <div className="mt-5 space-y-5 sm:mt-6 sm:space-y-6">
              <ExecutiveIntelligencePanel
                refreshKey={refreshTick}
                manualFocus={manualFocus}
                effectiveFocus={effectiveFocus}
                onFocusChange={setManualFocus}
                onRecommendedFocusChange={setRecommendedFocus}
              />

              {orderedModuleKeys.map((moduleKey) => (
                <div key={moduleKey} className={getModuleContainerClassName(moduleKey)}>
                  {renderSignedInModule(moduleKey, profile)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

