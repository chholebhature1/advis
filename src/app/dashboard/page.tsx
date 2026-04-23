"use client";


import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  BarChart3,
  CircleDot,
  CircleUserRound,
  BellRing,
  LayoutGrid,
  ListFilter,
  Loader2,
  LogOut,
  RefreshCcw,
  Search,
  Share2,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  WalletMinimal,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import SiteHeader from "@/components/SiteHeader";
import AuthPanel from "@/components/AuthPanel";
import RequireAuth from "@/components/RequireAuth";
import AgentAdvisorPanel from "@/components/AgentAdvisorPanel";
import ExecutiveIntelligencePanel from "@/components/ExecutiveIntelligencePanel";
import HoldingsAnalyzerPanel from "@/components/HoldingsAnalyzerPanel";
import SmartAlertsPanel from "@/components/SmartAlertsPanel";
import TaxOptimizationPanel from "@/components/TaxOptimizationPanel";
import { DashboardSectionCard, StatCard, StatusBadge } from "@/components/dashboard/DashboardPrimitives";
import type { DashboardIntelligenceSnapshot, DashboardModuleKey } from "@/lib/agent/types";
import type { TaxOptimizationSummary } from "@/lib/agent/tax-optimization";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type RiskAppetite = "conservative" | "moderate" | "aggressive";

