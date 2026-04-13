"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CircleDot,
  CircleUserRound,
  LayoutGrid,
  ListFilter,
  Loader2,
  LogOut,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  WalletMinimal,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import SiteHeader from "@/components/SiteHeader";
import AuthPanel from "@/components/AuthPanel";
import AgentAdvisorPanel from "@/components/AgentAdvisorPanel";
import ExecutiveIntelligencePanel from "@/components/ExecutiveIntelligencePanel";
import HoldingsAnalyzerPanel from "@/components/HoldingsAnalyzerPanel";
import SmartAlertsPanel from "@/components/SmartAlertsPanel";
import TaxOptimizationPanel from "@/components/TaxOptimizationPanel";
import { DashboardSectionCard, EmptyState, StatCard, StatusBadge } from "@/components/dashboard/DashboardPrimitives";
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
    const projectionMonths = Math.min(horizonMonths, 36);
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
  }, [holdingsAnalytics?.totalMarketValueInr, profile]);

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
      <div className="min-h-screen bg-[linear-gradient(180deg,#0b1018_0%,#131d2f_26%,#eef3ff_100%)] pb-12 pt-20 sm:pb-16 sm:pt-24">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <section className="rounded-2xl border border-[#39455a] bg-[#111a2a]/88 px-4 py-3 shadow-[0_16px_32px_rgba(2,8,19,0.45)] backdrop-blur-md sm:px-5 sm:py-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-[#edf2ff] sm:text-base">{greetingLabel}</p>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setRefreshTick((current) => current + 1)}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-[#4d5d7c] bg-[#162338] px-4 text-sm font-semibold text-[#e6ecff] transition-all duration-150 hover:bg-[#1e2f4c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79a1ff]/35 active:scale-[0.98]"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Refresh
                </button>

                {signedInEmail ? (
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-[#4d5d7c] bg-[#162338] px-4 text-sm font-semibold text-[#e6ecff] transition-all duration-150 hover:bg-[#1e2f4c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79a1ff]/35 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSigningOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                    Sign Out
                  </button>
                ) : null}
              </div>
            </div>
          </section>

          <section className="relative mt-4 overflow-hidden rounded-[28px] border border-[#374355] bg-[radial-gradient(circle_at_top_left,#252e3e_0%,#131b2a_54%,#0a0f18_100%)] px-4 py-4 shadow-[0_28px_64px_rgba(3,6,15,0.62)] sm:px-6 sm:py-5">
            <div className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-[#f5cc73]/85 blur-[1px]" />
            <div className="pointer-events-none absolute -bottom-8 right-10 h-20 w-20 rounded-full bg-[#f0b85f]/85" />
            <div className="pointer-events-none absolute -left-8 top-16 h-28 w-28 rounded-full border border-[#f6e2b4]/70 bg-[#f6ecd0]/20" />

            <div className="relative flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#92a3c2]">Executive Analytics Canvas</p>
                <p className="mt-1 text-lg font-semibold text-[#f5efe5] sm:text-xl">Power BI-inspired strategic dashboard</p>
                <p className="mt-1 text-sm text-[#9fb0ce]">Strictly driven by your Pravix profile, holdings, tax, alerts, intelligence, and advisor data.</p>
              </div>

              <div className="inline-flex items-center gap-2 rounded-xl border border-[#3d4960] bg-[#101827]/85 px-3 py-2 text-xs text-[#9fb0ce]">
                <Search className="h-3.5 w-3.5" />
                <span>Search dashboard visuals</span>
                <span className="rounded-md border border-[#495978] bg-[#0f1625] px-1.5 py-0.5 text-[10px] text-[#7f93b6]">Ctrl K</span>
              </div>
            </div>

            <div className="relative mt-5 grid gap-4 lg:grid-cols-[58px_minmax(0,1fr)_320px]">
              <aside className="rounded-2xl border border-[#323d4f] bg-[#0f1624]/95 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <div className="flex flex-col items-center gap-2.5">
                  {[
                    { label: "Overview", icon: LayoutGrid, active: true },
                    { label: "Signals", icon: Sparkles, active: false },
                    { label: "Risk", icon: ShieldCheck, active: false },
                    { label: "Assets", icon: WalletMinimal, active: false },
                    { label: "Filters", icon: ListFilter, active: false },
                  ].map((item) => {
                    const Icon = item.icon;

                    return (
                      <div key={item.label} className="group flex w-full flex-col items-center gap-1">
                        <span
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${
                            item.active
                              ? "border-[#7fa8ff] bg-[#1f3050] text-[#f6d48d]"
                              : "border-[#3f4b61] bg-[#131d2f] text-[#8ea4c7] group-hover:border-[#6b84ad] group-hover:text-[#c7d5ee]"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="text-[10px] font-medium text-[#7f93b6]">{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </aside>

              <article className="rounded-2xl border border-[#37465f] bg-[#121b2c]/90 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8fa3c8]">User data trajectory</p>
                    <p className="mt-1 text-sm text-[#e9eef9]">Savings, holdings, and target progression from your dashboard profile.</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#4a5974] bg-[#162035] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#d4def2]">
                    <CircleDot className="h-3 w-3 text-[#f2c96f]" />
                    {isPowerInsightsLoading ? "syncing module insights" : marketStatus.label}
                  </span>
                </div>

                {isMarketLoading || isPowerInsightsLoading ? (
                  <div className="mt-4 h-[250px] animate-pulse rounded-xl border border-[#3b4660] bg-[#151f31]" />
                ) : powerTrendData.length === 0 ? (
                  <div className="mt-4 flex h-[250px] items-center justify-center rounded-xl border border-dashed border-[#3b4660] bg-[#151f31] px-4 text-center text-sm text-[#9db2d5]">
                    Complete onboarding and sync modules to unlock data-driven Power BI visuals.
                  </div>
                ) : (
                  <div className="mt-4 h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={powerTrendData} margin={{ top: 10, right: 10, left: -12, bottom: 0 }}>
                        <defs>
                          <linearGradient id="wealthAreaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f5cc73" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#f5cc73" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="rgba(159,176,206,0.18)" strokeDasharray="4 6" vertical={false} />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#90a4c8", fontSize: 11 }} />
                        <YAxis hide domain={["dataMin - 120000", "dataMax + 120000"]} />
                        <Tooltip
                          cursor={{ stroke: "rgba(245,204,115,0.4)", strokeWidth: 1 }}
                          contentStyle={{
                            backgroundColor: "#111826",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: "12px",
                            color: "#f5efe5",
                          }}
                          formatter={(value, name) => {
                            const numericValue = Number(value ?? 0);
                            const label = String(name ?? "") === "actual" ? "Observed value" : "Goal reference";

                            return [formatCompactCurrency(numericValue), label];
                          }}
                        />
                        <Area type="monotone" dataKey="actual" stroke="#f5cc73" strokeWidth={2.5} fill="url(#wealthAreaGradient)" />
                        <Line type="monotone" dataKey="goalPath" stroke="#9cb2d8" strokeDasharray="6 6" strokeWidth={2} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {strategyKpis.map((kpi) => (
                    <article key={kpi.label} className="rounded-xl border border-[#3a4761] bg-[#121e30] p-3">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-[#7f93b6]">{kpi.label}</p>
                      <p className="mt-1 text-base font-semibold text-[#f5efe5]">{kpi.value}</p>
                      <p className="mt-1 text-[11px] text-[#9cb0d3]">{kpi.hint}</p>
                    </article>
                  ))}
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                  <article className="rounded-xl border border-[#36445f] bg-[#0f1828] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8fa3c8]">Checkpoint tracker</p>
                      <span className="text-[10px] text-[#7f93b6]">Actual vs goal path</span>
                    </div>

                    {trajectoryCheckpoints.length === 0 ? (
                      <p className="mt-2 text-xs text-[#90a4c8]">Trajectory checkpoints unlock after profile sync.</p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {trajectoryCheckpoints.map((checkpoint) => {
                          const deltaLabel = `${checkpoint.gap >= 0 ? "+" : "-"}${formatCompactCurrency(Math.abs(checkpoint.gap))}`;

                          return (
                            <div
                              key={checkpoint.label}
                              className="grid grid-cols-[58px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-[#30405a] bg-[#111d31] px-2.5 py-2"
                            >
                              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#95a9cd]">{checkpoint.label}</span>
                              <span className="truncate text-[11px] text-[#c8d5ec]">{formatCompactCurrency(checkpoint.actual)}</span>
                              <span
                                className={`text-[11px] font-semibold ${
                                  checkpoint.gap >= 0 ? "text-emerald-300" : "text-[#f5c66d]"
                                }`}
                              >
                                {deltaLabel}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </article>

                  <article className="rounded-xl border border-[#36445f] bg-[#0f1828] p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8fa3c8]">Workload split</p>
                    {attentionBreakdown.length === 0 ? (
                      <p className="mt-2 text-xs text-[#90a4c8]">No active workload categories.</p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {attentionBreakdown.map((entry) => (
                          <div key={entry.name}>
                            <div className="flex items-center justify-between text-[10px] text-[#c8d5ec]">
                              <span>{entry.name}</span>
                              <span>{entry.value}</span>
                            </div>
                            <div className="mt-1 h-1.5 rounded-full bg-[#1a2841]">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.max(entry.share, 8)}%`,
                                  backgroundColor: entry.color,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 rounded-lg border border-[#33435d] bg-[#121e31] px-2.5 py-2">
                      <p className="text-[10px] uppercase tracking-[0.08em] text-[#8ea3c7]">Profile freshness</p>
                      <p
                        className={`mt-1 text-xs font-semibold ${
                          profileFreshness.tone === "success"
                            ? "text-emerald-300"
                            : profileFreshness.tone === "warning"
                              ? "text-[#f5c66d]"
                              : profileFreshness.tone === "critical"
                                ? "text-rose-300"
                                : "text-[#c7d4eb]"
                        }`}
                      >
                        {profileFreshness.label}
                      </p>
                    </div>
                  </article>
                </div>
              </article>

              <div className="grid gap-4">
                <article className="rounded-2xl border border-[#37465f] bg-[#121b2c]/90 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8fa3c8]">Allocation intensity</p>
                  <p className="mt-1 text-sm text-[#e9eef9]">{allocationSubtitle}</p>
                  <div className="mt-3 h-[150px]">
                    {allocationBarData.length === 0 ? (
                      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-[#3b4660] bg-[#151f31] px-3 text-center text-xs text-[#92a7cb]">
                        Add profile cashflow inputs or holdings to render allocation visuals.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={allocationBarData} margin={{ top: 8, right: 0, left: -18, bottom: 0 }}>
                          <CartesianGrid vertical={false} stroke="rgba(159,176,206,0.15)" strokeDasharray="4 6" />
                          <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fill: "#90a4c8", fontSize: 11 }} />
                          <YAxis hide />
                          <Tooltip
                            cursor={{ fill: "rgba(255,255,255,0.03)" }}
                            contentStyle={{
                              backgroundColor: "#111826",
                              border: "1px solid rgba(255,255,255,0.12)",
                              borderRadius: "12px",
                              color: "#f5efe5",
                            }}
                            formatter={(value) => {
                              const numericValue = Number(value ?? 0);
                              return [formatCompactCurrency(numericValue), "Market value"];
                            }}
                          />
                          <Bar dataKey="value" radius={[7, 7, 0, 0]}>
                            {allocationBarData.map((entry) => (
                              <Cell key={entry.category} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </article>

                <article className="relative rounded-2xl border border-[#37465f] bg-[#121b2c]/90 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8fa3c8]">Action priority mix</p>
                  <div className="relative mt-2 h-[170px]">
                    {attentionMixData.length === 0 ? (
                      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-[#3b4660] bg-[#151f31] px-3 text-center text-xs text-[#92a7cb]">
                        Sync modules to view cross-domain action priorities.
                      </div>
                    ) : (
                      <>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "#111826",
                                border: "1px solid rgba(255,255,255,0.12)",
                                borderRadius: "12px",
                                color: "#f5efe5",
                              }}
                              formatter={(value, name) => [`${value ?? ""}`, String(name ?? "")]} 
                            />
                            <Pie
                              data={attentionMixData}
                              dataKey="value"
                              nameKey="name"
                              innerRadius={44}
                              outerRadius={68}
                              paddingAngle={2}
                              stroke="none"
                            >
                              {attentionMixData.map((slice) => (
                                <Cell key={slice.name} fill={slice.color} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>

                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <p className="text-[10px] uppercase tracking-[0.08em] text-[#8ea3c7]">Top signal</p>
                            <p className="text-sm font-semibold text-[#f5efe5]">{topAttentionSignal.name}</p>
                            <p className="text-lg font-semibold text-[#f5efe5]">{topAttentionSignal.value}</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {insightDigestItems.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {insightDigestItems.map((item) => {
                        return (
                          <div
                            key={item.title}
                            className="flex items-center justify-between rounded-lg border border-[#3b4760] bg-[#121e31] px-3 py-2"
                          >
                            <div>
                              <p className="text-[11px] font-medium text-[#c8d5ec]">{item.title}</p>
                              <p className="text-[10px] text-[#8ea4c7]">{item.hint}</p>
                            </div>
                            <span className="max-w-[135px] text-right text-[11px] font-semibold text-[#f0c772]">{item.value}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-[#90a4c8]">Insight digest will populate after module sync.</p>
                  )}
                </article>
              </div>
            </div>

            {marketError ? <p className="relative mt-3 text-xs text-rose-300">Market feed warning: {marketError}</p> : null}
            {powerInsightsError ? <p className="relative mt-2 text-xs text-rose-300">Insight sync warning: {powerInsightsError}</p> : null}
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
              <section className="rounded-2xl border border-finance-border bg-white/95 p-4 shadow-[0_12px_28px_rgba(10,25,48,0.06)] sm:p-5">
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
                  {profileIntelligence
                    ? [
                        {
                          label: "Monthly income",
                          value: formatCurrency(profileIntelligence.monthlyIncome),
                          hint: `${formatRisk(profile.risk_appetite)} risk profile`,
                        },
                        {
                          label: "Living + EMI outflow",
                          value: formatCurrency(profileIntelligence.monthlyOutflow),
                          hint: `${profileIntelligence.expenseLoadPct.toFixed(1)}% of income`,
                        },
                        {
                          label: "Investable surplus",
                          value: formatCurrency(profileIntelligence.investableSurplus),
                          hint: `${profileIntelligence.savingsRatePct.toFixed(1)}% savings rate`,
                        },
                        {
                          label: "Emergency runway",
                          value: `${profileIntelligence.emergencyRunwayMonths.toFixed(1)} months`,
                          hint: `Declared ${profile.emergency_fund_months.toFixed(1)} months`,
                        },
                        {
                          label: "Goal coverage",
                          value: `${profileIntelligence.goalCoveragePct.toFixed(1)}%`,
                          hint: `Gap ${formatCompactCurrency(targetGap)}`,
                        },
                        {
                          label: "Visible corpus",
                          value: formatCompactCurrency(profileIntelligence.totalVisibleCorpus),
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
                          {profileIntelligence ? formatCurrency(profileIntelligence.requiredMonthlyToGoal) : "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-lg border border-finance-border bg-white px-3 py-2.5">
                        <span className="text-finance-text">Funding pace status</span>
                        <span
                          className={`font-semibold ${
                            profileIntelligence && profileIntelligence.goalFundingStress <= 0
                              ? "text-finance-green"
                              : "text-amber-700"
                          }`}
                        >
                          {profileIntelligence
                            ? profileIntelligence.goalFundingStress <= 0
                              ? "On track"
                              : `Need +${formatCompactCurrency(profileIntelligence.goalFundingStress)}/mo`
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