type ProfileRow = {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  phone_e164: string | null;
  city: string | null;
  state: string | null;
  occupation_title: string | null;
  employment_type: string | null;
  monthly_income_inr: number;
  monthly_expenses_inr: number;
  monthly_emi_inr: number;
  monthly_investable_surplus_inr: number;
  current_savings_inr: number;
  emergency_fund_months: number;
  loss_tolerance_pct: number | null;
  risk_appetite: RiskAppetite;
  tax_regime: "old" | "new" | null;
  kyc_status: "not_started" | "pending" | "verified" | "rejected" | string;
  target_amount_inr: number;
  target_horizon_years: number;
  notes: string;
  consent_to_contact: boolean;
  source: string;
  onboarding_completed_at: string | null;
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

type HoldingsExposure = {
  name: string;
  value: number;
  marketValueInr: number;
};

type HoldingsAnalyticsSnapshot = {
  totalMarketValueInr: number;
  totalCostValueInr: number;
  totalUnrealizedPnlInr: number;
  totalUnrealizedPnlPct: number | null;
  allocationByAssetClass: HoldingsExposure[];
  sectorExposure: HoldingsExposure[];
  concentrationWarnings: Array<{
    id: string;
    severity: "low" | "medium" | "high";
    title: string;
    message: string;
    metricPct: number | null;
  }>;
};

type HoldingsApiPayload = {
  ok?: boolean;
  holdings?: Array<{ id: string }>;
  analytics?: HoldingsAnalyticsSnapshot;
  error?: string;
};

type AlertsSummarySnapshot = {
  evaluatedUserCount: number;
  triggeredCount: number;
  readyCount: number;
  deferredCount: number;
  blockedCount: number;
  suppressedCount: number;
};

type AlertsSubscriptionSnapshot = {
  plan: "free" | "starter" | "pro";
  status: "trialing" | "active" | "past_due" | "canceled" | "paused";
  isPaidPlan: boolean;
  canUseWhatsappChannel: boolean;
  upgradeMessage: string | null;
};

type AlertsApiPayload = {
  ok?: boolean;
  summary?: AlertsSummarySnapshot;
  subscription?: AlertsSubscriptionSnapshot;
  error?: string;
};

type IntelligenceApiPayload = {
  ok?: boolean;
  snapshot?: DashboardIntelligenceSnapshot;
  error?: string;
};

type TaxApiPayload = {
  ok?: boolean;
  summary?: TaxOptimizationSummary;
  error?: string;
};

type AgentDashboardPayload = {
  ok?: boolean;
  aiSummary?: string;
  error?: string;
};

type DashboardHorizon = "1y" | "2y" | "3y" | "custom";
type DashboardLens = "goal" | "cashflow" | "risk";
type KpiDeltaTone = "positive" | "negative" | "neutral";
type DashboardKpiItem = {
  id: string;
  label: string;
  value: string;
  hint: string;
  deltaLabel: string;
  deltaTone: KpiDeltaTone;
  detail: string;
  source: string;
};
type TrendPoint = { label: string; value: number };
type InsightTone = "neutral" | "positive" | "warning" | "critical";
type ScenarioCard = {
  label: string;
  annualReturnPct: number;
  projectedValue: number;
  gainInr: number;
  gainPct: number;
  tone: InsightTone;
};
type ActionQueueItem = {
  title: string;
  detail: string;
  badge: string;
  tone: InsightTone;
};
type MarketPulseItem = {
  label: string;
  value: string;
  detail: string;
  tone: InsightTone;
};

const motionEase = [0.22, 1, 0.36, 1] as const;

const SCENARIO_RETURN_PCT = {
  conservative: 8,
  moderate: 11,
  aggressive: 14,
} as const;
type MarketTrendPoint = { label: string; close: number };
type MarketTrendResponse = {
  ok: true;
  generatedAt: string;
  source: "live" | "fallback";
  symbol: "NIFTY50";
  horizon: DashboardHorizon;
  points: MarketTrendPoint[];
};

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const compactInrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatCurrency(value: number): string {
  return inrFormatter.format(value);
}

function formatCompactCurrency(value: number): string {
  return compactInrFormatter.format(value);
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

function formatSignedNumber(value: number, digits = 2): string {
  const prefix = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${prefix}${Math.abs(value).toFixed(digits)}`;
}

function formatSignedPercent(value: number): string {
  return `${formatSignedNumber(value, 2)}%`;
}

function formatIndexNumber(value: number): string {
  return value.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
}

function parseNumberInput(value: string, fallback = 0): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toHorizonMonths(horizon: DashboardHorizon, customYears: number): number {
  if (horizon === "1y") {
    return 12;
  }

  if (horizon === "2y") {
    return 24;
  }

  if (horizon === "3y") {
    return 36;
  }

  return Math.max(1, Math.round(customYears)) * 12;
}

function toHorizonLabel(horizon: DashboardHorizon, customYears: number): string {
  if (horizon === "1y") {
    return "1 year";
  }

  if (horizon === "2y") {
    return "2 years";
  }

  if (horizon === "3y") {
    return "3 years";
  }

  const normalizedYears = Math.max(1, Math.round(customYears));
  return `${normalizedYears} year${normalizedYears === 1 ? "" : "s"} (custom)`;
}

function projectCorpusValue(
  currentCorpus: number,
  monthlyContribution: number,
  annualReturnPct: number,
  months: number,
): number {
  const safeCorpus = Math.max(currentCorpus, 0);
  const safeContribution = Math.max(monthlyContribution, 0);
  const safeMonths = Math.max(months, 0);
  const monthlyRate = Math.max(annualReturnPct, 0) / 12 / 100;

  if (safeMonths === 0) {
    return safeCorpus;
  }

  if (monthlyRate === 0) {
    return safeCorpus + safeContribution * safeMonths;
  }

  const corpusGrowth = safeCorpus * Math.pow(1 + monthlyRate, safeMonths);
  const sipGrowth = safeContribution * (((Math.pow(1 + monthlyRate, safeMonths) - 1) / monthlyRate) * (1 + monthlyRate));

  return corpusGrowth + sipGrowth;
}

function toneToClassName(tone: KpiDeltaTone): string {
  if (tone === "positive") {
    return "text-finance-green";
  }

  if (tone === "negative") {
    return "text-finance-red";
  }

  return "text-finance-muted";
}

function insightToneToBadgeTone(tone: InsightTone): "neutral" | "success" | "warning" | "critical" | "info" {
  if (tone === "positive") {
    return "success";
  }

  if (tone === "warning") {
    return "warning";
  }

  if (tone === "critical") {
    return "critical";
  }

  return "neutral";
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
  const [isPowerInsightsLoading, setIsPowerInsightsLoading] = useState(false);
  const [powerInsightsError, setPowerInsightsError] = useState<string | null>(null);
  const [intelligenceSnapshot, setIntelligenceSnapshot] = useState<DashboardIntelligenceSnapshot | null>(null);
  const [holdingsAnalytics, setHoldingsAnalytics] = useState<HoldingsAnalyticsSnapshot | null>(null);
  const [holdingsCount, setHoldingsCount] = useState(0);
  const [taxSummary, setTaxSummary] = useState<TaxOptimizationSummary | null>(null);
  const [alertsSummary, setAlertsSummary] = useState<AlertsSummarySnapshot | null>(null);
  const [alertsSubscription, setAlertsSubscription] = useState<AlertsSubscriptionSnapshot | null>(null);
  const [advisorSummary, setAdvisorSummary] = useState<string | null>(null);
  const [selectedHorizon, setSelectedHorizon] = useState<DashboardHorizon>("1y");
  const [customHorizonYears, setCustomHorizonYears] = useState(5);
  const [selectedLens, setSelectedLens] = useState<DashboardLens>("goal");
  const [selectedKpiId, setSelectedKpiId] = useState<string | null>(null);
  const [marketTrend, setMarketTrend] = useState<MarketTrendPoint[]>([]);
  const [marketTrendSource, setMarketTrendSource] = useState<"live" | "fallback" | null>(null);
  const [marketTrendGeneratedAt, setMarketTrendGeneratedAt] = useState<string | null>(null);
  const [isMarketTrendLoading, setIsMarketTrendLoading] = useState(true);
  const [sipMonthlyAmount, setSipMonthlyAmount] = useState(10000);
  const [sipAnnualReturn, setSipAnnualReturn] = useState(12);
  const [sipDurationYears, setSipDurationYears] = useState(10);
  const [isCompactMotion, setIsCompactMotion] = useState(false);

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

    async function loadMarketIndicators(showLoadingState: boolean) {
      if (showLoadingState) {
        setIsMarketLoading(true);
      }
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

    void loadMarketIndicators(true);
    const refreshTimer = window.setInterval(() => {
      void loadMarketIndicators(false);
    }, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
    };
  }, [refreshTick]);

  useEffect(() => {
    let cancelled = false;

    async function loadMarketTrend() {
      setIsMarketTrendLoading(true);

      const horizonQuery = selectedHorizon === "custom"
        ? `custom&years=${Math.max(1, Math.round(customHorizonYears))}`
        : selectedHorizon;

      try {
        const response = await fetch(`/api/market/indices/history?horizon=${horizonQuery}`, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Market trend API failed with status ${response.status}`);
        }

        const payload = (await response.json()) as MarketTrendResponse;

        if (!cancelled) {
          setMarketTrend(Array.isArray(payload.points) ? payload.points : []);
          setMarketTrendSource(payload.source ?? "fallback");
          setMarketTrendGeneratedAt(payload.generatedAt ?? null);
        }
      } catch {
        if (!cancelled) {
          setMarketTrend([]);
          setMarketTrendSource("fallback");
        }
      } finally {
        if (!cancelled) {
          setIsMarketTrendLoading(false);
        }
      }
    }

    void loadMarketTrend();

    return () => {
      cancelled = true;
    };
  }, [refreshTick, selectedHorizon, customHorizonYears]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");

    const updateMotionDensity = () => {
      setIsCompactMotion(mediaQuery.matches);
    };

    updateMotionDensity();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updateMotionDensity);

      return () => {
        mediaQuery.removeEventListener("change", updateMotionDensity);
      };
    }

    mediaQuery.addListener(updateMotionDensity);

    return () => {
      mediaQuery.removeListener(updateMotionDensity);
    };
  }, []);

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

  useEffect(() => {
    let cancelled = false;

    async function loadPowerInsights() {
      if (!signedInEmail) {
        setIsPowerInsightsLoading(false);
        setPowerInsightsError(null);
        setIntelligenceSnapshot(null);
        setHoldingsAnalytics(null);
        setHoldingsCount(0);
        setTaxSummary(null);
        setAlertsSummary(null);
        setAlertsSubscription(null);
        setAdvisorSummary(null);
        return;
      }

      setIsPowerInsightsLoading(true);
      setPowerInsightsError(null);

      try {
        const token = await getAccessToken();

        const authedGet = async <TPayload,>(path: string): Promise<TPayload> => {
          const response = await fetch(path, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });

          const payload = (await response.json().catch(() => ({}))) as { error?: string } & TPayload;
          if (!response.ok) {
            throw new Error(payload.error ?? `Could not load ${path}`);
          }

          return payload;
        };

        const [intelligenceResult, holdingsResult, taxResult, alertsResult, advisorResult] = await Promise.allSettled([
          authedGet<IntelligenceApiPayload>("/api/agent/intelligence"),
          authedGet<HoldingsApiPayload>("/api/agent/holdings"),
          authedGet<TaxApiPayload>("/api/agent/tax"),
          authedGet<AlertsApiPayload>("/api/agent/alerts"),
          authedGet<AgentDashboardPayload>("/api/agent/dashboard"),
        ]);

        if (cancelled) {
          return;
        }

        if (intelligenceResult.status === "fulfilled") {
          setIntelligenceSnapshot(intelligenceResult.value.snapshot ?? null);
        }

        if (holdingsResult.status === "fulfilled") {
          setHoldingsAnalytics(holdingsResult.value.analytics ?? null);
          setHoldingsCount(Array.isArray(holdingsResult.value.holdings) ? holdingsResult.value.holdings.length : 0);
        } else {
          setHoldingsAnalytics(null);
          setHoldingsCount(0);
        }

        if (taxResult.status === "fulfilled") {
          setTaxSummary(taxResult.value.summary ?? null);
        } else {
          setTaxSummary(null);
        }

        if (alertsResult.status === "fulfilled") {
          setAlertsSummary(alertsResult.value.summary ?? null);
          setAlertsSubscription(alertsResult.value.subscription ?? null);
        } else {
          setAlertsSummary(null);
          setAlertsSubscription(null);
        }

        if (advisorResult.status === "fulfilled") {
          setAdvisorSummary(advisorResult.value.aiSummary ?? null);
        } else {
          setAdvisorSummary(null);
        }

        const failedCount = [
          intelligenceResult,
          holdingsResult,
          taxResult,
          alertsResult,
          advisorResult,
        ].filter((result) => result.status === "rejected").length;

        if (failedCount === 5) {
          setPowerInsightsError("Could not load dashboard insights from Pravix modules.");
        } else if (failedCount > 0) {
          setPowerInsightsError("Some insight widgets are temporarily unavailable.");
        } else {
          setPowerInsightsError(null);
        }
      } catch (insightError) {
        if (!cancelled) {
          setPowerInsightsError(insightError instanceof Error ? insightError.message : "Could not load dashboard insights.");
          setIntelligenceSnapshot(null);
          setHoldingsAnalytics(null);
          setHoldingsCount(0);
          setTaxSummary(null);
          setAlertsSummary(null);
          setAlertsSubscription(null);
          setAdvisorSummary(null);
        }
      } finally {
        if (!cancelled) {
          setIsPowerInsightsLoading(false);
        }
      }
    }

    void loadPowerInsights();

    return () => {
      cancelled = true;
    };
  }, [getAccessToken, refreshTick, signedInEmail]);

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
            "id,user_id,full_name,email,phone_e164,city,state,occupation_title,employment_type,monthly_income_inr,monthly_expenses_inr,monthly_emi_inr,monthly_investable_surplus_inr,current_savings_inr,emergency_fund_months,loss_tolerance_pct,risk_appetite,tax_regime,kyc_status,target_amount_inr,target_horizon_years,notes,consent_to_contact,source,onboarding_completed_at,created_at,updated_at",
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
          const message = loadError instanceof Error ? loadError.message : "Could not load your dashboard profile.";
          const normalized = message.toLowerCase();

          if (normalized.includes("auth session missing") || normalized.includes("session expired")) {
            setSignedInEmail(null);
            setProfile(null);
            setError(null);
            return;
          }

          setError(message);
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
    const suffix = marketGeneratedAt
      ? ` • ${new Date(marketGeneratedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
      : "";

    const tone = isMarketLoading
      ? ("neutral" as const)
      : marketSource === "live"
        ? ("success" as const)
        : ("warning" as const);

    return { label: `Live feed${suffix}`, tone };
  }, [isMarketLoading, marketGeneratedAt, marketSource]);

  const marketTrendStatus = useMemo(() => {
    if (isMarketTrendLoading) {
      return { label: "Loading trend", tone: "neutral" as const };
    }

    if (marketTrendSource === "live") {
      const suffix = marketTrendGeneratedAt
        ? ` • ${new Date(marketTrendGeneratedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
        : "";
      return { label: `Live trend${suffix}`, tone: "success" as const };
    }

    return { label: "Fallback trend", tone: "warning" as const };
  }, [isMarketTrendLoading, marketTrendGeneratedAt, marketTrendSource]);

  const selectedHorizonMonths = useMemo(
    () => toHorizonMonths(selectedHorizon, customHorizonYears),
    [selectedHorizon, customHorizonYears],
  );
  const selectedHorizonLabel = useMemo(
    () => toHorizonLabel(selectedHorizon, customHorizonYears),
    [selectedHorizon, customHorizonYears],
  );

  const niftyTrendSummary = useMemo(() => {
    if (marketTrend.length < 2) {
      return null;
    }

    const first = marketTrend[0]?.close ?? 0;
    const latest = marketTrend[marketTrend.length - 1]?.close ?? 0;
    const change = latest - first;
    const changePct = first > 0 ? (change / first) * 100 : 0;

    return {
      first,
      latest,
      change,
      changePct,
    };
  }, [marketTrend]);

  const orderedMarketIndicators = useMemo(() => {
    const order: Array<MarketIndicator["id"]> = ["NIFTY50", "SENSEX", "BANKNIFTY"];
    const lookup = new Map(marketIndicators.map((indicator) => [indicator.id, indicator]));

    return order
      .map((id) => lookup.get(id))
      .filter((indicator): indicator is MarketIndicator => Boolean(indicator));
  }, [marketIndicators]);

  const sipSuggestedAmount = useMemo(() => {
    if (!profile) {
      return null;
    }

    return Math.max(profile.monthly_investable_surplus_inr, 0);
  }, [profile]);

  const sipProjection = useMemo(() => {
    const monthlyAmount = Math.max(sipMonthlyAmount, 0);
    const annualRate = Math.min(Math.max(sipAnnualReturn, 0), 40);
    const durationMonths = Math.max(1, Math.round(sipDurationYears * 12));
    const monthlyRate = annualRate / 12 / 100;
    const invested = monthlyAmount * durationMonths;

    const projectedValue = monthlyRate === 0
      ? invested
      : monthlyAmount * (((Math.pow(1 + monthlyRate, durationMonths) - 1) / monthlyRate) * (1 + monthlyRate));

    const roundedProjectedValue = Math.round(projectedValue);
    const estimatedReturns = Math.max(roundedProjectedValue - Math.round(invested), 0);

    return {
      months: durationMonths,
      invested: Math.round(invested),
      projectedValue: roundedProjectedValue,
      estimatedReturns,
    };
  }, [sipAnnualReturn, sipDurationYears, sipMonthlyAmount]);

  const powerTrendData = useMemo(() => {
    if (!profile) {
      return [];
    }

    const savingsValue = Math.max(profile.current_savings_inr, 0);
    const holdingsValue = Math.max(holdingsAnalytics?.totalMarketValueInr ?? 0, 0);
    const baseCorpus = savingsValue + holdingsValue;
    const goalReference = Math.max(profile.target_amount_inr, baseCorpus, 1);
    const monthlySurplus = Math.max(profile.monthly_investable_surplus_inr, 0);
    const horizonMonths = Math.max(profile.target_horizon_years * 12, 1);
    const projectionMonths = Math.min(horizonMonths, selectedHorizonMonths);
    const checkpoints = Array.from({ length: 8 }, (_, index) => Math.round((projectionMonths * index) / 7));

    return checkpoints.map((monthsFromNow, index) => {
      const projectedCorpus = Math.max(baseCorpus + monthlySurplus * monthsFromNow, 0);
      const normalizedProgress = projectionMonths > 0 ? monthsFromNow / projectionMonths : 0;
      const goalPath = baseCorpus + (goalReference - baseCorpus) * normalizedProgress;
      const monthLabel = monthsFromNow >= 12 && monthsFromNow % 12 === 0
        ? `Y${Math.round(monthsFromNow / 12)}`
        : monthsFromNow === 0
          ? "Now"
          : `M${monthsFromNow}`;

      return {
        label: monthLabel,
        actual: Math.round(projectedCorpus),
        goalPath: Math.round(goalPath),
        checkpoint: index,
      };
    });
  }, [holdingsAnalytics?.totalMarketValueInr, profile, selectedHorizonMonths]);

  const allocationBarData = useMemo(() => {
    const palette = ["#f5cc73", "#7aaafc", "#f0b85f", "#69c8ad", "#5a6d8f"];

    const holdingsAllocation = (holdingsAnalytics?.allocationByAssetClass ?? []).slice(0, 5).map((item, index) => ({
      category: item.name,
      value: item.marketValueInr,
      fill: palette[index % palette.length],
    }));

    if (holdingsAllocation.length > 0) {
      return holdingsAllocation;
    }

    if (!profile) {
      return [];
    }

    const livingExpenses = Math.max(profile.monthly_expenses_inr, 0);
    const emi = Math.max(profile.monthly_emi_inr, 0);
    const investable = Math.max(profile.monthly_investable_surplus_inr, 0);
    const income = Math.max(profile.monthly_income_inr, 0);
    const buffer = Math.max(income - (livingExpenses + emi + investable), 0);

    return [
      { category: "Living", value: livingExpenses, fill: palette[0] },
      { category: "EMI", value: emi, fill: palette[1] },
      { category: "Investable", value: investable, fill: palette[2] },
      { category: "Buffer", value: buffer, fill: palette[3] },
    ].filter((item) => item.value > 0);
  }, [holdingsAnalytics?.allocationByAssetClass, profile]);

  const allocationSubtitle = useMemo(() => {
    if ((holdingsAnalytics?.allocationByAssetClass ?? []).length > 0) {
      return "Asset-class distribution from your holdings analyzer.";
    }

    return "Monthly cashflow composition from your Supabase profile.";
  }, [holdingsAnalytics?.allocationByAssetClass]);

  const attentionMixData = useMemo(() => {
    if (!profile) {
      return [] as Array<{ name: string; value: number; color: string }>;
    }

    const highUrgencyTax = taxSummary?.checklist.filter((item) => item.urgency === "high").length ?? 0;
    const concentrationCount = holdingsAnalytics?.concentrationWarnings.length ?? 0;
    const blockedAlerts = alertsSummary?.blockedCount ?? 0;
    const deferredAlerts = alertsSummary?.deferredCount ?? 0;

    let profileGaps = 0;
    if (!profile.onboarding_completed_at) {
      profileGaps += 1;
    }
    if (profile.kyc_status !== "verified") {
      profileGaps += 1;
    }
    if (!profile.tax_regime) {
      profileGaps += 1;
    }
    if (profile.loss_tolerance_pct === null) {
      profileGaps += 1;
    }
    if (holdingsCount === 0) {
      profileGaps += 1;
    }

    const base = [
      { name: "Urgent tax", value: highUrgencyTax, color: "#f5cc73" },
      { name: "Concentration", value: concentrationCount, color: "#76a8ff" },
      { name: "Blocked alerts", value: blockedAlerts, color: "#ff8a7b" },
      { name: "Deferred alerts", value: deferredAlerts, color: "#69c8ad" },
      { name: "Profile gaps", value: profileGaps, color: "#58647d" },
    ].filter((entry) => entry.value > 0);

    if (base.length === 0) {
      return [{ name: "Stable", value: 1, color: "#69c8ad" }];
    }

    return base;
  }, [alertsSummary, holdingsAnalytics?.concentrationWarnings.length, holdingsCount, profile, taxSummary]);

  const topAttentionSignal = useMemo(() => {
    if (attentionMixData.length === 0) {
      return { name: "Stable", value: 0 };
    }

    return [...attentionMixData].sort((left, right) => right.value - left.value)[0];
  }, [attentionMixData]);

  const trajectoryCheckpoints = useMemo(() => {
    if (powerTrendData.length === 0) {
      return [] as Array<{
        label: string;
        actual: number;
        goalPath: number;
        gap: number;
      }>;
    }

    const checkpointIndexes = Array.from(new Set([0, Math.floor((powerTrendData.length - 1) / 2), powerTrendData.length - 1]));

    return checkpointIndexes.map((index) => {
      const point = powerTrendData[index];

      return {
        label: point.label,
        actual: point.actual,
        goalPath: point.goalPath,
        gap: point.actual - point.goalPath,
      };
    });
  }, [powerTrendData]);

  const attentionBreakdown = useMemo(() => {
    const total = attentionMixData.reduce((sum, entry) => sum + entry.value, 0);

    return attentionMixData.slice(0, 4).map((entry) => ({
      ...entry,
      share: total > 0 ? (entry.value / total) * 100 : 0,
    }));
  }, [attentionMixData]);

  const strategyKpis = useMemo(() => {
    const holdingsPnl = holdingsAnalytics?.totalUnrealizedPnlInr ?? null;
    const holdingsPnlPct = holdingsAnalytics?.totalUnrealizedPnlPct ?? null;
    const suggestedFocus = intelligenceSnapshot?.recommendedFocus;
    const focusLabel = suggestedFocus ? `${suggestedFocus.charAt(0).toUpperCase()}${suggestedFocus.slice(1)}` : "N/A";

    return [
      {
        label: "Target gap",
        value: profile ? formatCompactCurrency(targetGap) : "N/A",
        hint: profile ? `${formatRisk(profile.risk_appetite)} · ${profile.target_horizon_years}y horizon` : "Complete onboarding",
      },
      {
        label: "Portfolio P&L",
        value: holdingsPnl !== null ? formatCompactCurrency(holdingsPnl) : "N/A",
        hint: holdingsPnlPct !== null ? `${formatSignedPercent(holdingsPnlPct)} unrealized` : "Import holdings to unlock",
      },
      {
        label: "80C runway",
        value: taxSummary ? formatCompactCurrency(taxSummary.section80cRemainingInr) : "N/A",
        hint: taxSummary ? `${taxSummary.daysToFinancialYearEnd} days to FY end` : "Refresh tax assistant",
      },
      {
        label: "Focus module",
        value: focusLabel,
        hint: intelligenceSnapshot ? `${intelligenceSnapshot.focusConfidence} confidence` : "Refresh intelligence",
      },
    ];
  }, [holdingsAnalytics?.totalUnrealizedPnlInr, holdingsAnalytics?.totalUnrealizedPnlPct, intelligenceSnapshot, profile, targetGap, taxSummary]);

  const insightDigestItems = useMemo(() => {
    const advisorSummaryPlain = advisorSummary
      ? advisorSummary.replace(/\*\*/g, "").replace(/\s+/g, " ").trim()
      : null;
    const shortAdvisorSummary = advisorSummaryPlain
      ? `${advisorSummaryPlain.slice(0, 110)}${advisorSummaryPlain.length > 110 ? "..." : ""}`
      : "Refresh Copilot to load AI action plan summary.";
    const marketUpCount = marketIndicators.filter((indicator) => indicator.trend === "up").length;
    const marketDownCount = marketIndicators.filter((indicator) => indicator.trend === "down").length;

    return [
      {
        title: "Market Feed",
        value: marketIndicators.length > 0 ? `${marketUpCount} up · ${marketDownCount} down` : "Feed pending",
        hint: marketStatus.label,
      },
      {
        title: "Executive Intelligence",
        value: intelligenceSnapshot
          ? `Recommended ${intelligenceSnapshot.recommendedFocus.toUpperCase()} (${intelligenceSnapshot.focusConfidence})`
          : "Not loaded",
        hint: intelligenceSnapshot ? `${intelligenceSnapshot.priorities.length} priorities ranked` : "Refresh intelligence panel",
      },
      {
        title: "Smart Alerts",
        value: alertsSummary ? `${alertsSummary.triggeredCount} triggered · ${alertsSummary.readyCount} ready` : "Not loaded",
        hint: alertsSubscription ? `${alertsSubscription.plan.toUpperCase()} plan · ${alertsSubscription.status}` : "Refresh alerts panel",
      },
      {
        title: "Holdings Analyzer",
        value: holdingsAnalytics ? `${holdingsCount} holdings tracked` : "Not loaded",
        hint: holdingsAnalytics
          ? `${holdingsAnalytics.concentrationWarnings.length} concentration warning(s)`
          : "Refresh holdings panel",
      },
      {
        title: "Tax Assistant",
        value: taxSummary ? `${formatCompactCurrency(taxSummary.section80cRemainingInr)} remaining under 80C` : "Not loaded",
        hint: taxSummary
          ? `Suggested ${taxSummary.regimeHint.suggestedRegime.toUpperCase()} regime`
          : "Refresh tax panel",
      },
      {
        title: "AI Copilot",
        value: advisorSummary ? "Action plan synchronized" : "Not loaded",
        hint: shortAdvisorSummary,
      },
    ];
  }, [advisorSummary, alertsSubscription, alertsSummary, holdingsAnalytics, holdingsCount, intelligenceSnapshot, marketIndicators, marketStatus.label, taxSummary]);

  const profileIntelligence = useMemo(() => {
    if (!profile) {
      return null;
    }

    const monthlyIncome = Math.max(profile.monthly_income_inr ?? 0, 0);
    const monthlyExpenses = Math.max(profile.monthly_expenses_inr ?? 0, 0);
    const monthlyEmi = Math.max(profile.monthly_emi_inr ?? 0, 0);
    const monthlyOutflow = monthlyExpenses + monthlyEmi;
    const investableSurplus = Math.max(
      profile.monthly_investable_surplus_inr ?? monthlyIncome - monthlyOutflow,
      0,
    );
    const savingsRatePct = monthlyIncome > 0 ? (investableSurplus / monthlyIncome) * 100 : 0;
    const expenseLoadPct = monthlyIncome > 0 ? (monthlyOutflow / monthlyIncome) * 100 : 0;
    const goalCoveragePct = profile.target_amount_inr > 0
      ? (profile.current_savings_inr / profile.target_amount_inr) * 100
      : 0;
    const horizonMonths = Math.max(profile.target_horizon_years * 12, 1);
    const requiredMonthlyToGoal = targetGap / horizonMonths;
    const goalFundingStress = requiredMonthlyToGoal - investableSurplus;
    const emergencyRunwayMonths = monthlyExpenses > 0
      ? profile.current_savings_inr / monthlyExpenses
      : profile.emergency_fund_months;
    const holdingsMarketValue = holdingsAnalytics?.totalMarketValueInr ?? 0;
    const totalVisibleCorpus = profile.current_savings_inr + holdingsMarketValue;

    return {
      monthlyIncome,
      monthlyOutflow,
      investableSurplus,
      savingsRatePct,
      expenseLoadPct,
      goalCoveragePct,
      requiredMonthlyToGoal,
      goalFundingStress,
      emergencyRunwayMonths,
      holdingsMarketValue,
      totalVisibleCorpus,
    };
  }, [holdingsAnalytics?.totalMarketValueInr, profile, targetGap]);

  const profileDataReadiness = useMemo<Array<{ label: string; tone: "neutral" | "success" | "warning" | "critical" | "info" }>>(() => {
    if (!profile) {
      return [];
    }

    return [
      {
        label: profile.onboarding_completed_at ? "Onboarding completed" : "Onboarding pending",
        tone: profile.onboarding_completed_at ? "success" : "warning",
      },
      {
        label: profile.kyc_status === "verified" ? "KYC verified" : `KYC ${profile.kyc_status}`,
        tone:
          profile.kyc_status === "verified"
            ? "success"
            : profile.kyc_status === "rejected"
              ? "critical"
              : "warning",
      },
      {
        label: profile.tax_regime ? `Tax regime ${profile.tax_regime.toUpperCase()}` : "Tax regime missing",
        tone: profile.tax_regime ? "info" : "warning",
      },
      {
        label: profile.loss_tolerance_pct !== null ? "Risk tolerance captured" : "Risk tolerance missing",
        tone: profile.loss_tolerance_pct !== null ? "success" : "warning",
      },
      {
        label: holdingsCount > 0 ? `${holdingsCount} holdings synced` : "Holdings not synced",
        tone: holdingsCount > 0 ? "success" : "warning",
      },
      {
        label: alertsSummary ? `${alertsSummary.triggeredCount} alerts evaluated` : "Alerts not evaluated",
        tone: alertsSummary ? "info" : "warning",
      },
    ];
  }, [alertsSummary, holdingsCount, profile]);

  const effectiveFocus = useMemo(() => manualFocus ?? recommendedFocus, [manualFocus, recommendedFocus]);

  const orderedModuleKeys = useMemo(() => {
    const baseOrder: DashboardModuleKey[] = ["alerts", "profile", "holdings", "tax", "advisor"];

    if (!effectiveFocus) {
      return baseOrder;
    }

    return [effectiveFocus, ...baseOrder.filter((moduleKey) => moduleKey !== effectiveFocus)];
  }, [effectiveFocus]);

  const kpiStripItems = useMemo<DashboardKpiItem[]>(() => {
    const investedCorpus = Math.max((profile?.current_savings_inr ?? 0) + (holdingsAnalytics?.totalMarketValueInr ?? 0), 0);
    const goalProgressPct = profile && profile.target_amount_inr > 0 ? Math.min((investedCorpus / profile.target_amount_inr) * 100, 999) : 0;
    const concentrationCount = holdingsAnalytics?.concentrationWarnings.length ?? 0;
    const concentrationTone = concentrationCount === 0 ? "Low" : concentrationCount <= 2 ? "Medium" : "High";

    return [
      {
        id: "goal-progress",
        label: "Goal Progress",
        value: `${goalProgressPct.toFixed(1)}%`,
        hint: `${formatCompactCurrency(investedCorpus)} corpus tracked`,
        deltaLabel: `${goalProgressPct >= 50 ? "+" : "-"}${Math.abs(goalProgressPct - 50).toFixed(1)} pts vs 50% milestone`,
        deltaTone: goalProgressPct >= 50 ? "positive" : "negative",
        detail: "Share of visible corpus versus target amount. Includes savings and synced holdings.",
        source: "Profiles + Holdings",
      },
      {
        id: "monthly-surplus",
        label: "Monthly Surplus",
        value: profile ? formatCompactCurrency(Math.max(profile.monthly_investable_surplus_inr, 0)) : "N/A",
        hint: profile ? `${formatCurrency(profile.monthly_income_inr)} income` : "Complete onboarding",
        deltaLabel: profile ? `${Math.max(((profile.monthly_investable_surplus_inr / Math.max(profile.monthly_income_inr, 1)) * 100), 0).toFixed(1)}% savings rate` : "Savings rate unavailable",
        deltaTone: profile && profile.monthly_investable_surplus_inr > 0 ? "positive" : "neutral",
        detail: "Net monthly cash available for SIP and goal funding.",
        source: "Profile monthly cashflow",
      },
      {
        id: "concentration-risk",
        label: "Concentration Risk",
        value: concentrationTone,
        hint: `${concentrationCount} warning(s)`,
        deltaLabel: concentrationCount === 0 ? "No major concentration alerts" : `${concentrationCount} concentration flags`,
        deltaTone: concentrationCount === 0 ? "positive" : concentrationCount <= 2 ? "neutral" : "negative",
        detail: "Sector and asset concentration risk indicator from holdings.",
        source: "Holdings analyzer",
      },
      {
        id: "data-freshness",
        label: "Data Freshness",
        value: profileFreshness.label,
        hint: `Updated ${latestUpdatedAt}`,
        deltaLabel: marketStatus.label,
        deltaTone: profileFreshness.label === "Up to date" ? "positive" : profileFreshness.label === "Review soon" ? "neutral" : "negative",
        detail: "Profile recency and market-feed health status.",
        source: "Profiles + Market feed",
      },
    ];
  }, [alertsSummary, holdingsAnalytics?.concentrationWarnings.length, holdingsAnalytics?.totalMarketValueInr, latestUpdatedAt, marketStatus.label, profile, profileFreshness.label, taxSummary]);

  const selectedKpi = useMemo(() => {
    return kpiStripItems.find((item) => item.id === selectedKpiId) ?? null;
  }, [kpiStripItems, selectedKpiId]);

  const showCashflowBridge = selectedLens === "cashflow";
  const showAllocationMix = selectedLens === "goal" || selectedLens === "cashflow";
  const showAlertsFunnel = selectedLens === "risk";
  const showScenarioComparison = selectedLens === "goal";
  const showRiskHeatmap = selectedLens === "risk";
  const focusedInsightsTitle = selectedLens === "goal"
    ? "Goal-focused analysis"
    : selectedLens === "cashflow"
      ? "Cashflow-focused analysis"
      : "Risk-focused analysis";
  const focusedInsightsHint = selectedLens === "goal"
    ? "Track growth path, allocation balance, and long-term compounding behavior."
    : selectedLens === "cashflow"
      ? "Keep monthly inflow, outflow, and deployable surplus in control."
      : "Prioritize risk telemetry, delivery bottlenecks, and severity hotspots.";

  const scenarioProjectionData = useMemo(() => {
    if (!profile) return [];
    const currentCorpus = Math.max(profile.current_savings_inr + (holdingsAnalytics?.totalMarketValueInr ?? 0), 0);
    const investable = Math.max(profile.monthly_investable_surplus_inr, 0);
    const points = Array.from({ length: 7 }, (_, index) => Math.round((selectedHorizonMonths * index) / 6));

    return points.map((month) => {
      return {
        label: month === 0 ? "Now" : month % 12 === 0 ? `Y${month / 12}` : `M${month}`,
        conservative: Math.round(projectCorpusValue(currentCorpus, investable, SCENARIO_RETURN_PCT.conservative, month)),
        moderate: Math.round(projectCorpusValue(currentCorpus, investable, SCENARIO_RETURN_PCT.moderate, month)),
        aggressive: Math.round(projectCorpusValue(currentCorpus, investable, SCENARIO_RETURN_PCT.aggressive, month)),
      };
    });
  }, [holdingsAnalytics?.totalMarketValueInr, profile, selectedHorizonMonths]);

  const riskHeatmapData = useMemo(() => {
    const taxRisk = taxSummary && taxSummary.section80cRemainingInr > 0 ? 2 : 1;
    const holdingsRisk = (holdingsAnalytics?.concentrationWarnings.length ?? 0) > 2 ? 3 : (holdingsAnalytics?.concentrationWarnings.length ?? 0) > 0 ? 2 : 1;
    const alertsRisk = (alertsSummary?.blockedCount ?? 0) > 0 ? 3 : (alertsSummary?.deferredCount ?? 0) > 0 ? 2 : 1;
    const profileRisk = profile && profile.kyc_status === "verified" ? 1 : profile && profile.kyc_status === "pending" ? 2 : 3;
    const scoreMap = [0, profileRisk, holdingsRisk, taxRisk, alertsRisk];
    const rows = ["Profile", "Holdings", "Tax", "Alerts"];
    return rows.map((row, rowIndex) => ([
      { row, col: "Low", value: scoreMap[rowIndex + 1] === 1 ? 1 : 0, intensity: scoreMap[rowIndex + 1] === 1 ? "high" : "low" },
      { row, col: "Medium", value: scoreMap[rowIndex + 1] === 2 ? 1 : 0, intensity: scoreMap[rowIndex + 1] === 2 ? "high" : "low" },
      { row, col: "High", value: scoreMap[rowIndex + 1] === 3 ? 1 : 0, intensity: scoreMap[rowIndex + 1] === 3 ? "high" : "low" },
    ]));
  }, [alertsSummary?.blockedCount, alertsSummary?.deferredCount, holdingsAnalytics?.concentrationWarnings.length, profile, taxSummary]);

  const cashflowBridgeData = useMemo(() => {
    if (!profile) return [];
    const income = Math.max(profile.monthly_income_inr, 0);
    const expenses = -Math.max(profile.monthly_expenses_inr, 0);
    const emi = -Math.max(profile.monthly_emi_inr, 0);
    const investable = Math.max(profile.monthly_investable_surplus_inr, 0);
    const unplanned = income + expenses + emi - investable;
    return [
      { label: "Income", value: income, fill: "#2b5cff" },
      { label: "Expenses", value: expenses, fill: "#ff8a7b" },
      { label: "EMI", value: emi, fill: "#f5cc73" },
      { label: "Investable", value: investable, fill: "#69c8ad" },
      { label: "Balance", value: unplanned, fill: "#5a6d8f" },
    ];
  }, [profile]);

  const cashflowBalanceValue = useMemo(() => {
    return cashflowBridgeData.find((entry) => entry.label === "Balance")?.value ?? 0;
  }, [cashflowBridgeData]);

  const alertsFunnelData = useMemo(() => {
    if (!alertsSummary) return [];
    return [
      { stage: "Triggered", value: alertsSummary.triggeredCount, fill: "#2b5cff" },
      { stage: "Ready", value: alertsSummary.readyCount, fill: "#69c8ad" },
      { stage: "Deferred", value: alertsSummary.deferredCount, fill: "#f5cc73" },
      { stage: "Blocked", value: alertsSummary.blockedCount, fill: "#ff8a7b" },
    ];
  }, [alertsSummary]);

  const alertsReadyRate = useMemo(() => {
    if (!alertsSummary || alertsSummary.triggeredCount <= 0) {
      return null;
    }

    return (alertsSummary.readyCount / alertsSummary.triggeredCount) * 100;
  }, [alertsSummary]);

  const allocationDonutData = useMemo(() => {
    const rows = (holdingsAnalytics?.allocationByAssetClass ?? []).slice(0, 6).map((item) => ({ name: item.name, value: Math.max(item.marketValueInr, 0) }));
    if (rows.length > 0) return rows;
    return allocationBarData.slice(0, 6).map((item) => ({ name: item.category, value: Math.max(item.value, 0) }));
  }, [allocationBarData, holdingsAnalytics?.allocationByAssetClass]);

  const allocationTotalValue = useMemo(() => {
    return allocationDonutData.reduce((sum, item) => sum + item.value, 0);
  }, [allocationDonutData]);

  const topAllocationSlices = useMemo(() => {
    if (allocationTotalValue <= 0) {
      return [] as Array<{ name: string; value: number; sharePct: number }>;
    }

    return [...allocationDonutData]
      .sort((left, right) => right.value - left.value)
      .slice(0, 3)
      .map((item) => ({
        name: item.name,
        value: item.value,
        sharePct: (item.value / allocationTotalValue) * 100,
      }));
  }, [allocationDonutData, allocationTotalValue]);

  const scenarioBaselineCorpus = useMemo(() => {
    if (!profile) {
      return 0;
    }

    const currentCorpus = Math.max(profile.current_savings_inr + (holdingsAnalytics?.totalMarketValueInr ?? 0), 0);
    const investable = Math.max(profile.monthly_investable_surplus_inr, 0);

    return Math.round(currentCorpus + investable * selectedHorizonMonths);
  }, [holdingsAnalytics?.totalMarketValueInr, profile, selectedHorizonMonths]);

  const scenarioEndPoint = useMemo(() => {
    if (scenarioProjectionData.length === 0) {
      return null;
    }

    return scenarioProjectionData[scenarioProjectionData.length - 1] ?? null;
  }, [scenarioProjectionData]);

  const scenarioOutcomeRows = useMemo(() => {
    if (!scenarioEndPoint) {
      return [] as Array<{ name: string; annualReturn: number; value: number; excess: number }>;
    }

    return [
      {
        name: "Conservative",
        annualReturn: SCENARIO_RETURN_PCT.conservative,
        value: scenarioEndPoint.conservative,
        excess: scenarioEndPoint.conservative - scenarioBaselineCorpus,
      },
      {
        name: "Moderate",
        annualReturn: SCENARIO_RETURN_PCT.moderate,
        value: scenarioEndPoint.moderate,
        excess: scenarioEndPoint.moderate - scenarioBaselineCorpus,
      },
      {
        name: "Aggressive",
        annualReturn: SCENARIO_RETURN_PCT.aggressive,
        value: scenarioEndPoint.aggressive,
        excess: scenarioEndPoint.aggressive - scenarioBaselineCorpus,
      },
    ];
  }, [scenarioBaselineCorpus, scenarioEndPoint]);

  const allocationPalette = ["#2b5cff", "#7aaafc", "#69c8ad", "#f5cc73", "#ff8a7b", "#5a6d8f"];

  const kpiTrendSeries = useMemo<Record<string, TrendPoint[]>>(() => {
    const goalSeries = powerTrendData.map((point) => ({ label: point.label, value: point.actual }));
    const cashflowBase = profile ? Math.max(profile.monthly_investable_surplus_inr, 0) : 0;
    const cashflowSeries = Array.from({ length: 6 }, (_, index) => ({ label: `M-${5 - index}`, value: Math.max(Math.round(cashflowBase * (0.88 + index * 0.035)), 0) }));
    const taxBase = taxSummary?.section80cRemainingInr ?? 0;
    const taxSeries = Array.from({ length: 6 }, (_, index) => ({ label: `M-${5 - index}`, value: Math.max(Math.round(taxBase * (1 - index * 0.14)), 0) }));
    const alertBase = alertsSummary?.triggeredCount ?? 0;
    const alertSeries = Array.from({ length: 6 }, (_, index) => ({ label: `W${index + 1}`, value: Math.max(Math.round(alertBase * (0.95 - index * 0.1)), 0) }));
    const concentrationBase = holdingsAnalytics?.concentrationWarnings.length ?? 0;
    const concentrationSeries = Array.from({ length: 6 }, (_, index) => ({ label: `W${index + 1}`, value: Math.max(Math.round(concentrationBase + (index % 2 === 0 ? 0 : -1)), 0) }));
    const freshnessSeries = Array.from({ length: 6 }, (_, index) => ({ label: `D${index + 1}`, value: Math.max(100 - index * 6, 60) }));
    return {
      "goal-progress": goalSeries,
      "monthly-surplus": cashflowSeries,
      "tax-runway": taxSeries,
      "alert-sla": alertSeries,
      "concentration-risk": concentrationSeries,
      "data-freshness": freshnessSeries,
    };
  }, [alertsSummary?.triggeredCount, holdingsAnalytics?.concentrationWarnings.length, powerTrendData, profile, taxSummary?.section80cRemainingInr]);

  const selectedKpiTrend = useMemo(() => {
    if (!selectedKpi) return [];
    return kpiTrendSeries[selectedKpi.id] ?? [];
  }, [kpiTrendSeries, selectedKpi]);

  const intelligence = profileIntelligence as NonNullable<typeof profileIntelligence> | null;

  const sectionReveal = useMemo(
    () => ({
      hidden: { opacity: 0, y: isCompactMotion ? 14 : 24 },
      show: {
        opacity: 1,
        y: 0,
        transition: {
          duration: isCompactMotion ? 0.45 : 0.65,
          ease: motionEase,
        },
      },
    }),
    [isCompactMotion],
  );

  const featureCardReveal = useMemo(
    () => ({
      hidden: { opacity: 0, y: isCompactMotion ? 10 : 18 },
      show: (delayOrder: number) => ({
        opacity: 1,
        y: 0,
        transition: {
          duration: isCompactMotion ? 0.36 : 0.52,
          delay: (isCompactMotion ? 0.04 : 0.06) * delayOrder,
          ease: motionEase,
        },
      }),
    }),
    [isCompactMotion],
  );

  const denseSectionViewport = useMemo(
    () => ({ once: true, amount: isCompactMotion ? 0.12 : 0.18 }),
    [isCompactMotion],
  );

  const aiMarketLab = useMemo(() => {
    if (!profile || !profileIntelligence) {
      return null;
    }

    const currentCorpus = profileIntelligence.totalVisibleCorpus;
    const monthlyContribution = profileIntelligence.investableSurplus;
    const horizonMonths = Math.max(selectedHorizonMonths, 1);
    const baseAnnualReturn = profile.risk_appetite === "aggressive" ? 11.8 : profile.risk_appetite === "conservative" ? 8.4 : 10.2;

    const scenarioCards: ScenarioCard[] = [
      {
        label: "Stress case",
        annualReturnPct: Math.max(baseAnnualReturn - 3.5, 4.5),
        projectedValue: 0,
        gainInr: 0,
        gainPct: 0,
        tone: "warning" as InsightTone,
      },
      {
        label: "Plan case",
        annualReturnPct: baseAnnualReturn,
        projectedValue: 0,
        gainInr: 0,
        gainPct: 0,
        tone: "neutral" as InsightTone,
      },
      {
        label: "Upside case",
        annualReturnPct: baseAnnualReturn + 3.5,
        projectedValue: 0,
        gainInr: 0,
        gainPct: 0,
        tone: "positive" as InsightTone,
      },
    ].map((scenario): ScenarioCard => {
      const projectedValue = projectCorpusValue(currentCorpus, monthlyContribution, scenario.annualReturnPct, horizonMonths);
      const gainInr = projectedValue - currentCorpus;
      const gainPct = currentCorpus > 0 ? (gainInr / currentCorpus) * 100 : 0;

      return {
        ...scenario,
        projectedValue,
        gainInr,
        gainPct,
        tone: scenario.tone as InsightTone,
      };
    });

    const fundingMomentum = profileIntelligence.requiredMonthlyToGoal > 0
      ? (profileIntelligence.investableSurplus / profileIntelligence.requiredMonthlyToGoal) * 100
      : 100;
    const concentrationCount = holdingsAnalytics?.concentrationWarnings.length ?? 0;
    const highestConcentration = (holdingsAnalytics?.concentrationWarnings ?? []).reduce(
      (max, warning) => Math.max(max, warning.metricPct ?? 0),
      0,
    );

    const goalProbability = clamp(
      Math.round(
        40 +
        Math.min(profileIntelligence.goalCoveragePct * 0.18, 25) +
        Math.min(fundingMomentum * 0.3, 30) +
        Math.min(profileIntelligence.savingsRatePct * 0.15, 15) +
        (profile.emergency_fund_months >= 6 ? 5 : -3) -
        Math.min(concentrationCount * 5, 16) -
        Math.min((alertsSummary?.blockedCount ?? 0) * 2, 10),
      ),
      8,
      98,
    );

    const riskDriftScore = clamp(
      Math.round(
        highestConcentration +
        (profile.loss_tolerance_pct === null ? 8 : Math.max(0, highestConcentration - profile.loss_tolerance_pct)) +
        (profileIntelligence.expenseLoadPct >= 65 ? 8 : 0) +
        Math.min((alertsSummary?.blockedCount ?? 0) * 2, 10),
      ),
      0,
      100,
    );

    const marketPulseItems: MarketPulseItem[] = orderedMarketIndicators.slice(0, 3).map((indicator) => ({
      label: indicator.displayName,
      value: indicator.value.toLocaleString("en-IN", { maximumFractionDigits: 2 }),
      detail: `${indicator.changeAbs >= 0 ? "+" : ""}${indicator.changeAbs.toFixed(2)} (${indicator.changePct >= 0 ? "+" : ""}${indicator.changePct.toFixed(2)}%)`,
      tone: indicator.trend === "up" ? "positive" : indicator.trend === "down" ? "warning" : "neutral",
    }));

    const actionQueue: ActionQueueItem[] = [];

    actionQueue.push({
      title: taxSummary && taxSummary.section80cRemainingInr > 0 ? "Close the 80C gap" : "Validate tax regime",
      detail: taxSummary
        ? taxSummary.section80cRemainingInr > 0
          ? `You still have INR ${taxSummary.section80cRemainingInr.toLocaleString("en-IN")} left. Target about INR ${Math.round(taxSummary.suggestedMonthly80cInr).toLocaleString("en-IN")} monthly to stay on pace.`
          : "Your 80C room looks fully used. Lock in documentation and confirm the regime before payroll cutoff."
        : "Tax profile is incomplete, so the tax assistant cannot calculate a reliable regime recommendation yet.",
      badge: taxSummary ? `${taxSummary.daysToFinancialYearEnd} days left` : "Tax module",
      tone: taxSummary && taxSummary.section80cRemainingInr > 0 ? "warning" : "positive",
    });

    actionQueue.push({
      title: concentrationCount > 0 ? "Reduce concentration risk" : "Hold the current allocation",
      detail: concentrationCount > 0
        ? `Top warning sits near ${highestConcentration.toFixed(1)}% concentration. Rebalance the crowded position before new money goes in.`
        : "No major concentration flags are active. Keep the allocation disciplined and review after the next holdings sync.",
      badge: concentrationCount > 0 ? `${concentrationCount} warning${concentrationCount === 1 ? "" : "s"}` : "Stable",
      tone: concentrationCount > 0 ? "critical" : "positive",
    });

    actionQueue.push({
      title: profileIntelligence.goalFundingStress > 0 ? "Increase monthly SIP" : "Keep the current cadence",
      detail: profileIntelligence.goalFundingStress > 0
        ? `You need roughly INR ${Math.round(profileIntelligence.requiredMonthlyToGoal).toLocaleString("en-IN")} monthly for the goal. Close the gap by adding about INR ${Math.round(profileIntelligence.goalFundingStress).toLocaleString("en-IN")} more.`
        : "Your current surplus can support the goal path. Preserve the plan and use extra cash for buffer or tax efficiency.",
      badge: profileIntelligence.goalFundingStress > 0 ? "Funding gap" : "On track",
      tone: profileIntelligence.goalFundingStress > 0 ? "warning" : "positive",
    });

    return {
      scenarioCards,
      goalProbability,
      riskDriftScore,
      riskLabel:
        riskDriftScore >= 70
          ? "High drift"
          : riskDriftScore >= 45
            ? "Watch closely"
            : "Aligned",
      riskMessage:
        concentrationCount > 0
          ? holdingsAnalytics?.concentrationWarnings[0]?.message ?? "Portfolio concentration deserves attention."
          : "No material concentration drift is visible right now.",
      marketPulseItems,
      marketTrendMovement: niftyTrendSummary
        ? `${niftyTrendSummary.change >= 0 ? "+" : ""}${formatIndexNumber(niftyTrendSummary.change)} · ${niftyTrendSummary.changePct >= 0 ? "+" : ""}${niftyTrendSummary.changePct.toFixed(2)}%`
        : "Waiting for trend history",
      marketTrendLabel: marketTrendStatus.label,
      marketContextLabel: marketStatus.label,
      advisorExcerpt: advisorSummary ? advisorSummary.split(".")[0].trim() : "Advisor summary is building from live module outputs.",
      actionQueue,
    };
  }, [
    advisorSummary,
    alertsSummary?.blockedCount,
    holdingsAnalytics?.concentrationWarnings,
    marketStatus.label,
    marketTrendStatus.label,
    niftyTrendSummary,
    orderedMarketIndicators,
    profile,
    profileIntelligence,
    selectedHorizonMonths,
    taxSummary,
  ]);

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

  const handleShareSnapshot = useCallback(async () => {
    const shareText = `Pravix dashboard snapshot (${selectedLens}, ${selectedHorizon}) · ${kpiStripItems[0]?.label ?? "KPI"}: ${kpiStripItems[0]?.value ?? "N/A"}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
      }
    } catch {
      // Clipboard permissions may be blocked by browser policy.
    }
  }, [kpiStripItems, selectedHorizon, selectedLens]);

  return (
    <RequireAuth redirectTo="/onboarding">
      <>
        <SiteHeader />
        <div className="min-h-screen bg-[linear-gradient(180deg,#0a0f1e_0%,#101828_30%,#eef3ff_100%)] pb-16 pt-20 sm:pb-20 sm:pt-24">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          {/* ── Header Bar ── */}
          <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-[#0f1f3d] via-[#132040] to-[#0c1830] px-5 py-4 shadow-[0_20px_40px_rgba(2,8,26,0.55)] backdrop-blur-lg sm:px-6 sm:py-4">
            {/* Subtle shimmer stripe */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(43,92,255,0.13),transparent_55%)]" />
            <div className="relative flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#2b5cff] to-[#1e44cd] shadow-[0_0_18px_rgba(43,92,255,0.35)]">
                  <WalletMinimal className="h-4.5 w-4.5 text-white" />
                  <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5 items-center justify-center">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00e0ff] opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00e0ff]" />
                  </span>
                </div>
                <div>
                  <p className="text-base font-semibold text-white">{greetingLabel}</p>
                  {signedInEmail ? <p className="text-[11px] text-[#7aa3d9]">{signedInEmail}</p> : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRefreshTick((current) => current + 1)}
                  className="inline-flex h-9 items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 text-sm font-semibold text-[#c8d8f8] backdrop-blur-sm transition-all duration-150 hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79a1ff]/40 active:scale-[0.97]"
                >
                  <RefreshCcw className="h-3.5 w-3.5" />
                  Refresh
                </button>
                {signedInEmail ? (
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="inline-flex h-9 items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 text-sm font-semibold text-[#c8d8f8] backdrop-blur-sm transition-all duration-150 hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79a1ff]/40 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSigningOut ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
                    Sign Out
                  </button>
                ) : null}
              </div>
            </div>
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
              title="Create your account to access your dashboard"
              description="Your personal dashboard unlocks goal tracking, alerts, portfolio analytics, and AI guidance."
            >
              <div className="rounded-2xl border border-finance-border bg-finance-surface/45 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <CircleUserRound className="mt-0.5 h-5 w-5 text-finance-muted" />
                  <div>
                    <p className="font-semibold text-finance-text">You are currently not logged in</p>
                    <p className="mt-1 text-sm text-finance-muted">
                      Create a Pravix account to start onboarding, then return here for your personalized wealth dashboard.
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href="/create-account"
                    className="inline-flex h-10 items-center rounded-full bg-finance-accent px-4 text-sm font-semibold text-white transition-all duration-150 hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-finance-accent/35 active:scale-[0.98]"
                  >
                    Create Account
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex h-10 items-center rounded-full border border-finance-border bg-white px-4 text-sm font-semibold text-finance-text transition-colors hover:bg-finance-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-finance-accent/30 active:scale-[0.98]"
                  >
                    Log In
                  </Link>
                </div>
              </div>

              <div className="mt-4">
                <AuthPanel onSignedIn={() => setRefreshTick((current) => current + 1)} />
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
              <div
                className="relative overflow-hidden rounded-2xl border border-finance-border/70 p-4 sm:p-5"
                style={{
                  backgroundImage: "url('/image/banner1 (1).webp')",
                  backgroundPosition: "center",
                  backgroundSize: "cover",
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#0c2347]/90 via-[#0c2347]/78 to-[#0c2347]/58" />

                <div className="relative max-w-xl">
                  <p className="text-sm font-semibold text-white">Your personalized dashboard is waiting</p>
                  <p className="mt-1.5 text-sm text-white/90">
                    Complete onboarding while signed in, then refresh this page to unlock profile and module analytics.
                  </p>

                  <div className="mt-3.5">
                    <Link
                      href="/onboarding"
                      className="inline-flex h-10 items-center rounded-full bg-white px-4 text-sm font-semibold text-[#102f67] transition-all duration-150 hover:bg-white/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:scale-[0.98]"
                    >
                      Complete Onboarding
                    </Link>
                  </div>
                </div>
              </div>
            </DashboardSectionCard>
          )}

          {!isLoading && !error && signedInEmail && profile && (
            <div className="mt-6 space-y-5 sm:mt-7 sm:space-y-6">

              {/* ── Control Bar ── */}
              <section className="rounded-2xl border border-finance-border bg-white/95 p-4 shadow-[0_8px_24px_rgba(10,25,48,0.07)] backdrop-blur-sm sm:p-5">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="min-w-[140px]">
                    <label htmlFor="horizon-filter" className="text-[10px] font-bold uppercase tracking-[0.16em] text-finance-muted">
                      Horizon
                    </label>
                    <select
                      id="horizon-filter"
                      value={selectedHorizon}
                      onChange={(event) => setSelectedHorizon(event.target.value as DashboardHorizon)}
                      className="mt-1.5 h-9 w-full rounded-lg border border-finance-border bg-white px-3 text-sm font-medium text-finance-text shadow-[inset_0_1px_3px_rgba(10,25,48,0.06)] focus:outline-none focus:ring-2 focus:ring-finance-accent/30"
                    >
                      <option value="1y">1 year</option>
                      <option value="2y">2 years</option>
                      <option value="3y">3 years</option>
                      <option value="custom">Custom</option>
                    </select>
                    {selectedHorizon === "custom" ? (
                      <div className="mt-2">
                        <label htmlFor="custom-horizon-years" className="text-[10px] font-bold uppercase tracking-[0.16em] text-finance-muted">
                          Custom years
                        </label>
                        <input
                          id="custom-horizon-years"
                          type="number"
                          min={1}
                          max={10}
                          value={customHorizonYears}
                          onChange={(event) => setCustomHorizonYears(Math.max(1, Math.min(10, Number(event.target.value) || 1)))}
                          className="mt-1.5 h-9 w-full rounded-lg border border-finance-border bg-white px-3 text-sm font-medium text-finance-text shadow-[inset_0_1px_3px_rgba(10,25,48,0.06)] focus:outline-none focus:ring-2 focus:ring-finance-accent/30"
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="min-w-[160px]">
                    <label htmlFor="lens-filter" className="text-[10px] font-bold uppercase tracking-[0.16em] text-finance-muted">
                      Dashboard Lens
                    </label>
                    <select
                      id="lens-filter"
                      value={selectedLens}
                      onChange={(event) => setSelectedLens(event.target.value as DashboardLens)}
                      className="mt-1.5 h-9 w-full rounded-lg border border-finance-border bg-white px-3 text-sm font-medium text-finance-text shadow-[inset_0_1px_3px_rgba(10,25,48,0.06)] focus:outline-none focus:ring-2 focus:ring-finance-accent/30"
                    >
                      <option value="goal">🎯 Goal performance</option>
                      <option value="cashflow">💸 Cashflow quality</option>
                      <option value="risk">🛡 Risk posture</option>
                    </select>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                    <StatusBadge label={marketStatus.label} tone={marketStatus.tone === "success" ? "success" : marketStatus.tone === "neutral" ? "neutral" : "warning"} />
                    <StatusBadge label={`${selectedLens} lens`} tone="info" />
                    <button type="button" onClick={() => void handleShareSnapshot()} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-finance-border bg-white px-3.5 text-xs font-semibold text-finance-text shadow-sm transition-all hover:bg-finance-surface hover:shadow-md">
                      <Share2 className="h-3.5 w-3.5" />
                      Share
                    </button>
                  </div>
                </div>
              </section>

              {/* ── Priority Snapshot KPI Strip ── */}
              <section className="rounded-2xl border border-finance-border bg-white px-5 py-4 shadow-[0_8px_24px_rgba(10,25,48,0.06)] sm:px-6 sm:py-5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2b5cff]">Priority Snapshot</p>
                    <p className="mt-0.5 text-sm text-finance-muted">Click any metric to drill into its trend.</p>
                  </div>
                  {selectedKpiId ? (
                    <button type="button" onClick={() => setSelectedKpiId(null)} className="inline-flex h-7 items-center gap-1.5 rounded-full border border-finance-border bg-finance-surface px-3 text-[11px] font-semibold text-finance-muted hover:text-finance-text">
                      <X className="h-3 w-3" />
                      Clear
                    </button>
                  ) : null}
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                  {kpiStripItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedKpiId(selectedKpiId === item.id ? null : item.id)}
                      className={`group relative overflow-hidden rounded-xl border px-3.5 py-4 text-left shadow-[0_4px_14px_rgba(10,25,48,0.06)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(10,25,48,0.12)] ${
                        selectedKpiId === item.id
                          ? "border-finance-accent bg-[linear-gradient(135deg,#f0f4ff,#e8efff)] ring-2 ring-finance-accent/25"
                          : "border-finance-border bg-white hover:border-finance-accent/30"
                      }`}
                    >
                      {selectedKpiId === item.id && (
                        <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-xl bg-gradient-to-r from-finance-accent to-[#7aaafc]" />
                      )}
                      <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-finance-muted">{item.label}</p>
                      <p className={`mt-1.5 text-lg font-bold ${ selectedKpiId === item.id ? "text-finance-accent" : "text-finance-text"}`}>{item.value}</p>
                      <p className={`mt-1 text-[11px] font-medium ${toneToClassName(item.deltaTone)}`}>{item.deltaLabel}</p>
                      <p className="mt-0.5 text-[10px] text-finance-muted">{item.hint}</p>
                    </button>
                  ))}
                </div>
              </section>

              {/* ── Section label: Decision Intelligence ── */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-finance-border" />
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-finance-muted">Decision Intelligence Layer</p>
                <div className="h-px flex-1 bg-finance-border" />
              </div>

              {aiMarketLab ? (
                <motion.section
                  className="relative overflow-hidden rounded-[2rem] border border-[#d7e4fb] bg-white shadow-[0_18px_44px_rgba(10,25,48,0.08)]"
                  variants={sectionReveal}
                  initial="hidden"
                  whileInView="show"
                  viewport={denseSectionViewport}
                >
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,rgba(43,92,255,0.08),transparent_28%),radial-gradient(circle_at_88%_14%,rgba(0,216,255,0.08),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.88),rgba(245,249,255,0.96))]" />
                  <div className="relative px-5 py-6 sm:px-6 sm:py-7 md:px-8 md:py-8">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                      <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 rounded-full border border-[#2b5cff]/12 bg-[#edf4ff] px-3 py-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-[#2b5cff]" />
                          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2b5cff]">AI + Market Lab</p>
                        </div>
                        <h3 className="mt-4 text-[clamp(1.65rem,3.8vw,2.75rem)] font-bold leading-[1.05] tracking-tight text-[#0a1930]">
                          Five handcrafted intelligence panels for clearer financial decisions
                        </h3>
                        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#50607d] md:text-base">
                          Scenario planning, goal confidence, risk drift, market context, and next actions are all computed from your profile,
                          holdings, tax, and live feed data.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <StatusBadge label={selectedHorizonLabel} tone="info" />
                        <StatusBadge label={aiMarketLab.marketContextLabel} tone={marketStatus.tone} />
                        <StatusBadge label={aiMarketLab.marketTrendLabel} tone={marketTrendStatus.tone} />
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4 lg:grid-cols-12">
                      <motion.article
                        className="relative overflow-hidden rounded-[1.75rem] border border-[#d8e7ff] bg-[linear-gradient(160deg,#f8fbff_0%,#eef4ff_100%)] p-5 shadow-[0_14px_30px_rgba(43,92,255,0.08)] lg:col-span-7"
                        variants={featureCardReveal}
                        custom={0}
                      >
                        <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-[#2b5cff]/10 blur-[90px]" />
                        <div className="relative flex items-start justify-between gap-4">
                          <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-[#2b5cff]/12 bg-white px-3 py-1.5">
                              <BarChart3 className="h-3.5 w-3.5 text-[#2b5cff]" />
                              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2b5cff]">AI Scenario Simulator</p>
                            </div>
                            <p className="mt-3 text-sm font-semibold text-[#0a1930]">{selectedHorizonLabel} plan range</p>
                            <p className="mt-1 text-xs text-[#5f7396]">Uses your current corpus, investable surplus, and a risk-weighted return band.</p>
                          </div>
                          <div className="rounded-2xl border border-white/60 bg-white px-4 py-3 text-right shadow-[0_8px_18px_rgba(43,92,255,0.06)]">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-[#5f7396]">Current visible corpus</p>
                            <p className="mt-1 text-lg font-bold text-[#0a1930]">{formatCompactCurrency(intelligence?.totalVisibleCorpus ?? 0)}</p>
                          </div>
                        </div>

                        <div className="relative mt-5 space-y-3">
                          {aiMarketLab.scenarioCards.map((scenario, index) => {
                            const maxProjected = Math.max(...aiMarketLab.scenarioCards.map((item) => item.projectedValue), 1);
                            const fillWidth = clamp((scenario.projectedValue / maxProjected) * 100, 8, 100);
                            const gradientClass =
                              scenario.tone === "warning"
                                ? "from-amber-400 via-orange-400 to-[#2b5cff]"
                                : scenario.tone === "positive"
                                  ? "from-emerald-400 via-[#00d8ff] to-[#2b5cff]"
                                  : "from-[#2b5cff] via-[#4d7dff] to-[#00d8ff]";

                            return (
                              <motion.div
                                key={scenario.label}
                                className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-[0_8px_18px_rgba(10,25,48,0.04)] backdrop-blur-sm"
                                initial={{ opacity: 0, y: 12 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, amount: 0.35 }}
                                transition={{ duration: 0.4, delay: index * 0.05, ease: motionEase }}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <Sparkles className="h-4 w-4 text-[#2b5cff]" />
                                      <p className="text-sm font-semibold text-[#0a1930]">{scenario.label}</p>
                                    </div>
                                    <p className="mt-1 text-xs text-[#5f7396]">{scenario.annualReturnPct.toFixed(1)}% return assumption</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-lg font-bold text-[#0a1930]">{formatCompactCurrency(scenario.projectedValue)}</p>
                                    <p className={`text-xs font-semibold ${scenario.gainInr >= 0 ? "text-finance-green" : "text-finance-red"}`}>
                                      {scenario.gainInr >= 0 ? "+" : "-"}
                                      {formatCompactCurrency(Math.abs(scenario.gainInr))} gain
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#edf4ff]">
                                  <motion.div
                                    className={`h-full rounded-full bg-gradient-to-r ${gradientClass}`}
                                    initial={{ width: 0 }}
                                    whileInView={{ width: `${fillWidth}%` }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.7, ease: motionEase }}
                                  />
                                </div>

                                <div className="mt-2 flex items-center justify-between text-[11px] text-[#5f7396]">
                                  <span>{scenario.gainPct.toFixed(1)}% gain vs current corpus</span>
                                  <span className="font-medium uppercase tracking-[0.12em]">{selectedHorizonLabel}</span>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </motion.article>

                      <motion.article
                        className="rounded-[1.75rem] border border-[#d8e7ff] bg-white p-5 shadow-[0_14px_30px_rgba(43,92,255,0.08)] lg:col-span-5"
                        variants={featureCardReveal}
                        custom={1}
                      >
                        <div className="flex items-center gap-2">
                          <Target className="h-4.5 w-4.5 text-[#2b5cff]" />
                          <p className="text-sm font-semibold text-[#0a1930]">Goal Probability Meter</p>
                        </div>
                        <p className="mt-1 text-xs text-[#5f7396]">Probability that current cashflow and holdings can reach your target on time.</p>

                        <div className="mt-5 flex items-center gap-4">
                          <div className="relative flex h-32 w-32 items-center justify-center">
                            <div
                              className="absolute inset-0 rounded-full shadow-[inset_0_0_0_1px_rgba(43,92,255,0.08)]"
                              style={{
                                background: `conic-gradient(#2b5cff 0 ${aiMarketLab.goalProbability}%, rgba(43,92,255,0.12) ${aiMarketLab.goalProbability}% 100%)`,
                              }}
                            />
                            <div className="absolute inset-[10px] rounded-full border border-white bg-white shadow-[inset_0_1px_4px_rgba(10,25,48,0.06)]" />
                            <div className="relative text-center">
                              <p className="text-3xl font-bold text-[#0a1930]">{aiMarketLab.goalProbability}%</p>
                              <p className="text-[10px] uppercase tracking-[0.16em] text-[#5f7396]">probability</p>
                            </div>
                          </div>

                          <div className="flex-1 space-y-3">
                            <div className="rounded-2xl border border-[#edf4ff] bg-[#f8fbff] p-3">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs uppercase tracking-[0.14em] text-[#5f7396]">Confidence</p>
                                <StatusBadge
                                  label={
                                    aiMarketLab.goalProbability >= 70
                                      ? "High confidence"
                                      : aiMarketLab.goalProbability >= 50
                                        ? "Moderate confidence"
                                        : "Needs support"
                                  }
                                  tone={aiMarketLab.goalProbability >= 70 ? "success" : aiMarketLab.goalProbability >= 50 ? "info" : "warning"}
                                />
                              </div>
                              <p className="mt-1 text-sm font-semibold text-[#0a1930]">{intelligence?.goalCoveragePct.toFixed(1)}% goal coverage</p>
                              <p className="mt-1 text-xs leading-relaxed text-[#5f7396]">
                                Monthly funding momentum and emergency runway are the biggest drivers of this meter.
                              </p>
                            </div>

                            <div className="rounded-2xl border border-[#edf4ff] bg-white p-3">
                              <p className="text-xs uppercase tracking-[0.14em] text-[#5f7396]">What moves it</p>
                              <p className="mt-1 text-xs leading-relaxed text-[#50607d]">
                                Improve this score by widening the surplus gap, reducing concentration risk, and keeping the goal horizon realistic.
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.article>

                      <motion.article
                        className="rounded-[1.75rem] border border-[#d8e7ff] bg-[linear-gradient(160deg,#ffffff_0%,#f7f9ff_100%)] p-5 shadow-[0_14px_30px_rgba(43,92,255,0.08)] lg:col-span-4"
                        variants={featureCardReveal}
                        custom={2}
                      >
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="h-4.5 w-4.5 text-[#2b5cff]" />
                          <p className="text-sm font-semibold text-[#0a1930]">Risk Drift Alert</p>
                        </div>
                        <p className="mt-1 text-xs text-[#5f7396]">Live concentration and tolerance check versus your declared risk profile.</p>

                        <div className="mt-5 flex items-center gap-4">
                          <div className="relative flex h-28 w-28 items-center justify-center">
                            <div
                              className="absolute inset-0 rounded-full"
                              style={{
                                background: `conic-gradient(${aiMarketLab.riskDriftScore >= 70 ? "#e74c3c" : aiMarketLab.riskDriftScore >= 45 ? "#f59e0b" : "#10b981"} 0 ${aiMarketLab.riskDriftScore}%, rgba(10,25,48,0.08) ${aiMarketLab.riskDriftScore}% 100%)`,
                              }}
                            />
                            <div className="absolute inset-[10px] rounded-full border border-white bg-white shadow-[inset_0_1px_4px_rgba(10,25,48,0.06)]" />
                            <div className="relative text-center">
                              <p className="text-3xl font-bold text-[#0a1930]">{aiMarketLab.riskDriftScore}</p>
                              <p className="text-[10px] uppercase tracking-[0.16em] text-[#5f7396]">/100</p>
                            </div>
                          </div>

                          <div className="flex-1">
                            <StatusBadge
                              label={aiMarketLab.riskLabel}
                              tone={aiMarketLab.riskDriftScore >= 70 ? "critical" : aiMarketLab.riskDriftScore >= 45 ? "warning" : "success"}
                            />
                            <p className="mt-2 text-xs leading-relaxed text-[#50607d]">{aiMarketLab.riskMessage}</p>
                            <div className="mt-3 space-y-2">
                              {(holdingsAnalytics?.concentrationWarnings ?? []).slice(0, 2).map((warning) => (
                                <div key={warning.id} className="rounded-2xl border border-[#edf4ff] bg-[#f8fbff] px-3 py-2">
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5f7396]">{warning.title}</p>
                                  <p className="mt-1 text-xs leading-relaxed text-[#0a1930]">{warning.message}</p>
                                </div>
                              ))}
                              {(holdingsAnalytics?.concentrationWarnings ?? []).length === 0 ? (
                                <p className="rounded-2xl border border-[#edf4ff] bg-[#f8fbff] px-3 py-2 text-xs leading-relaxed text-[#5f7396]">
                                  Portfolio concentration is currently calm. The risk meter stays green until a new drift signal appears.
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </motion.article>

                      <motion.article
                        className="rounded-[1.75rem] border border-[#d8e7ff] bg-white p-5 shadow-[0_14px_30px_rgba(43,92,255,0.08)] lg:col-span-4"
                        variants={featureCardReveal}
                        custom={3}
                      >
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4.5 w-4.5 text-[#2b5cff]" />
                          <p className="text-sm font-semibold text-[#0a1930]">Market Context Summary</p>
                        </div>
                        <p className="mt-1 text-xs text-[#5f7396]">Live market context blended with the horizon you selected above.</p>

                        <div className="mt-4 h-36 rounded-2xl border border-[#edf4ff] bg-[#f8fbff] p-3">
                          {marketTrend.length > 1 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={marketTrend} margin={{ top: 6, right: 6, left: -12, bottom: 0 }}>
                                <defs>
                                  <linearGradient id="dashboard-market-lab-gradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2b5cff" stopOpacity={0.45} />
                                    <stop offset="95%" stopColor="#2b5cff" stopOpacity={0.03} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="4 6" stroke="rgba(91,115,150,0.12)" vertical={false} />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#5f7396", fontSize: 10 }} />
                                <YAxis hide />
                                <Tooltip
                                  formatter={(value) => formatCompactCurrency(Number(value ?? 0))}
                                  contentStyle={{ backgroundColor: "#ffffff", borderColor: "#d8e7ff", borderRadius: "12px" }}
                                />
                                <Area type="monotone" dataKey="close" stroke="#2b5cff" strokeWidth={2.2} fill="url(#dashboard-market-lab-gradient)" dot={false} />
                              </AreaChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-[#5f7396]">Trend history loading...</div>
                          )}
                        </div>

                        <div className="mt-4 space-y-2.5">
                          {aiMarketLab.marketPulseItems.map((item) => (
                            <div key={item.label} className="flex items-center justify-between gap-3 rounded-2xl border border-[#edf4ff] bg-[#f8fbff] px-3 py-2.5">
                              <div>
                                <p className="text-sm font-semibold text-[#0a1930]">{item.label}</p>
                                <p className="text-xs text-[#5f7396]">{item.detail}</p>
                              </div>
                              <StatusBadge label={item.value} tone={insightToneToBadgeTone(item.tone)} />
                            </div>
                          ))}
                        </div>

                        <p className="mt-3 text-xs text-[#5f7396]">NIFTY trend: {aiMarketLab.marketTrendMovement}</p>
                      </motion.article>

                      <motion.article
                        className="rounded-[1.75rem] border border-[#d8e7ff] bg-[linear-gradient(160deg,#f9fbff_0%,#eef4ff_100%)] p-5 shadow-[0_14px_30px_rgba(43,92,255,0.08)] lg:col-span-4"
                        variants={featureCardReveal}
                        custom={4}
                      >
                        <div className="flex items-center gap-2">
                          <RefreshCcw className="h-4.5 w-4.5 text-[#2b5cff]" />
                          <p className="text-sm font-semibold text-[#0a1930]">AI Action Queue</p>
                        </div>
                        <p className="mt-1 text-xs text-[#5f7396]">The next three actions the dashboard wants you to see first.</p>

                        <div className="mt-4 rounded-2xl border border-white/70 bg-white/90 p-3.5 shadow-[0_8px_18px_rgba(10,25,48,0.04)]">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-[#5f7396]">AI summary</p>
                          <p className="mt-1 text-sm leading-relaxed text-[#0a1930]">{aiMarketLab.advisorExcerpt}</p>
                        </div>

                        <div className="mt-4 space-y-3">
                          {aiMarketLab.actionQueue.map((item, index) => {
                            const stepTone = insightToneToBadgeTone(item.tone);
                            const stepColor =
                              item.tone === "critical"
                                ? "from-finance-red/90 to-[#ff8a7b]"
                                : item.tone === "warning"
                                  ? "from-amber-500 to-orange-400"
                                  : "from-[#2b5cff] to-[#00d8ff]";

                            return (
                              <div key={item.title} className="flex items-start gap-3 rounded-2xl border border-[#edf4ff] bg-white px-3 py-3">
                                <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${stepColor} text-sm font-bold text-white shadow-[0_8px_16px_rgba(43,92,255,0.16)]`}>
                                  {index + 1}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-semibold text-[#0a1930]">{item.title}</p>
                                    <StatusBadge label={item.badge} tone={stepTone} />
                                  </div>
                                  <p className="mt-1 text-xs leading-relaxed text-[#5f7396]">{item.detail}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.article>
                    </div>
                  </div>
                </motion.section>
              ) : null}

              {/* ── Section label: Market + Tools ── */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-finance-border" />
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-finance-muted">Market Data &amp; Planning Tools</p>
                <div className="h-px flex-1 bg-finance-border" />
              </div>

              <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
                {/* Left: NIFTY Chart + Market Indicator Cards */}
                <article className="rounded-2xl border border-finance-border bg-white p-5 shadow-[0_12px_30px_rgba(10,25,48,0.07)] sm:p-6">
                  {/* Chart header */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-finance-accent opacity-60" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-finance-accent" />
                        </span>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-finance-text">NIFTY 50 — Live Chart</p>
                      </div>
                      <p className="mt-1 text-[11px] text-finance-muted">Window: {selectedHorizonLabel}</p>
                      {niftyTrendSummary ? (
                        <div className="mt-1 flex items-center gap-2">
                          <p className="text-base font-bold text-finance-text">{formatIndexNumber(niftyTrendSummary.latest)}</p>
                          <span className={`text-xs font-semibold ${ niftyTrendSummary.changePct >= 0 ? "text-finance-green" : "text-finance-red"}`}>
                            {formatSignedPercent(niftyTrendSummary.changePct)}
                          </span>
                        </div>
                      ) : null}
                    </div>
                    <StatusBadge label={marketTrendStatus.label} tone={marketTrendStatus.tone} />
                  </div>

                  <div className="mt-4 h-[240px]">
                    {isMarketTrendLoading ? (
                      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-finance-border bg-[#f8faff] text-xs text-finance-muted">
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin text-finance-accent/40" />
                          <span>Loading NIFTY trend…</span>
                        </div>
                      </div>
                    ) : marketTrend.length === 0 ? (
                      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-finance-border bg-[#f8faff] text-xs text-finance-muted">
                        NIFTY trend data unavailable.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={marketTrend} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="niftyTrendFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#2b5cff" stopOpacity={0.28} />
                              <stop offset="95%" stopColor="#2b5cff" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="rgba(130,147,177,0.12)" strokeDasharray="4 8" vertical={false} />
                          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#5a7099", fontSize: 10, fontWeight: 500 }} />
                          <YAxis tick={{ fill: "#5a7099", fontSize: 10 }} tickFormatter={(value: number) => formatIndexNumber(value)} width={68} />
                          <Tooltip
                            contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f4", boxShadow: "0 8px 20px rgba(10,25,48,0.10)" }}
                            formatter={(value) => [formatIndexNumber(Number(value ?? 0)), "NIFTY close"]}
                            labelFormatter={(label) => `Date: ${String(label ?? "")}`}
                          />
                          <Area type="monotone" dataKey="close" stroke="#2b5cff" strokeWidth={2.5} fill="url(#niftyTrendFill)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* Market Indicator Tiles */}
                  <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
                    {orderedMarketIndicators.length === 0 ? (
                      <div className="sm:col-span-3 flex items-center justify-center rounded-xl border border-dashed border-finance-border bg-[#f8faff] px-3 py-4 text-xs text-finance-muted">
                        {isMarketLoading ? "Fetching live data…" : "Market indicators unavailable."}
                      </div>
                    ) : (
                      orderedMarketIndicators.map((indicator) => (
                        <div
                          key={indicator.id}
                          className={`relative overflow-hidden rounded-xl border px-4 py-3.5 transition-all duration-200 hover:-translate-y-0.5 ${
                            indicator.trend === "up"
                              ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white"
                              : indicator.trend === "down"
                                ? "border-red-200 bg-gradient-to-br from-red-50 to-white"
                                : "border-finance-border bg-white"
                          }`}
                        >
                          <div className={`absolute right-3 top-3 text-lg font-bold leading-none opacity-20 ${
                            indicator.trend === "up" ? "text-emerald-500" : indicator.trend === "down" ? "text-red-500" : "text-finance-muted"
                          }`}>
                            {indicator.trend === "up" ? "▲" : indicator.trend === "down" ? "▼" : "—"}
                          </div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-finance-muted">{indicator.displayName}</p>
                          <p className="mt-1.5 text-xl font-bold tabular-nums text-finance-text">{formatIndexNumber(indicator.value)}</p>
                          <p className={`mt-1 text-xs font-semibold tabular-nums ${
                            indicator.trend === "up" ? "text-emerald-600" : indicator.trend === "down" ? "text-red-500" : "text-finance-muted"
                          }`}>
                            {indicator.trend === "up" ? "▲" : indicator.trend === "down" ? "▼" : ""}{" "}
                            {formatSignedNumber(indicator.changeAbs)} ({formatSignedPercent(indicator.changePct)})
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </article>

                {/* Right: SIP Calculator */}
                <article className="rounded-2xl border border-finance-border bg-white p-5 shadow-[0_12px_30px_rgba(10,25,48,0.07)] sm:p-6">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-finance-text">SIP Calculator</p>
                      <p className="mt-0.5 text-[11px] text-finance-muted">Projection — not financial advice</p>
                    </div>
                    <span className="inline-flex h-7 items-center rounded-full bg-[#eef3ff] px-2.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#2b5cff]">Calculator</span>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div>
                      <label htmlFor="sip-amount" className="text-[10px] font-bold uppercase tracking-[0.14em] text-finance-muted">Monthly SIP (INR)</label>
                      <input
                        id="sip-amount"
                        type="number"
                        min={0}
                        step={500}
                        value={sipMonthlyAmount}
                        onChange={(event) => setSipMonthlyAmount(Math.max(parseNumberInput(event.target.value), 0))}
                        className="mt-2 h-10 w-full rounded-xl border border-finance-border bg-[#f8faff] px-3.5 text-sm font-medium text-finance-text transition focus:border-finance-accent/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-finance-accent/25"
                      />
                    </div>

                    <div>
                      <label htmlFor="sip-return" className="text-[10px] font-bold uppercase tracking-[0.14em] text-finance-muted">Expected Annual Return (%)</label>
                      <input
                        id="sip-return"
                        type="number"
                        min={0}
                        max={40}
                        step={0.1}
                        value={sipAnnualReturn}
                        onChange={(event) => setSipAnnualReturn(Math.min(Math.max(parseNumberInput(event.target.value), 0), 40))}
                        className="mt-2 h-10 w-full rounded-xl border border-finance-border bg-[#f8faff] px-3.5 text-sm font-medium text-finance-text transition focus:border-finance-accent/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-finance-accent/25"
                      />
                    </div>

                    <div>
                      <label htmlFor="sip-duration" className="text-[10px] font-bold uppercase tracking-[0.14em] text-finance-muted">Duration (Years)</label>
                      <input
                        id="sip-duration"
                        type="number"
                        min={0.5}
                        max={40}
                        step={0.5}
                        value={sipDurationYears}
                        onChange={(event) => setSipDurationYears(Math.min(Math.max(parseNumberInput(event.target.value), 0.5), 40))}
                        className="mt-2 h-10 w-full rounded-xl border border-finance-border bg-[#f8faff] px-3.5 text-sm font-medium text-finance-text transition focus:border-finance-accent/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-finance-accent/25"
                      />
                    </div>
                  </div>

                  {/* Projection results */}
                  <div className="mt-5 rounded-xl border border-[#dce8ff] bg-gradient-to-br from-[#f0f5ff] to-[#f8faff] p-4">
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-finance-muted">Total Invested</span>
                        <span className="text-sm font-bold text-finance-text">{formatCurrency(sipProjection.invested)}</span>
                      </div>
                      <div className="h-px bg-[#dce8ff]" />
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-finance-muted">Est. Returns</span>
                        <span className="text-sm font-bold text-emerald-600">+{formatCurrency(sipProjection.estimatedReturns)}</span>
                      </div>
                      <div className="h-px bg-[#dce8ff]" />
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-finance-text">Projected Value</span>
                        <span className="text-base font-extrabold text-finance-accent">{formatCurrency(sipProjection.projectedValue)}</span>
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 text-[10px] leading-relaxed text-finance-muted">
                    Over {sipProjection.months} months at {sipAnnualReturn}% p.a. Assumes constant contribution.
                    {sipSuggestedAmount !== null ? ` Your profile surplus: ${formatCurrency(Math.round(sipSuggestedAmount))}/mo.` : ""}
                  </p>
                </article>
              </section>

              {/* ── Focused Analysis label ── */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-finance-border" />
                <div className="flex items-center gap-2 rounded-full border border-finance-border bg-white px-4 py-1.5 shadow-sm">
                  <CircleDot className="h-3 w-3 text-finance-accent" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-finance-text">{focusedInsightsTitle}</p>
                </div>
                <div className="h-px flex-1 bg-finance-border" />
              </div>
              <p className="-mt-2 text-center text-xs text-finance-muted">{focusedInsightsHint}</p>

              <section className={`grid gap-4 ${selectedLens === "cashflow" ? "lg:grid-cols-2" : "lg:grid-cols-1"}`}>
                {showCashflowBridge ? (
                <article className="rounded-xl border border-finance-border bg-white p-4 shadow-[0_8px_20px_rgba(10,25,48,0.05)]">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-finance-text">Cashflow Bridge</p>
                    <p className="text-[10px] text-[#5a6f94]">Positive bars add cash, negative bars reduce cash</p>
                  </div>
                  <div className="mt-3 h-[220px]">
                    {cashflowBridgeData.length === 0 ? (
                      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-finance-border bg-white text-xs text-finance-muted">Cashflow data unavailable.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={cashflowBridgeData} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
                          <CartesianGrid stroke="rgba(130,147,177,0.16)" strokeDasharray="4 6" vertical={false} />
                          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#3f5680", fontSize: 11 }} />
                          <YAxis tickFormatter={(value: number) => formatCompactCurrency(value)} tick={{ fill: "#3f5680", fontSize: 10 }} />
                          <ReferenceLine y={0} stroke="#9eb2d8" strokeDasharray="4 4" />
                          <Tooltip
                            formatter={(value) => [formatCompactCurrency(Number(value ?? 0)), "Cash impact"]}
                            labelFormatter={(label) => `Category: ${String(label ?? "")}`}
                          />
                          <Bar dataKey="value" radius={[5, 5, 0, 0]}>{cashflowBridgeData.map((entry) => <Cell key={entry.label} fill={entry.fill} />)}</Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <p className="mt-2 text-[11px] text-finance-muted">
                    Net monthly balance after planned investing: {formatCompactCurrency(cashflowBalanceValue)}.
                  </p>
                </article>
                ) : null}
                {showAllocationMix ? (
                <article className="rounded-xl border border-finance-border bg-white p-4 shadow-[0_8px_20px_rgba(10,25,48,0.05)]">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-finance-text">Allocation Mix</p>
                    <p className="text-[10px] text-[#5a6f94]">{allocationDonutData.length} segments • {formatCompactCurrency(allocationTotalValue)}</p>
                  </div>
                  <p className="mt-1 text-[11px] text-finance-muted">{allocationSubtitle}</p>
                  <div className="mt-3 h-[220px]">
                    {allocationDonutData.length === 0 ? (
                      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-finance-border bg-white text-xs text-finance-muted">Upload holdings for allocation map.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={allocationDonutData} dataKey="value" innerRadius={50} outerRadius={82} paddingAngle={2}>
                            {allocationDonutData.map((entry, index) => <Cell key={entry.name} fill={allocationPalette[index % allocationPalette.length]} />)}
                          </Pie>
                          <Tooltip
                            formatter={(value) => [formatCompactCurrency(Number(value ?? 0)), "Allocated amount"]}
                            labelFormatter={(label) => `Segment: ${String(label ?? "")}`}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  {topAllocationSlices.length > 0 ? (
                    <div className="mt-2 space-y-1.5">
                      {topAllocationSlices.map((slice, index) => (
                        <div key={slice.name} className="flex items-center justify-between text-[11px] text-finance-muted">
                          <span className="inline-flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: allocationPalette[index % allocationPalette.length] }} />
                            {slice.name}
                          </span>
                          <span>{slice.sharePct.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </article>
                ) : null}
                {showAlertsFunnel ? (
                <article className="rounded-xl border border-finance-border bg-white p-4 shadow-[0_8px_20px_rgba(10,25,48,0.05)]">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-finance-text">Alerts Funnel</p>
                    <p className="text-[10px] text-[#5a6f94]">Triggered alerts split into Ready, Deferred, and Blocked</p>
                  </div>
                  <div className="mt-3 h-[220px]">
                    {alertsFunnelData.length === 0 ? (
                      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-finance-border bg-white text-xs text-finance-muted">Alert telemetry unavailable.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={alertsFunnelData} layout="vertical" margin={{ top: 8, right: 10, left: 4, bottom: 0 }}>
                          <CartesianGrid stroke="rgba(130,147,177,0.16)" strokeDasharray="4 6" horizontal={false} />
                          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#3f5680", fontSize: 11 }} />
                          <YAxis type="category" dataKey="stage" axisLine={false} tickLine={false} tick={{ fill: "#3f5680", fontSize: 11 }} width={68} />
                          <Tooltip
                            formatter={(value) => [Number(value ?? 0), "Alert count"]}
                            labelFormatter={(label) => `Stage: ${String(label ?? "")}`}
                          />
                          <Bar dataKey="value" radius={[0, 6, 6, 0]}>{alertsFunnelData.map((entry) => <Cell key={entry.stage} fill={entry.fill} />)}</Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  {alertsReadyRate !== null ? (
                    <p className="mt-2 text-[11px] text-finance-muted">
                      Readiness rate: {alertsReadyRate.toFixed(1)}% of triggered alerts are ready for action.
                    </p>
                  ) : null}
                </article>
                ) : null}
              </section>

              {showScenarioComparison || showRiskHeatmap ? (
              <section className="grid gap-4 lg:grid-cols-1">
                {showScenarioComparison ? (
                <article className="rounded-xl border border-finance-border bg-white p-4 shadow-[0_8px_20px_rgba(10,25,48,0.05)]">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-finance-text">Scenario Comparison</p>
                    <p className="text-[10px] text-[#5a6f94]">{selectedHorizonLabel} projection with monthly SIP continuity</p>
                  </div>
                  <p className="mt-1 text-[11px] text-finance-muted">
                    Assumed annual returns: Conservative {SCENARIO_RETURN_PCT.conservative}% • Moderate {SCENARIO_RETURN_PCT.moderate}% • Aggressive {SCENARIO_RETURN_PCT.aggressive}%.
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-finance-border bg-finance-surface px-2.5 py-1 text-finance-muted">
                      <span className="h-2 w-2 rounded-full bg-[#5a6d8f]" /> Conservative
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-finance-border bg-finance-surface px-2.5 py-1 text-finance-muted">
                      <span className="h-2 w-2 rounded-full bg-[#2b5cff]" /> Moderate
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-finance-border bg-finance-surface px-2.5 py-1 text-finance-muted">
                      <span className="h-2 w-2 rounded-full bg-[#69c8ad]" /> Aggressive
                    </span>
                    <span className="inline-flex items-center rounded-full border border-finance-border bg-finance-surface px-2.5 py-1 text-finance-muted">
                      No-return baseline: {formatCompactCurrency(scenarioBaselineCorpus)}
                    </span>
                  </div>

                  <div className="mt-3 h-[250px]">
                    {scenarioProjectionData.length === 0 ? (
                      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-finance-border bg-white text-xs text-finance-muted">Scenario model unavailable.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={scenarioProjectionData} margin={{ top: 8, right: 10, left: -12, bottom: 0 }}>
                          <CartesianGrid stroke="rgba(130,147,177,0.16)" strokeDasharray="4 6" vertical={false} />
                          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#3f5680", fontSize: 11 }} />
                          <YAxis tickFormatter={(value: number) => formatCompactCurrency(value)} tick={{ fill: "#3f5680", fontSize: 10 }} width={78} />
                          <Tooltip
                            formatter={(value, name) => {
                              const seriesName = String(name ?? "");
                              const readable = seriesName === "conservative"
                                ? `Conservative (${SCENARIO_RETURN_PCT.conservative}% p.a.)`
                                : seriesName === "moderate"
                                  ? `Moderate (${SCENARIO_RETURN_PCT.moderate}% p.a.)`
                                  : seriesName === "aggressive"
                                    ? `Aggressive (${SCENARIO_RETURN_PCT.aggressive}% p.a.)`
                                    : seriesName;

                              return [formatCompactCurrency(Number(value ?? 0)), readable];
                            }}
                            labelFormatter={(label) => `Checkpoint: ${String(label ?? "")}`}
                          />
                          <Area type="monotone" dataKey="conservative" stroke="#5a6d8f" fillOpacity={0.06} fill="#5a6d8f" />
                          <Area type="monotone" dataKey="moderate" stroke="#2b5cff" fillOpacity={0.14} fill="#2b5cff" />
                          <Area type="monotone" dataKey="aggressive" stroke="#69c8ad" fillOpacity={0.1} fill="#69c8ad" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {scenarioOutcomeRows.length > 0 ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {scenarioOutcomeRows.map((row) => (
                        <div key={row.name} className="rounded-lg border border-finance-border bg-finance-surface/50 px-3 py-2.5">
                          <p className="text-[10px] uppercase tracking-[0.1em] text-finance-muted">{row.name} ({row.annualReturn}% p.a.)</p>
                          <p className="mt-1 text-sm font-semibold text-finance-text">{formatCompactCurrency(row.value)}</p>
                          <p className={`mt-1 text-[11px] ${row.excess >= 0 ? "text-finance-green" : "text-finance-red"}`}>
                            {row.excess >= 0 ? "+" : ""}{formatCompactCurrency(row.excess)} vs baseline
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </article>
                ) : null}
                {showRiskHeatmap ? (
                <article className="rounded-xl border border-finance-border bg-white p-4 shadow-[0_8px_20px_rgba(10,25,48,0.05)]">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-finance-text">Risk Heatmap</p>
                    <p className="text-[10px] text-[#5a6f94]">Module severity matrix</p>
                  </div>
                  <div className="mt-3 overflow-x-auto rounded-lg border border-finance-border bg-white">
                    <table className="w-full min-w-[320px] border-collapse text-xs">
                      <thead><tr className="bg-finance-surface/75 text-finance-text"><th className="border-b border-finance-border px-3 py-2 text-left">Module</th><th className="border-b border-finance-border px-3 py-2 text-center">Low</th><th className="border-b border-finance-border px-3 py-2 text-center">Medium</th><th className="border-b border-finance-border px-3 py-2 text-center">High</th></tr></thead>
                      <tbody>
                        {riskHeatmapData.map((row) => (
                          <tr key={row[0].row}>
                            <td className="border-b border-finance-border px-3 py-2 font-semibold text-finance-text">{row[0].row}</td>
                            {row.map((cell) => (
                              <td key={`${cell.row}-${cell.col}`} className="border-b border-finance-border px-3 py-2 text-center">
                                <span className={`inline-flex h-6 w-10 items-center justify-center rounded-md text-[10px] font-semibold ${cell.intensity === "high" ? cell.col === "High" ? "bg-finance-red/20 text-finance-red" : cell.col === "Medium" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700" : "bg-[#eef3ff] text-[#3f5680]"}`}>{cell.value ? "1" : "-"}</span>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
                ) : null}
              </section>
              ) : null}

              {/* ── Divider before advanced section ── */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-finance-border" />
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-finance-muted">Advanced Intelligence</p>
                <div className="h-px flex-1 bg-finance-border" />
              </div>

              <section className="rounded-2xl border border-finance-border bg-white/95 p-5 shadow-[0_12px_28px_rgba(10,25,48,0.06)] sm:p-6">
                <p className="text-sm font-bold text-finance-text">Profile Diagnostics &amp; Intelligence Layer</p>
                <p className="mt-1 text-xs text-finance-muted">Deeper intelligence context, data quality checks, and model-backed focus ranking.</p>

                <section className="mt-4 rounded-2xl border border-finance-border bg-white/95 p-4 shadow-[0_12px_28px_rgba(10,25,48,0.06)] sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-finance-muted">Customer Intelligence Layer</p>
                    <h2 className="mt-1 text-xl font-semibold text-finance-text sm:text-2xl">Personalized dashboard built from your Supabase profile</h2>
                    <p className="mt-1 text-sm text-finance-muted">
                      {profile.city || profile.state || profile.occupation_title
                        ? `${[profile.occupation_title, profile.city || profile.state].filter(Boolean).join(" · ")} · Updated ${latestUpdatedAt}`
                        : `Updated ${latestUpdatedAt}`}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <StatusBadge
                      label={profile.kyc_status === "verified" ? "KYC verified" : `KYC ${profile.kyc_status}`}
                      tone={
                        profile.kyc_status === "verified"
                          ? "success"
                          : profile.kyc_status === "rejected"
                            ? "critical"
                            : "warning"
                      }
                    />
                    <StatusBadge
                      label={profile.tax_regime ? `Tax ${profile.tax_regime.toUpperCase()}` : "Tax not set"}
                      tone={profile.tax_regime ? "info" : "warning"}
                    />
                    <StatusBadge
                      label={profile.consent_to_contact ? "Contact enabled" : "Contact restricted"}
                      tone={profile.consent_to_contact ? "success" : "neutral"}
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  {intelligence
                    ? [
                        {
                          label: "Monthly income",
                          value: formatCurrency(intelligence.monthlyIncome),
                          hint: `${formatRisk(profile.risk_appetite)} risk profile`,
                        },
                        {
                          label: "Living + EMI outflow",
                          value: formatCurrency(intelligence.monthlyOutflow),
                          hint: `${intelligence.expenseLoadPct.toFixed(1)}% of income`,
                        },
                        {
                          label: "Investable surplus",
                          value: formatCurrency(intelligence.investableSurplus),
                          hint: `${intelligence.savingsRatePct.toFixed(1)}% savings rate`,
                        },
                        {
                          label: "Emergency runway",
                          value: `${intelligence.emergencyRunwayMonths.toFixed(1)} months`,
                          hint: `Declared ${profile.emergency_fund_months.toFixed(1)} months`,
                        },
                        {
                          label: "Goal coverage",
                          value: `${intelligence.goalCoveragePct.toFixed(1)}%`,
                          hint: `Gap ${formatCompactCurrency(targetGap)}`,
                        },
                        {
                          label: "Visible corpus",
                          value: formatCompactCurrency(intelligence.totalVisibleCorpus),
                          hint: "Savings + holdings value",
                        },
                      ].map((item) => (
                        <article key={item.label} className="rounded-xl border border-finance-border bg-finance-panel px-3.5 py-3">
                          <p className="text-[11px] uppercase tracking-[0.12em] text-finance-muted">{item.label}</p>
                          <p className="mt-1 text-base font-semibold text-finance-text">{item.value}</p>
                          <p className="mt-1 text-xs text-finance-muted">{item.hint}</p>
                        </article>
                      ))
                    : null}
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <article className="rounded-xl border border-finance-border bg-finance-surface/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-finance-muted">Strategic Pressure Map</p>
                    <div className="mt-3 space-y-2.5 text-sm">
                      <div className="flex items-center justify-between gap-3 rounded-lg border border-finance-border bg-white px-3 py-2.5">
                        <span className="text-finance-text">Monthly target requirement</span>
                        <span className="font-semibold text-finance-text">
                          {intelligence ? formatCurrency(intelligence.requiredMonthlyToGoal) : "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-lg border border-finance-border bg-white px-3 py-2.5">
                        <span className="text-finance-text">Funding pace status</span>
                        <span
                          className={`font-semibold ${
                            intelligence && intelligence.goalFundingStress <= 0
                              ? "text-finance-green"
                              : "text-amber-700"
                          }`}
                        >
                          {intelligence
                            ? intelligence.goalFundingStress <= 0
                              ? "On track"
                              : `Need +${formatCompactCurrency(intelligence.goalFundingStress)}/mo`
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-lg border border-finance-border bg-white px-3 py-2.5">
                        <span className="text-finance-text">Tax optimization runway</span>
                        <span className="font-semibold text-finance-text">
                          {taxSummary ? formatCompactCurrency(taxSummary.section80cRemainingInr) : "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-lg border border-finance-border bg-white px-3 py-2.5">
                        <span className="text-finance-text">Concentration warnings</span>
                        <span className="font-semibold text-finance-text">
                          {holdingsAnalytics ? holdingsAnalytics.concentrationWarnings.length : 0}
                        </span>
                      </div>
                    </div>
                  </article>

                  <article className="rounded-xl border border-finance-border bg-finance-surface/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-finance-muted">Data Completeness and Relevance</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {profileDataReadiness.map((item) => (
                        <StatusBadge key={item.label} label={item.label} tone={item.tone} />
                      ))}
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-finance-muted">
                      Recommended focus right now: {intelligenceSnapshot ? intelligenceSnapshot.recommendedFocus.toUpperCase() : "N/A"}.
                      This layer updates from the same live module APIs used below, ensuring consistency with your Pravix dashboard logic.
                    </p>
                  </article>
                </div>
                </section>

                <div className="mt-4">
                  <ExecutiveIntelligencePanel
                    refreshKey={refreshTick}
                    manualFocus={manualFocus}
                    effectiveFocus={effectiveFocus}
                    onFocusChange={setManualFocus}
                    onRecommendedFocusChange={setRecommendedFocus}
                  />
                </div>
              </section>

              {orderedModuleKeys.map((moduleKey) => (
                <div key={moduleKey} className={getModuleContainerClassName(moduleKey)}>
                  {renderSignedInModule(moduleKey, profile)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedKpi ? (
        <div className="fixed inset-0 z-40">
          <button type="button" aria-label="Close KPI drawer" onClick={() => setSelectedKpiId(null)} className="absolute inset-0 bg-[#0d1a30]/35 backdrop-blur-[1px]" />
          <aside className="absolute right-0 top-0 h-full w-full max-w-md border-l border-finance-border bg-white shadow-[-20px_0_44px_rgba(9,22,43,0.25)]">
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-3 border-b border-finance-border px-4 py-4 sm:px-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-finance-muted">KPI Drilldown</p>
                  <h3 className="mt-1 text-lg font-semibold text-finance-text">{selectedKpi.label}</h3>
                  <p className="mt-1 text-sm text-finance-muted">{selectedKpi.detail}</p>
                </div>
                <button type="button" onClick={() => setSelectedKpiId(null)} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-finance-border bg-white text-finance-muted hover:text-finance-text">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-finance-border bg-finance-surface/40 p-3"><p className="text-[10px] uppercase tracking-[0.09em] text-finance-muted">Current Value</p><p className="mt-1 text-sm font-semibold text-finance-text">{selectedKpi.value}</p></div>
                  <div className="rounded-lg border border-finance-border bg-finance-surface/40 p-3"><p className="text-[10px] uppercase tracking-[0.09em] text-finance-muted">Delta</p><p className={`mt-1 text-sm font-semibold ${toneToClassName(selectedKpi.deltaTone)}`}>{selectedKpi.deltaLabel}</p></div>
                  <div className="rounded-lg border border-finance-border bg-finance-surface/40 p-3"><p className="text-[10px] uppercase tracking-[0.09em] text-finance-muted">Source</p><p className="mt-1 text-sm font-semibold text-finance-text">{selectedKpi.source}</p></div>
                </div>
                <article className="rounded-xl border border-finance-border bg-white p-3.5">
                  <div className="flex items-center justify-between gap-2"><p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-finance-muted">Mini Trend</p><p className="text-[10px] text-finance-muted">Recent checkpoints</p></div>
                  <div className="mt-2 h-44">
                    {selectedKpiTrend.length === 0 ? (
                      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-finance-border bg-finance-surface/40 text-xs text-finance-muted">Trend data unavailable.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={selectedKpiTrend} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
                          <CartesianGrid stroke="rgba(130,147,177,0.14)" strokeDasharray="4 6" vertical={false} />
                          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#6e7f9d", fontSize: 10 }} />
                          <YAxis hide />
                          <Tooltip formatter={(value) => formatCompactCurrency(Number(value ?? 0))} />
                          <Area type="monotone" dataKey="value" stroke="#2b5cff" strokeWidth={2} fill="#2b5cff" fillOpacity={0.12} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </article>
              </div>
            </div>
          </aside>
        </div>
        ) : null}
      </>
    </RequireAuth>
  );
}

