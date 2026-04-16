"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Target,
  ShieldCheck,
  Compass,
  BarChart3,
  Globe2,
  LineChart as LineChartIcon,
  Sparkles,
  BellRing,
  Calculator,
  MessageCircle,
  CircleUserRound,
  RefreshCcw,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import SiteHeader from "@/components/SiteHeader";
import HeroPhoneMockup from "../components/HeroPhoneMockup";
import CalendlyBookingSection from "@/components/CalendlyBookingSection";
import { blogPosts } from "@/app/learn/blog-data";

type LiveChartPoint = {
  label: string;
  value: number;
  avg: number;
};

type LiveFxPoint = {
  label: string;
  rate: number;
  rolling: number;
};

type HomepageMarketPayload = {
  ok?: boolean;
  generatedAt?: string;
  sentimentSource?: "live" | "fallback";
  fxSource?: "live" | "fallback";
  fearGreedTrend?: LiveChartPoint[];
  usdInrTrend?: LiveFxPoint[];
  error?: string;
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
  ok?: boolean;
  generatedAt?: string;
  source?: "live" | "fallback";
  indices?: MarketIndicator[];
};

type DashboardHorizon = "12m" | "24m" | "36m";

type MarketTrendPoint = {
  label: string;
  close: number;
};

type MarketTrendResponse = {
  ok?: boolean;
  generatedAt?: string;
  source?: "live" | "fallback";
  symbol?: "NIFTY50";
  horizon?: DashboardHorizon;
  points?: MarketTrendPoint[];
};

const fallbackSentimentTrend: LiveChartPoint[] = [
  { label: "Apr 01", value: 41, avg: 40 },
  { label: "Apr 02", value: 43, avg: 41 },
  { label: "Apr 03", value: 44, avg: 43 },
  { label: "Apr 04", value: 46, avg: 44 },
  { label: "Apr 05", value: 45, avg: 45 },
  { label: "Apr 06", value: 47, avg: 46 },
  { label: "Apr 07", value: 49, avg: 47 },
  { label: "Apr 08", value: 50, avg: 49 },
];

const fallbackFxTrend: LiveFxPoint[] = [
  { label: "Apr 01", rate: 83.09, rolling: 83.05 },
  { label: "Apr 02", rate: 83.18, rolling: 83.11 },
  { label: "Apr 03", rate: 83.24, rolling: 83.17 },
  { label: "Apr 04", rate: 83.21, rolling: 83.21 },
  { label: "Apr 05", rate: 83.31, rolling: 83.25 },
  { label: "Apr 06", rate: 83.35, rolling: 83.29 },
  { label: "Apr 07", rate: 83.27, rolling: 83.31 },
  { label: "Apr 08", rate: 83.42, rolling: 83.35 },
];

const allocationMixData = [
  { name: "Domestic Equity", value: 52 },
  { name: "Debt & Bonds", value: 24 },
  { name: "International Equity", value: 12 },
  { name: "Gold", value: 7 },
  { name: "Liquidity", value: 5 },
];

const moduleImpactData = [
  { module: "Alerts", score: 88 },
  { module: "Holdings", score: 93 },
  { module: "Tax", score: 81 },
  { module: "Profile", score: 76 },
  { module: "Copilot", score: 90 },
];

const taxEfficiencyData = [
  { quarter: "Q1", used: 28, potential: 40 },
  { quarter: "Q2", used: 47, potential: 63 },
  { quarter: "Q3", used: 71, potential: 84 },
  { quarter: "Q4", used: 96, potential: 100 },
];

const allocationColors = ["#2b5cff", "#00d8ff", "#86a9a3", "#6fa39a", "#dce8ff"];

const motionEase = [0.22, 1, 0.36, 1] as const;

function createSectionReveal(isCompactMotion: boolean) {
  return {
    hidden: { opacity: 0, y: isCompactMotion ? 14 : 26 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: isCompactMotion ? 0.4 : 0.62,
        ease: motionEase,
      },
    },
  };
}

function createChartCardReveal(isCompactMotion: boolean) {
  return {
    hidden: { opacity: 0, y: isCompactMotion ? 12 : 24 },
    show: (delayOrder: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: isCompactMotion ? 0.38 : 0.56,
        delay: (isCompactMotion ? 0.045 : 0.08) * delayOrder,
        ease: motionEase,
      },
    }),
  };
}

function createFeatureCardReveal(isCompactMotion: boolean) {
  return {
    hidden: { opacity: 0, y: isCompactMotion ? 10 : 16 },
    show: (delayOrder: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: isCompactMotion ? 0.34 : 0.48,
        delay: (isCompactMotion ? 0.03 : 0.05) * delayOrder,
        ease: motionEase,
      },
    }),
  };
}

export default function Home() {
  const [isHeroReady, setIsHeroReady] = useState(false);
  const [liveMarket, setLiveMarket] = useState<HomepageMarketPayload | null>(null);
  const [isLiveMarketLoading, setIsLiveMarketLoading] = useState(true);
  const [marketIndices, setMarketIndices] = useState<MarketIndicatorsResponse | null>(null);
  const [marketTrend, setMarketTrend] = useState<MarketTrendResponse | null>(null);
  const [selectedHorizon, setSelectedHorizon] = useState<DashboardHorizon>("12m");
  const [isInsightDataLoading, setIsInsightDataLoading] = useState(true);
  const [isCompactMotion, setIsCompactMotion] = useState(false);

  useEffect(() => {
    // Shorter fallback since no video is loaded
    const fallbackTimer = window.setTimeout(() => {
      setIsHeroReady(true);
    }, 500);

    return () => {
      window.clearTimeout(fallbackTimer);
    };
  }, []);

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

  useEffect(() => {
    let cancelled = false;

    async function loadLiveMarket() {
      setIsLiveMarketLoading(true);
      setIsInsightDataLoading(true);

      try {
        const [homeResponse, indicesResponse, trendResponse] = await Promise.allSettled([
          fetch("/api/market/homepage", {
            method: "GET",
            cache: "no-store",
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

        if (!cancelled) {
          if (homeResponse.status === "fulfilled") {
            const payload = (await homeResponse.value.json().catch(() => ({}))) as HomepageMarketPayload;
            if (homeResponse.value.ok && payload.ok) {
              setLiveMarket(payload);
            } else {
              setLiveMarket(null);
            }
          } else {
            setLiveMarket(null);
          }

          if (indicesResponse.status === "fulfilled") {
            const payload = (await indicesResponse.value.json().catch(() => ({}))) as MarketIndicatorsResponse;
            if (indicesResponse.value.ok && payload.ok) {
              setMarketIndices(payload);
            } else {
              setMarketIndices(null);
            }
          } else {
            setMarketIndices(null);
          }

          if (trendResponse.status === "fulfilled") {
            const payload = (await trendResponse.value.json().catch(() => ({}))) as MarketTrendResponse;
            if (trendResponse.value.ok && payload.ok) {
              setMarketTrend(payload);
            } else {
              setMarketTrend(null);
            }
          } else {
            setMarketTrend(null);
          }
        }
      } catch {
        if (!cancelled) {
          setLiveMarket(null);
          setMarketIndices(null);
          setMarketTrend(null);
        }
      } finally {
        if (!cancelled) {
          setIsLiveMarketLoading(false);
          setIsInsightDataLoading(false);
        }
      }
    }

    void loadLiveMarket();

    return () => {
      cancelled = true;
    };
  }, [selectedHorizon]);

  const sentimentChartData = liveMarket?.fearGreedTrend?.length
    ? liveMarket.fearGreedTrend
    : fallbackSentimentTrend;

  const fxChartData = liveMarket?.usdInrTrend?.length
    ? liveMarket.usdInrTrend
    : fallbackFxTrend;

  const sentimentSourceLabel = liveMarket?.sentimentSource === "live"
    ? "Live source: Alternative.me Fear & Greed Index"
    : "Fallback mode: sentiment baseline";

  const fxSourceLabel = liveMarket?.fxSource === "live"
    ? "Live source: Frankfurter USD/INR"
    : "Fallback mode: FX baseline";

  const indicesSourceLabel = marketIndices?.source === "live"
    ? "Live source: Yahoo index snapshot"
    : "Fallback mode: index baseline";

  const trendSourceLabel = marketTrend?.source === "live"
    ? "Live source: Yahoo NIFTY trend"
    : "Fallback mode: NIFTY synthetic trend";

  const indexCards = marketIndices?.indices ?? [];
  const trendPoints = marketTrend?.points ?? [];
  const miniTrendPoints = trendPoints.slice(-24);
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
    const absPrefix = abs > 0 ? "+" : abs < 0 ? "-" : "";
    const pctPrefix = pct > 0 ? "+" : pct < 0 ? "-" : "";

    return `${absPrefix}${Math.abs(abs).toFixed(2)} (${pctPrefix}${Math.abs(pct).toFixed(2)}%)`;
  }, [trendPoints]);

  const breadthProxy = useMemo(() => {
    if (!liveMarket || indexCards.length === 0) {
      return null;
    }

    const advances = indexCards.filter((item) => item.changePct > 0).length;
    const declines = indexCards.filter((item) => item.changePct < 0).length;
    const avgIndexMove = indexCards.reduce((sum, item) => sum + item.changePct, 0) / indexCards.length;
    const fearGreed = liveMarket.fearGreedTrend?.[liveMarket.fearGreedTrend.length - 1]?.value ?? 50;
    const fearGreedAdj = ((fearGreed - 50) / 50) * 20;
    const fxMove = liveMarket.usdInrTrend?.[liveMarket.usdInrTrend.length - 1]?.rolling
      && liveMarket.usdInrTrend?.[0]?.rolling
      ? ((liveMarket.usdInrTrend[liveMarket.usdInrTrend.length - 1].rolling - liveMarket.usdInrTrend[0].rolling) / liveMarket.usdInrTrend[0].rolling) * 100
      : 0;

    const first = trendPoints[0]?.close ?? null;
    const last = trendPoints[trendPoints.length - 1]?.close ?? null;
    const trendPct = first && first > 0 && last ? ((last - first) / first) * 100 : 0;
    const trendAdj = Math.max(-12, Math.min(12, trendPct));
    const rawScore = 50 + avgIndexMove * 9 + fearGreedAdj - fxMove * 5 + trendAdj;
    const score = Math.round(Math.max(0, Math.min(100, rawScore)));
    const proxyUniverse = 500;
    const proxyAdvances = Math.round((score / 100) * proxyUniverse);
    const proxyDeclines = proxyUniverse - proxyAdvances;

    return {
      score,
      advances,
      declines,
      proxyAdvances,
      proxyDeclines,
      regime: score >= 68 ? "Broad Risk-On" : score <= 38 ? "Defensive / Risk-Off" : "Mixed / Rotation",
      avgIndexMove,
    };
  }, [indexCards, liveMarket, trendPoints]);

  const sectionReveal = useMemo(() => createSectionReveal(isCompactMotion), [isCompactMotion]);
  const chartCardReveal = useMemo(() => createChartCardReveal(isCompactMotion), [isCompactMotion]);
  const featureCardReveal = useMemo(() => createFeatureCardReveal(isCompactMotion), [isCompactMotion]);
  const featuredBlogPosts = useMemo(() => blogPosts.slice(0, 4), []);

  const sectionViewport = { once: true, amount: isCompactMotion ? 0.12 : 0.22 };
  const denseSectionViewport = { once: true, amount: isCompactMotion ? 0.1 : 0.2 };
  const cardGridViewport = { once: true, amount: isCompactMotion ? 0.14 : 0.25 };
  const narrativeViewport = { once: true, amount: isCompactMotion ? 0.18 : 0.35 };

  return (
    <>
      {!isHeroReady && (
        <div className="fixed inset-0 z-[120] bg-white flex items-center justify-center">
          <div className="text-center px-6">
            <div className="mx-auto h-10 w-10 rounded-full border-2 border-gray-200 border-t-finance-accent animate-spin" />
            <p className="mt-4 text-sm uppercase tracking-[0.18em] text-gray-400">Loading Pravix Experience</p>
          </div>
        </div>
      )}

      <SiteHeader />
      <div className={`flex min-h-screen flex-col bg-[linear-gradient(180deg,#f8fbff_0%,#f1f6ff_42%,#e8f0ff_100%)] transition-opacity duration-700 ${isHeroReady ? "opacity-100" : "opacity-0"}`}>
        {/* HERO SECTION */}
        <section className="relative overflow-hidden pt-20 pb-10 sm:pt-24 md:pb-12 md:pt-28 lg:min-h-screen">
          <div className="absolute inset-0">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-no-repeat"
              style={{
                backgroundImage: "url('/image/hero-banner-3.png')",
                backgroundPosition: isCompactMotion ? "62% center" : "center",
                backgroundSize: "cover",
              }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(8,20,44,0.78),rgba(8,20,44,0.56)_40%,rgba(165,198,255,0.2)_100%)]" />
          </div>

          <div className="relative z-20 mx-auto flex w-full max-w-7xl flex-col items-center gap-8 px-6 md:gap-10 md:px-10 lg:min-h-[calc(100vh-7rem)] lg:flex-row lg:items-center lg:gap-6 lg:px-14 xl:gap-10">
            {/* Left: Hero Content */}
            <div className="relative z-20 mt-2 flex w-full max-w-[36rem] flex-1 flex-col items-center text-center sm:mt-0 lg:-mt-12 lg:items-start lg:text-left xl:-mt-16 2xl:-mt-20">
              <div className="mb-5 flex w-full justify-center lg:justify-start">
                <div className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-50 shadow-sm backdrop-blur-md md:text-xs">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00e0ff] opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#00e0ff]" />
                  </span>
                  Wealth planning for every Indian
                </div>
              </div>

              {/* Glassmorphism brand box */}
              <div className="group relative mb-6 flex w-full flex-col items-center justify-center overflow-hidden rounded-[1.6rem] border border-white/20 bg-gradient-to-b from-white/15 to-white/5 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:p-6 md:mb-8 md:rounded-[2rem] md:p-10">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.1),transparent_70%)]" />
                <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#00e0ff]/15 blur-[80px]" />

                <div className="relative z-10 flex w-full flex-col items-center justify-center">
                  <h1 className="m-0 flex w-full flex-col items-center justify-center text-center">
                    <span
                      className="block w-full text-center text-[clamp(2.6rem,14vw,5.8rem)] font-bold leading-[0.88] tracking-tight text-white drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)] transition-colors duration-300"
                    >
                      Pravix
                    </span>
                    <span className="mt-2.5 block w-full pl-1 text-center text-[clamp(0.66rem,2.8vw,1.05rem)] font-bold uppercase tracking-[0.24em] text-[#00e0ff] drop-shadow-[0_0_16px_rgba(0,224,255,0.78)] sm:mt-3 sm:tracking-[0.42em]">
                      Wealth Management
                    </span>
                  </h1>

                  <div className="mt-6 h-px w-2/3 max-w-[220px] bg-gradient-to-r from-transparent via-[#00e0ff]/60 to-transparent" />

                  <p className="mt-4 max-w-sm text-center text-[11px] font-medium uppercase leading-snug tracking-[0.04em] text-blue-50/90 sm:text-xs md:text-[13px]">
                    India&apos;s first goal-based AI wealth platform
                  </p>
                </div>
              </div>

              <div className="flex w-full flex-col items-center text-center lg:items-start lg:text-left">
                <h2 className="mb-3 text-[1.45rem] font-bold leading-[1.15] tracking-tight text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)] sm:text-2xl md:text-[1.9rem]">
                  Powered by{" "}
                  <span className="inline-flex items-center rounded-full bg-[linear-gradient(120deg,rgba(255,255,255,0.18),rgba(126,239,255,0.12))] px-3 py-0.5 text-[#c5f6ff] shadow-[0_8px_20px_rgba(0,216,255,0.18)]">
                    Smart AI Insights
                  </span>
                </h2>

                <p className="mb-5 max-w-[34rem] text-[14px] font-medium leading-[1.55] text-blue-100/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] sm:mb-6 md:text-base">
                  Share your goals and preferences, and Pravix will create a clear path to grow your wealth - simple, transparent, and built entirely for you.
                </p>

                <div className="flex flex-col items-center justify-center gap-3.5 sm:flex-row">
                  <Link
                    href="/onboarding"
                    className="group flex w-full items-center justify-center gap-3 rounded-full border border-[#9ab8ff]/35 bg-gradient-to-r from-[#2b5cff] to-[#2b5cff] px-8 py-3.5 text-[15px] font-semibold text-white shadow-[0_8px_25px_rgba(43,92,255,0.42)] transition-all hover:-translate-y-0.5 hover:from-[#2a52e6] hover:to-[#1e44cd] hover:shadow-[0_12px_35px_rgba(43,92,255,0.58)] sm:w-auto"
                  >
                    Get Personalized AI Insight
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1.5" />
                  </Link>
                  <Link
                    href="/onboarding"
                    className="group flex w-full items-center justify-center gap-3 rounded-full border-2 border-white/60 bg-transparent px-8 py-3.5 text-[15px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-white/10 sm:w-auto"
                  >
                    Talk to Expert
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Right: Animated Phone Mockup */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mt-1 flex w-full max-w-[18.5rem] flex-1 justify-center sm:max-w-[22rem] md:max-w-[27rem] lg:mt-0 lg:max-w-[30rem] lg:-translate-x-4 lg:justify-end xl:max-w-[34rem]"
            >
              <HeroPhoneMockup />
            </motion.div>
          </div>
        </section>

        <section className="bg-[linear-gradient(180deg,#eef4ff_0%,#e7efff_100%)] px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-8">
            <div className="max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#2b5cff]">Built for Indian Families</p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#0a1930] sm:text-3xl md:text-4xl">
                A calm planning space for real life decisions.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-[#50607d] sm:text-base">
                Pravix combines a clean visual roadmap, practical guidance, and human support so the next step always feels clear.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                {[
                  "Clear goal roadmap",
                  "Monthly action nudges",
                  "Expert-backed support",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-[#d8e7ff] bg-white px-4 py-3 text-sm font-semibold text-[#1f365b] shadow-[0_10px_24px_rgba(43,92,255,0.06)]"
                  >
                    {item}
                  </div>
                ))}
              </div>
              <p className="mt-5 max-w-lg text-sm leading-relaxed text-[#5f7396] sm:text-[15px]">
                Use this section as a bridge between the discovery call and the deeper homepage content, so visitors immediately see the value of starting a plan.
              </p>
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-[#d8e7ff] bg-white shadow-[0_20px_50px_rgba(43,92,255,0.12)]">
              <div className="relative aspect-[4/3] sm:aspect-[16/10]">
                <Image
                  src="/image/about-hero-family.webp"
                  alt="Indian family planning their financial future together"
                  fill
                  className="object-cover object-center"
                  sizes="(min-width: 1024px) 56vw, 100vw"
                />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(10,25,48,0.02)_20%,rgba(10,25,48,0.28)_100%)]" />
              </div>
              <div className="px-4 py-4 sm:px-6 sm:py-5">
                <p className="text-sm font-semibold text-[#0a1930]">Goal-first, family-first, mobile-first.</p>
                <p className="mt-1 text-sm leading-relaxed text-[#5f7396]">
                  This section now lives below the discovery call block so the homepage closes with a strong visual finish.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION: WHO PRAVIX IS FOR */}
        <motion.section
          id="why-goals"
          className="bg-[linear-gradient(180deg,#f6f9ff_0%,#eef3ff_100%)] py-20 md:py-24"
          variants={sectionReveal}
          initial="hidden"
          whileInView="show"
          viewport={denseSectionViewport}
        >
          <div className="mx-auto w-full max-w-7xl px-6 md:px-10 lg:px-14">
            <div className="grid gap-6 lg:grid-cols-2">
              <motion.article
                className="rounded-3xl border border-finance-border/80 bg-white p-7 shadow-[0_16px_34px_rgba(43,92,255,0.08)]"
                variants={featureCardReveal}
                custom={0}
              >
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2b5cff]">Who It&apos;s For</p>
                <h3 className="mt-3 text-2xl font-bold tracking-tight text-[#0a1930] md:text-3xl">
                  Built for people planning real life goals.
                </h3>
                <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                  {[
                    "Salaried professionals",
                    "Young families",
                    "Goal-based investors",
                    "Tax-conscious earners",
                  ].map((item) => (
                    <div key={item} className="rounded-xl border border-finance-border bg-[#f7f9ff] px-4 py-3 text-sm font-medium text-[#355a95]">
                      {item}
                    </div>
                  ))}
                </div>
              </motion.article>

              <motion.article
                className="rounded-3xl border border-finance-border/80 bg-white p-7 shadow-[0_16px_34px_rgba(43,92,255,0.08)]"
                variants={featureCardReveal}
                custom={1}
              >
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2b5cff]">Money Mistakes Pravix Helps Prevent</p>
                <div className="mt-5 space-y-2.5">
                  {[
                    "Missed SIPs and delayed monthly actions",
                    "Poor diversification and unnoticed concentration",
                    "Last-minute tax moves in March",
                    "Emotional reactions to market noise",
                  ].map((mistake) => (
                    <div key={mistake} className="rounded-xl border border-finance-border bg-[#f7f9ff] px-4 py-3 text-sm text-[#4f6180]">
                      {mistake}
                    </div>
                  ))}
                </div>
              </motion.article>
            </div>

            <motion.article
              className="mt-6 rounded-3xl border border-[#d8e7ff] bg-white p-7 shadow-[0_16px_34px_rgba(43,92,255,0.08)]"
              variants={featureCardReveal}
              custom={2}
            >
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2b5cff]">Built For Indian Wealth Decisions</p>
              <h3 className="mt-3 text-2xl font-bold tracking-tight text-[#0a1930] md:text-3xl">
                Local context, family goals, and disciplined long-term planning.
              </h3>
              <div className="mt-5 flex flex-wrap gap-2.5">
                {[
                  "INR-based goals",
                  "Section 80C and tax runway",
                  "Family-focused milestones",
                  "Monthly action nudges",
                ].map((item) => (
                  <span key={item} className="rounded-full border border-[#2b5cff]/18 bg-[#edf4ff] px-3.5 py-2 text-xs font-semibold text-[#2b5cff]">
                    {item}
                  </span>
                ))}
              </div>
            </motion.article>
          </div>
        </motion.section>

        {/* SECTION: GOALS & PRIORITIES */}
        <motion.section
          id="insights-priorities"
          className="relative w-full overflow-hidden bg-[linear-gradient(145deg,#2453be_0%,#264da8_48%,#203f8e_100%)] py-20 text-white md:py-24"
          variants={sectionReveal}
          initial="hidden"
          whileInView="show"
          viewport={sectionViewport}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_12%,rgba(0,224,255,0.18),transparent_42%),radial-gradient(circle_at_18%_82%,rgba(255,255,255,0.08),transparent_50%)]" />

          <div className="relative mx-auto grid w-full max-w-7xl gap-8 px-6 md:px-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch lg:gap-10 lg:px-14">
            <motion.div variants={chartCardReveal} custom={0}>
              <div className="relative h-full min-h-[340px] overflow-hidden rounded-[2rem] border border-white/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.04))] shadow-[0_24px_70px_rgba(7,30,92,0.35)]">
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover"
                >
                  <source src="/video/pravix-sec2.mp4" type="video/mp4" />
                </video>
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(39,86,240,0.2),rgba(35,78,225,0.52))]" />
                <div className="pointer-events-none absolute inset-0 rounded-[2rem] border border-white/20" />
              </div>
            </motion.div>

            <motion.div variants={chartCardReveal} custom={1} className="flex flex-col justify-center">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#00e0ff]">
                YOUR PRAVIX AI INSIGHTS ARE BASED ON
              </p>
              <h3 className="mt-4 text-[clamp(2.1rem,4.8vw,4rem)] font-bold leading-[1.08] tracking-[-0.02em] text-white">
                Your Goals &amp; Financial Priorities
              </h3>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-blue-100 md:text-lg">
                Every recommendation is shaped around what matters most to you.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  {
                    title: "Market Trends & Data Signals",
                    detail: "Insights reflect current market movements and evolving patterns.",
                  },
                  {
                    title: "Expert-Backed Analysis",
                    detail: "Guidance informed by Pravix's investment professionals and research.",
                  },
                  {
                    title: "Global Economic Developments",
                    detail: "Broader events that influence markets and long-term opportunities.",
                  },
                ].map((item, index) => (
                  <motion.article
                    key={item.title}
                    className="rounded-3xl border border-white/20 bg-white/10 px-6 py-5 backdrop-blur-sm"
                    variants={featureCardReveal}
                    custom={index}
                  >
                    <div className="flex items-start gap-4">
                      <span className="mt-0.5 inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#00d8ff] text-sm font-bold text-[#2759df]">
                        {index + 1}
                      </span>
                      <div>
                        <h4 className="text-xl font-semibold text-white">{item.title}</h4>
                        <p className="mt-2 text-sm leading-relaxed text-blue-100 md:text-lg">{item.detail}</p>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* SECTION 3: HUMAN JOURNEY + EMOTIONAL CONNECT */}
        <motion.section
          id="how-it-works"
          className="border-y border-finance-border/70 bg-white py-24 md:py-28"
          variants={sectionReveal}
          initial="hidden"
          whileInView="show"
          viewport={denseSectionViewport}
        >
          <div className="mx-auto grid w-full max-w-7xl gap-12 px-6 md:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-14">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2b5cff]">How Pravix Works</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#0a1930] md:text-5xl">
                A simple four-step path from goals to action.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#50607d] md:text-lg">
                Share your goals, get a clear roadmap, follow monthly actions, and adjust with AI plus expert support.
              </p>

              <motion.div className="mt-10 space-y-4" initial="hidden" whileInView="show" viewport={denseSectionViewport}>
                {[
                  {
                    step: "01",
                    title: "Tell us your goals",
                    detail: "Capture your milestones, income profile, risk comfort, and preferences in one guided flow.",
                    icon: CircleUserRound,
                  },
                  {
                    step: "02",
                    title: "Get your wealth roadmap",
                    detail: "See a practical starting plan across goals, allocation, tax runway, and monthly focus.",
                    icon: Target,
                  },
                  {
                    step: "03",
                    title: "Track progress and monthly actions",
                    detail: "Stay disciplined with timely nudges, checklists, and progress tracking across each goal.",
                    icon: RefreshCcw,
                  },
                  {
                    step: "04",
                    title: "Adjust with AI + expert support",
                    detail: "Use Pravix AI Buddy and advisor guidance to refine the plan as life and markets change.",
                    icon: Compass,
                  },
                ].map((item, index) => (
                  <motion.article
                    key={item.step}
                    className="rounded-2xl border border-finance-border/70 bg-[#f7f9ff] p-5 sm:p-6"
                    variants={featureCardReveal}
                    custom={index}
                  >
                    <div className="flex items-start gap-4">
                      <div className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#2b5cff] text-white">
                        <item.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2b5cff]">Step {item.step}</p>
                        <h3 className="mt-1 text-lg font-bold text-[#0a1930]">{item.title}</h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-[#586987]">{item.detail}</p>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </motion.div>
            </div>

            <div className="rounded-3xl border border-[#d8e7ff] bg-[linear-gradient(160deg,#21479e_0%,#2a4f9f_58%,#2a4a91_100%)] p-8 text-white shadow-[0_24px_56px_rgba(10,25,48,0.24)] sm:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#00d8ff]">Why Families Choose Pravix</p>
              <h3 className="mt-4 text-2xl font-bold leading-tight sm:text-3xl">
                Not just better returns.
                <br />
                Better financial behavior.
              </h3>

              <motion.div className="mt-7 space-y-5" initial="hidden" whileInView="show" viewport={cardGridViewport}>
                {[
                  {
                    icon: ShieldCheck,
                    title: "Disciplined decisioning",
                    detail: "Priority scoring and checklist-driven execution reduce emotional investing mistakes.",
                  },
                  {
                    icon: Sparkles,
                    title: "Transparent intelligence",
                    detail: "Every suggestion surfaces why it matters, risk implications, and what to do next.",
                  },
                  {
                    icon: BellRing,
                    title: "Timely interventions",
                    detail: "Automated nudges keep goals on track before missed SIPs, drifts, or tax gaps become expensive.",
                  },
                ].map((point, index) => (
                  <motion.div
                    key={point.title}
                    className="rounded-2xl border border-white/20 bg-white/10 px-4 py-4 backdrop-blur-sm"
                    variants={featureCardReveal}
                    custom={index}
                  >
                    <div className="flex items-start gap-3">
                      <point.icon className="mt-0.5 h-5 w-5 text-[#00d8ff]" />
                      <div>
                        <p className="text-base font-semibold text-white">{point.title}</p>
                        <p className="mt-1 text-sm leading-relaxed text-[#d9e6ff]">{point.detail}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              <div className="mt-8 rounded-2xl border border-white/25 bg-white/10 px-4 py-3.5 text-sm text-[#edf4ff]">
                Pravix is designed to make wealth planning feel calm, clear, and confident even during uncertain markets.
              </div>
            </div>
          </div>
        </motion.section>

        {/* SECTION 1: EXECUTIVE INTELLIGENCE LAYER */}
        <motion.section
          id="insights"
          className="relative overflow-hidden bg-[linear-gradient(160deg,#214a98_0%,#24539f_54%,#1f468d_100%)] py-24 text-white md:py-28"
          variants={sectionReveal}
          initial="hidden"
          whileInView="show"
          viewport={sectionViewport}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(0,216,255,0.14),transparent_42%),radial-gradient(circle_at_88%_85%,rgba(43,92,255,0.24),transparent_48%)]" />

          <div className="relative mx-auto w-full max-w-7xl px-6 md:px-10 lg:px-14">
            <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#00d8ff]">Know What Matters This Month</p>
                <h3 className="mt-4 text-3xl font-bold leading-tight md:text-5xl">
                  Clear signals for your next money move.
                </h3>
                <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#d9e6ff] md:text-lg">
                  See what needs attention now, what can wait, and what action keeps your family goals on track.
                </p>
              </div>

              <div className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-md sm:p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#00d8ff]">Signals Pravix Checks For You</p>
                <motion.div className="mt-4 space-y-3" initial="hidden" whileInView="show" viewport={narrativeViewport}>
                  {[
                    "Market mood and INR trend for context",
                    "Goal progress and monthly plan health",
                    "SIP, rebalance, and tax nudges before deadlines",
                    "AI guidance with reason, risk note, and next step",
                  ].map((item, index) => (
                    <motion.div
                      key={item}
                      className="rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-sm text-[#edf4ff]"
                      variants={featureCardReveal}
                      custom={index}
                    >
                      {item}
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </div>

            <motion.div className="mt-10 grid gap-4 md:grid-cols-3" initial="hidden" whileInView="show" viewport={cardGridViewport}>
              {[
                {
                  icon: Sparkles,
                  title: "Monthly Goal Focus",
                  detail:
                    "Pravix highlights the one goal area where your action this week will matter most.",
                  metric: "Prioritized weekly",
                },
                {
                  icon: BellRing,
                  title: "Smart Alerts",
                  detail:
                    "Timely nudges help you avoid missed SIPs, drift, and last-minute tax pressure.",
                  metric: "Timely alerts",
                },
                {
                  icon: MessageCircle,
                  title: "Pravix AI Buddy",
                  detail:
                    "Get practical next actions in plain language, with clear reasoning and risk context.",
                  metric: "Action-ready guidance",
                },
              ].map((item, index) => (
                <motion.article
                  key={item.title}
                  className="group rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:bg-white/14"
                  variants={featureCardReveal}
                  custom={index}
                >
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-white/30 bg-white/10">
                    <item.icon className="h-5 w-5 text-[#00d8ff]" />
                  </div>
                  <h4 className="mt-4 text-xl font-semibold text-white">{item.title}</h4>
                  <p className="mt-2 text-sm leading-relaxed text-[#d9e6ff]">{item.detail}</p>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#00d8ff]">{item.metric}</p>
                </motion.article>
              ))}
            </motion.div>

            <motion.div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3" initial="hidden" whileInView="show" viewport={cardGridViewport}>
              {indexCards.map((indexItem, index) => {
                const gradientId = `homepageMiniSpark-${indexItem.id}`;
                const changeAbsPrefix = indexItem.changeAbs > 0 ? "+" : indexItem.changeAbs < 0 ? "-" : "";
                const changePctPrefix = indexItem.changePct > 0 ? "+" : indexItem.changePct < 0 ? "-" : "";

                return (
                  <motion.article
                    key={indexItem.id}
                    className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm"
                    variants={featureCardReveal}
                    custom={index}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-white">{indexItem.displayName}</p>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${
                        indexItem.trend === "up"
                          ? "bg-[#1a7f57]/30 text-[#c7f8de]"
                          : indexItem.trend === "down"
                            ? "bg-[#a1263d]/30 text-[#ffd4dc]"
                            : "bg-white/15 text-[#dbe9ff]"
                      }`}>
                        {indexItem.trend}
                      </span>
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-white">
                      {indexItem.value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </p>
                    <p className="mt-1 text-xs text-[#d9e6ff]">
                      {changeAbsPrefix}{Math.abs(indexItem.changeAbs).toFixed(2)} • {changePctPrefix}{Math.abs(indexItem.changePct).toFixed(2)}%
                    </p>
                    <div className="mt-3 h-14">
                      {miniTrendPoints.length > 1 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={miniTrendPoints} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={indexItem.trend === "down" ? "#ff8a7b" : "#00d8ff"} stopOpacity={0.34} />
                                <stop offset="95%" stopColor={indexItem.trend === "down" ? "#ff8a7b" : "#00d8ff"} stopOpacity={0.04} />
                              </linearGradient>
                            </defs>
                            <Area
                              type="monotone"
                              dataKey="close"
                              stroke={indexItem.trend === "down" ? "#ff8a7b" : "#00d8ff"}
                              strokeWidth={1.8}
                              fill={`url(#${gradientId})`}
                              dot={false}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex h-full items-center justify-center rounded-lg border border-white/15 bg-white/8 text-[11px] text-[#d9e6ff]">
                          Sparkline unavailable
                        </div>
                      )}
                    </div>
                  </motion.article>
                );
              })}
            </motion.div>

            {breadthProxy ? (
              <motion.div className="mt-4 grid gap-4 md:grid-cols-3" initial="hidden" whileInView="show" viewport={cardGridViewport}>
                <motion.article className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm" variants={featureCardReveal} custom={0}>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#00d8ff]">Breadth Proxy Score</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{breadthProxy.score}/100</p>
                  <p className="mt-1 text-xs text-[#d9e6ff]">{breadthProxy.regime}</p>
                </motion.article>

                <motion.article className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm" variants={featureCardReveal} custom={1}>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#00d8ff]">Index Adv / Dec</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{breadthProxy.advances} / {breadthProxy.declines}</p>
                  <p className="mt-1 text-xs text-[#d9e6ff]">From tracked benchmarks</p>
                </motion.article>

                <motion.article className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm" variants={featureCardReveal} custom={2}>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#00d8ff]">Proxy Market Breadth</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{breadthProxy.proxyAdvances} / {breadthProxy.proxyDeclines}</p>
                  <p className="mt-1 text-xs text-[#d9e6ff]">Derived, non-exchange official</p>
                </motion.article>
              </motion.div>
            ) : null}

            <motion.article
              className="mt-4 rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm"
              variants={chartCardReveal}
              custom={0}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">NIFTY 50 Trend ({selectedHorizon.toUpperCase()})</p>
                <p className="text-xs text-[#d9e6ff]">Change: {trendDeltaLabel}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {horizonOptions.map((horizon) => (
                  <button
                    key={horizon}
                    type="button"
                    onClick={() => setSelectedHorizon(horizon)}
                    disabled={isInsightDataLoading}
                    className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-semibold transition-colors ${
                      selectedHorizon === horizon
                        ? "border-[#00d8ff] bg-[#00d8ff]/20 text-[#d9f8ff]"
                        : "border-white/25 bg-white/10 text-[#d9e6ff] hover:bg-white/15"
                    } disabled:cursor-not-allowed disabled:opacity-70`}
                  >
                    {horizon.toUpperCase()}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-[#d9e6ff]">
                {isInsightDataLoading ? "Loading trend feed..." : trendSourceLabel}
              </p>
              <div className="mt-4 h-56">
                {isHeroReady && trendPoints.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendPoints} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="niftyTrendGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2b5cff" stopOpacity={0.6} />
                          <stop offset="95%" stopColor="#2b5cff" stopOpacity={0.06} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" stroke="rgba(219,234,254,0.18)" />
                      <XAxis dataKey="label" stroke="#c4d7fb" fontSize={12} />
                      <YAxis stroke="#c4d7fb" fontSize={12} tickFormatter={(value) => `${Number(value).toFixed(0)}`} />
                      <Tooltip
                        formatter={(value) => [
                          `${Number(value ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`,
                          "NIFTY 50",
                        ]}
                        contentStyle={{ backgroundColor: "#1f3f95", borderColor: "#6f8fcd", borderRadius: "10px" }}
                        labelStyle={{ color: "#dce8ff" }}
                        itemStyle={{ color: "#f2f7ff" }}
                      />
                      <Area type="monotone" dataKey="close" stroke="#2b5cff" fill="url(#niftyTrendGradient)" strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full animate-pulse rounded-2xl border border-white/20 bg-white/10" />
                )}
              </div>
            </motion.article>

            <motion.div className="mt-10 grid gap-5 lg:grid-cols-3" initial="hidden" whileInView="show" viewport={denseSectionViewport}>
              <motion.article
                className="rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm lg:col-span-2"
                variants={chartCardReveal}
                custom={0}
              >
                <div className="flex items-center gap-2">
                  <LineChartIcon className="h-4.5 w-4.5 text-[#00d8ff]" />
                  <p className="text-sm font-semibold text-white">Fear &amp; Greed Trend</p>
                </div>
                <p className="mt-1 text-xs text-[#d9e6ff]">
                  {isLiveMarketLoading ? "Loading live sentiment feed..." : sentimentSourceLabel}
                </p>
                <div className="mt-4 h-64">
                  {isHeroReady ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sentimentChartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="4 4" stroke="rgba(219,234,254,0.18)" />
                        <XAxis dataKey="label" stroke="#c4d7fb" fontSize={12} />
                        <YAxis stroke="#c4d7fb" fontSize={12} domain={[0, 100]} />
                        <Tooltip
                          formatter={(value, name) => [
                            `${Number(value ?? 0).toFixed(1)}`,
                            name === "value" ? "Index" : "3D Avg",
                          ]}
                          contentStyle={{ backgroundColor: "#1f3f95", borderColor: "#6f8fcd", borderRadius: "10px" }}
                          labelStyle={{ color: "#dce8ff" }}
                          itemStyle={{ color: "#f2f7ff" }}
                        />
                        <Line type="monotone" dataKey="value" stroke="#00d8ff" strokeWidth={2.8} dot={false} />
                        <Line type="monotone" dataKey="avg" stroke="#86a9a3" strokeWidth={2} dot={false} strokeDasharray="6 3" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full w-full animate-pulse rounded-2xl border border-white/20 bg-white/10" />
                  )}
                </div>
              </motion.article>

              <motion.article
                className="rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm"
                variants={chartCardReveal}
                custom={1}
              >
                <div className="flex items-center gap-2">
                  <Wallet className="h-4.5 w-4.5 text-[#00d8ff]" />
                  <p className="text-sm font-semibold text-white">Allocation Mix</p>
                </div>
                <p className="mt-1 text-xs text-[#d9e6ff]">A balanced goal-first structure with diversification controls</p>
                <div className="mt-4 h-56">
                  {isHeroReady ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={allocationMixData}
                          cx="50%"
                          cy="50%"
                          innerRadius={54}
                          outerRadius={86}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                        >
                          {allocationMixData.map((entry, index) => (
                            <Cell key={entry.name} fill={allocationColors[index % allocationColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => [`${Number(value ?? 0).toFixed(1)}%`, "Weight"]}
                          contentStyle={{ backgroundColor: "#1f3f95", borderColor: "#6f8fcd", borderRadius: "10px" }}
                          labelStyle={{ color: "#dce8ff" }}
                          itemStyle={{ color: "#f2f7ff" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full w-full animate-pulse rounded-2xl border border-white/20 bg-white/10" />
                  )}
                </div>
                <div className="mt-2 grid grid-cols-1 gap-1.5">
                  {allocationMixData.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between text-xs text-[#d9e6ff]">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: allocationColors[index % allocationColors.length] }} />
                        {item.name}
                      </span>
                      <span className="font-semibold text-white">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </motion.article>

              <motion.article
                className="rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm lg:col-span-3"
                variants={chartCardReveal}
                custom={2}
              >
                <div className="flex items-center gap-2">
                  <Globe2 className="h-4.5 w-4.5 text-[#00d8ff]" />
                  <p className="text-sm font-semibold text-white">USD/INR Drift (Live)</p>
                </div>
                <p className="mt-1 text-xs text-[#d9e6ff]">
                  {isLiveMarketLoading ? "Loading live FX feed..." : fxSourceLabel}
                </p>
                <div className="mt-4 h-56">
                  {isHeroReady ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={fxChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="sipGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00d8ff" stopOpacity={0.6} />
                            <stop offset="95%" stopColor="#00d8ff" stopOpacity={0.06} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" stroke="rgba(219,234,254,0.18)" />
                        <XAxis dataKey="label" stroke="#c4d7fb" fontSize={12} />
                        <YAxis stroke="#c4d7fb" fontSize={12} tickFormatter={(value) => `${Number(value).toFixed(2)}`} />
                        <Tooltip
                          formatter={(value, name) => [
                            `${Number(value ?? 0).toFixed(3)}`,
                            name === "rate" ? "USD/INR" : "3D Avg",
                          ]}
                          contentStyle={{ backgroundColor: "#1f3f95", borderColor: "#6f8fcd", borderRadius: "10px" }}
                          labelStyle={{ color: "#dce8ff" }}
                          itemStyle={{ color: "#f2f7ff" }}
                        />
                        <Area type="monotone" dataKey="rolling" stroke="#86a9a3" fill="transparent" strokeDasharray="7 4" />
                        <Area type="monotone" dataKey="rate" stroke="#00d8ff" fill="url(#sipGradient)" strokeWidth={2.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full w-full animate-pulse rounded-2xl border border-white/20 bg-white/10" />
                  )}
                </div>
              </motion.article>
            </motion.div>
          </div>
        </motion.section>

        {/* SECTION 2: DASHBOARD MODULES */}
        <motion.section
          id="platform"
          className="bg-[linear-gradient(180deg,#f5f9ff_0%,#edf4ff_100%)] py-24 md:py-28"
          variants={sectionReveal}
          initial="hidden"
          whileInView="show"
          viewport={denseSectionViewport}
        >
          <div className="mx-auto w-full max-w-7xl px-6 md:px-10 lg:px-14">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2b5cff]">What You Can Do With Pravix</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#0a1930] md:text-5xl">
                  Feature clusters built around your outcomes.
                </h2>
              </div>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 self-start rounded-full border border-[#2b5cff]/25 bg-white px-5 py-2.5 text-sm font-semibold text-[#2b5cff] transition-colors hover:bg-[#edf4ff]"
              >
                View dashboard preview
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <motion.div className="mt-8 grid gap-5 lg:grid-cols-3" initial="hidden" whileInView="show" viewport={denseSectionViewport}>
              {[
                {
                  title: "Plan smarter",
                  summary: "Set goals clearly, personalize risk, and build the right baseline allocation.",
                  items: ["Smart onboarding", "Goal setup", "Risk profile"],
                },
                {
                  title: "Act on time",
                  summary: "Stay consistent with monthly actions instead of reacting late.",
                  items: ["Smart alerts", "Focus ranking", "Monthly checklist"],
                },
                {
                  title: "Optimize wealth",
                  summary: "Improve long-term outcomes across tax, holdings, and guided decisions.",
                  items: ["Tax assistant", "Holdings analysis", "Pravix AI Buddy"],
                },
              ].map((cluster, index) => (
                <motion.article
                  key={cluster.title}
                  className="rounded-2xl border border-[#d8e7ff] bg-white p-5 shadow-[0_12px_28px_rgba(43,92,255,0.08)]"
                  variants={featureCardReveal}
                  custom={index}
                >
                  <h3 className="text-xl font-bold text-[#0a1930]">{cluster.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#50607d]">{cluster.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {cluster.items.map((item) => (
                      <span key={item} className="rounded-full border border-[#2b5cff]/20 bg-[#edf4ff] px-3 py-1 text-xs font-semibold text-[#2b5cff]">
                        {item}
                      </span>
                    ))}
                  </div>
                </motion.article>
              ))}
            </motion.div>

            <p className="mt-8 text-sm text-[#4f6180]">
              Every module below remains available. They now work together to help you plan smarter, act on time, and optimize wealth.
            </p>

            <motion.div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3" initial="hidden" whileInView="show" viewport={denseSectionViewport}>
              {[
                {
                  icon: BellRing,
                  title: "Smart Alerts Panel",
                  desc: "Proactive signal routing for market crash, SIP due, rebalance drift, and tax deadline conditions.",
                  badge: "Risk Radar",
                },
                {
                  icon: BarChart3,
                  title: "Holdings Analyzer",
                  desc: "Manual or CSV holdings ingestion, allocation analytics, sector exposure, and concentration warnings.",
                  badge: "Portfolio Depth",
                },
                {
                  icon: Calculator,
                  title: "Tax Optimization Assistant",
                  desc: "Tracks Section 80C progress, regime direction, and practical monthly tax actions before FY close.",
                  badge: "Tax Clarity",
                },
                {
                  icon: Sparkles,
                  title: "Next Best Action Engine",
                  desc: "Combines goals, alerts, holdings, and tax context to show what needs attention first.",
                  badge: "Action Priority",
                },
                {
                  icon: MessageCircle,
                  title: "Pravix AI Buddy",
                  desc: "Conversational guidance with recommendation, reason, risk warning, and next action in every response.",
                  badge: "Human + AI",
                },
                {
                  icon: CircleUserRound,
                  title: "Secure Profile Core",
                  desc: "Authenticated sessions and user-scoped data access ensure your financial context stays private.",
                  badge: "Trust Layer",
                },
              ].map((module, index) => (
                <motion.article
                  key={module.title}
                  className="rounded-2xl border border-[#d8e7ff] bg-white p-6 shadow-[0_14px_34px_rgba(43,92,255,0.08)] transition-all duration-200 hover:-translate-y-1 hover:border-[#2b5cff]/30"
                  variants={featureCardReveal}
                  custom={index}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf4ff] text-[#2b5cff]">
                      <module.icon className="h-5 w-5" />
                    </div>
                    <span className="rounded-full border border-[#2b5cff]/20 bg-[#edf4ff] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#2b5cff]">
                      {module.badge}
                    </span>
                  </div>

                  <h3 className="mt-4 text-xl font-bold text-[#0a1930]">{module.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#50607d]">{module.desc}</p>
                </motion.article>
              ))}
            </motion.div>

            <motion.div className="mt-12 grid gap-5 lg:grid-cols-2" initial="hidden" whileInView="show" viewport={denseSectionViewport}>
              <motion.article
                className="rounded-3xl border border-[#d8e7ff] bg-white p-6 shadow-[0_14px_34px_rgba(43,92,255,0.08)]"
                variants={chartCardReveal}
                custom={0}
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4.5 w-4.5 text-[#2b5cff]" />
                  <p className="text-sm font-semibold text-[#0a1930]">Module Impact Index</p>
                </div>
                <p className="mt-1 text-xs text-[#60739a]">How strongly each module contributes to monthly execution quality</p>
                <div className="mt-4 h-64">
                  {isHeroReady ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={moduleImpactData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#d7e6ff" />
                        <XAxis dataKey="module" stroke="#6d86b4" fontSize={12} />
                        <YAxis stroke="#6d86b4" fontSize={12} />
                        <Tooltip
                          formatter={(value) => [`${Number(value ?? 0).toFixed(0)}/100`, "Impact"]}
                          contentStyle={{ backgroundColor: "#f7f9ff", borderColor: "#c5d8fb", borderRadius: "10px" }}
                          labelStyle={{ color: "#173a85" }}
                          itemStyle={{ color: "#3f66ab" }}
                        />
                        <Bar dataKey="score" radius={[8, 8, 0, 0]} fill="#2b5cff" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full w-full animate-pulse rounded-2xl border border-[#d8e7ff] bg-[#eff5ff]" />
                  )}
                </div>
              </motion.article>

              <motion.article
                className="rounded-3xl border border-[#d8e7ff] bg-white p-6 shadow-[0_14px_34px_rgba(43,92,255,0.08)]"
                variants={chartCardReveal}
                custom={1}
              >
                <div className="flex items-center gap-2">
                  <Calculator className="h-4.5 w-4.5 text-[#2b5cff]" />
                  <p className="text-sm font-semibold text-[#0a1930]">Tax Efficiency Runway</p>
                </div>
                <p className="mt-1 text-xs text-[#60739a]">Quarterly progression of 80C utilization versus potential optimization path</p>
                <div className="mt-4 h-64">
                  {isHeroReady ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={taxEfficiencyData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#d7e6ff" />
                        <XAxis dataKey="quarter" stroke="#6d86b4" fontSize={12} />
                        <YAxis stroke="#6d86b4" fontSize={12} tickFormatter={(value) => `${value}%`} />
                        <Tooltip
                          formatter={(value) => [`${Number(value ?? 0).toFixed(0)}%`, "Coverage"]}
                          contentStyle={{ backgroundColor: "#f7f9ff", borderColor: "#c5d8fb", borderRadius: "10px" }}
                          labelStyle={{ color: "#173a85" }}
                          itemStyle={{ color: "#3f66ab" }}
                        />
                        <Line type="monotone" dataKey="potential" stroke="#86a9a3" strokeWidth={2} strokeDasharray="6 4" dot={false} />
                        <Line type="monotone" dataKey="used" stroke="#2b5cff" strokeWidth={2.6} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full w-full animate-pulse rounded-2xl border border-[#d8e7ff] bg-[#eff5ff]" />
                  )}
                </div>
              </motion.article>
            </motion.div>
          </div>
        </motion.section>

        {/* SECTION: ABOUT US */}
        <motion.section
          id="about-us"
          className="bg-white py-24 md:py-28"
          variants={sectionReveal}
          initial="hidden"
          whileInView="show"
          viewport={denseSectionViewport}
        >
          <div className="mx-auto w-full max-w-7xl px-6 md:px-10 lg:px-14">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2b5cff]">About Pravix</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#0a1930] md:text-5xl">
                  A trusted wealth partner for Indian families
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-relaxed text-[#50607d] md:text-base">
                Pravix combines disciplined planning systems, real market intelligence, and human advisory context so families
                can make calm, high-quality financial decisions over the long term.
              </p>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <motion.article
                className="rounded-3xl border border-[#d8e7ff] bg-[linear-gradient(160deg,#f7f9fc_0%,#eef4ff_100%)] p-7 shadow-[0_16px_36px_rgba(43,92,255,0.08)] sm:p-8"
                variants={featureCardReveal}
                custom={0}
              >
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2b5cff]">Director&apos;s Vision</p>
                <blockquote className="mt-4 border-l-2 border-[#2b5cff] pl-4 text-[#1f365b]">
                  <p className="text-base leading-relaxed md:text-lg">
                    &quot;Our vision at Pravix is to make high-quality wealth strategy accessible, structured, and actionable for
                    every Indian family. We want investors to move from confusion to confidence by using disciplined systems,
                    not market speculation.&quot;
                  </p>
                </blockquote>
                <p className="mt-3 text-sm font-semibold text-[#0a1930]">- Umesh Kumar Sharma, Director</p>

                <div className="mt-6 grid gap-2.5 sm:grid-cols-3">
                  {[
                    ["Core Focus", "Goal-first wealth systems"],
                    ["Approach", "Data + expert judgement"],
                    ["Outcome", "Confidence through discipline"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-[#d8e7ff] bg-white px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-[0.1em] text-[#5f7396]">{label}</p>
                      <p className="mt-1 text-sm font-semibold text-[#0a1930]">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-7 flex flex-wrap gap-2">
                  {[
                    "Trust-first architecture",
                    "Goal-centric design",
                    "Execution over noise",
                    "Human + AI guidance",
                  ].map((tag) => (
                    <span key={tag} className="rounded-full border border-[#2b5cff]/20 bg-[#edf4ff] px-3 py-1 text-xs font-semibold text-[#2b5cff]">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-8 rounded-2xl border border-[#d8e7ff] bg-white/70 p-5 shadow-[0_10px_24px_rgba(43,92,255,0.05)]">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2b5cff]">What families get</p>
                  <div className="mt-4 space-y-3">
                    {[
                      "A clear monthly plan that turns goals into action.",
                      "A calmer decision process when markets feel noisy.",
                      "A simple way to stay aligned with long-term family priorities.",
                    ].map((point) => (
                      <div key={point} className="flex items-start gap-3 text-sm leading-relaxed text-[#1f365b]">
                        <span className="mt-1 inline-flex h-2.5 w-2.5 flex-shrink-0 rounded-full bg-[#2b5cff]" />
                        <span>{point}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-[#5f7396]">
                    This space now works as a real explanation panel, so the About section reads like a finished story rather than an empty column.
                  </p>
                </div>
              </motion.article>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
                <motion.article
                  className="overflow-hidden rounded-3xl border border-[#d8e7ff] bg-white shadow-[0_16px_36px_rgba(43,92,255,0.10)]"
                  variants={featureCardReveal}
                  custom={1}
                >
                  <div className="relative aspect-[5/4] overflow-hidden">
                    <Image
                      src="/image/about-umesh-kumar-sharma.jpg"
                      alt="Umesh Kumar Sharma, Director"
                      fill
                      className="object-cover object-top"
                      sizes="(min-width: 1280px) 28vw, (min-width: 768px) 46vw, 100vw"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,25,48,0)_25%,rgba(10,25,48,0.62)_100%)]" />
                    <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                      <p className="text-xl font-semibold">Umesh Kumar Sharma</p>
                      <p className="text-xs uppercase tracking-[0.12em] text-[#d8e5ff]">Director · Vision & Strategy</p>
                    </div>
                  </div>
                </motion.article>

                <motion.article
                  className="overflow-hidden rounded-3xl border border-[#d8e7ff] bg-white shadow-[0_16px_36px_rgba(43,92,255,0.10)]"
                  variants={featureCardReveal}
                  custom={2}
                >
                  <div className="relative aspect-[5/4] overflow-hidden">
                    <Image
                      src="/image/about-aditya-saini.jpg"
                      alt="Aditya Saini, Advocate and Tax Consultant"
                      fill
                      className="object-cover object-center"
                      sizes="(min-width: 1280px) 28vw, (min-width: 768px) 46vw, 100vw"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,25,48,0)_25%,rgba(10,25,48,0.62)_100%)]" />
                    <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                      <p className="text-xl font-semibold">Aditya Saini</p>
                      <p className="text-xs uppercase tracking-[0.12em] text-[#d8e5ff]">Advocate & Tax Consultant · B.Sc, LLB</p>
                    </div>
                  </div>
                  <div className="border-t border-[#d8e7ff] px-4 py-3 text-xs text-[#50607d]">Contact: adv.aaditya00@gmail.com</div>
                </motion.article>
              </div>
            </div>
          </div>
        </motion.section>

        {/* SECTION: BLOG */}
        <motion.section
          id="blog"
          className="bg-[linear-gradient(180deg,#f6f9ff_0%,#eef3ff_100%)] py-24 md:py-28"
          variants={sectionReveal}
          initial="hidden"
          whileInView="show"
          viewport={denseSectionViewport}
        >
          <div className="mx-auto w-full max-w-7xl px-6 md:px-10 lg:px-14">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2b5cff]">Personal Wealth Notes</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#0a1930] md:text-5xl">
                  Insights you can apply this month
                </h2>
              </div>
              <Link
                href="/learn"
                className="inline-flex items-center gap-2 self-start rounded-full border border-[#2b5cff]/25 bg-white px-5 py-2.5 text-sm font-semibold text-[#2b5cff] transition-colors hover:bg-[#edf4ff]"
              >
                Browse all articles
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <motion.div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4" initial="hidden" whileInView="show" viewport={denseSectionViewport}>
              {featuredBlogPosts.map((post, index) => (
                <motion.article
                  key={post.slug}
                  className="overflow-hidden rounded-3xl border border-[#d8e7ff] bg-white shadow-[0_14px_34px_rgba(43,92,255,0.08)]"
                  variants={featureCardReveal}
                  custom={index}
                >
                  <div className="overflow-hidden border-b border-[#d8e7ff]">
                    <Image
                      src={post.coverImage}
                      alt={post.title}
                      width={1600}
                      height={900}
                      className="h-44 w-full object-cover"
                    />
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between text-[11px] text-[#5f7396]">
                      <span>{new Date(post.publishedAt).toLocaleDateString("en-IN")}</span>
                      <span>{post.readTime}</span>
                    </div>
                    <h3 className="mt-2 line-clamp-2 text-lg font-semibold text-[#0a1930]">{post.title}</h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[#586987]">{post.excerpt}</p>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {post.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="rounded-full border border-[#2b5cff]/20 bg-[#edf4ff] px-2.5 py-1 text-[10px] font-semibold text-[#2b5cff]">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <Link
                      href={`/learn/${post.slug}`}
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#2b5cff]"
                    >
                      Read article
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </motion.article>
              ))}
            </motion.div>
          </div>
        </motion.section>

        {/* Calendly Booking Section */}
        <CalendlyBookingSection />

        {/* SECTION 4: TRUST + LEARN + PREMIUM CTA */}
        <motion.section
          id="contact"
          className="relative overflow-hidden bg-[linear-gradient(160deg,#1e4389_0%,#244b95_58%,#1f4488_100%)] py-24 text-white md:py-28"
          variants={sectionReveal}
          initial="hidden"
          whileInView="show"
          viewport={denseSectionViewport}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(0,216,255,0.12),transparent_40%)]" />

          <div className="relative mx-auto w-full max-w-7xl px-6 md:px-10 lg:px-14">
            <motion.div className="grid gap-6 md:grid-cols-3" initial="hidden" whileInView="show" viewport={denseSectionViewport}>
              {[
                {
                  title: "Secure private profile",
                  desc: "Authenticated sessions with user-scoped access and robust backend enforcement for profile privacy.",
                },
                {
                  title: "Educational guidance with transparent reasoning",
                  desc: "Each recommendation explains what changed, why it matters, and what you can do next.",
                },
                {
                  title: "Human + AI support",
                  desc: "Use self-serve guidance daily, and connect with an expert when you want deeper confidence.",
                },
              ].map((item, index) => (
                <motion.article
                  key={item.title}
                  className="rounded-2xl border border-white/15 bg-white/8 p-5 backdrop-blur-sm"
                  variants={featureCardReveal}
                  custom={index}
                >
                  <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#d9e6ff]">{item.desc}</p>
                </motion.article>
              ))}
            </motion.div>

            <div className="mt-6 rounded-2xl border border-white/20 bg-white/8 px-5 py-4 text-sm leading-relaxed text-[#d9e6ff]">
              Pravix provides educational guidance and planning support. It does not promise guaranteed returns and does not replace personalized licensed investment advice.
            </div>

            <div className="mt-14 rounded-3xl border border-[#4f73c2] bg-[linear-gradient(135deg,#23489b_0%,#2a4e98_58%,#274789_100%)] p-8 shadow-[0_24px_58px_rgba(0,0,0,0.28)] sm:p-10 md:p-12">
              <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
                <div className="max-w-2xl">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#00d8ff]">Start With Confidence</p>
                  <h2 className="mt-3 text-3xl font-bold leading-tight text-white md:text-5xl">
                    Stay on track for every major life goal.
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-[#d9e6ff] md:text-lg">
                    Begin with guided onboarding, follow clear monthly actions, and use Pravix support whenever you need it.
                  </p>
                </div>

                <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[17rem]">
                  <Link
                    href="/onboarding"
                    className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-[#2a53e8] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(0,0,0,0.12)]"
                  >
                    Start your plan
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <Link
                    href="/onboarding?mode=advisor"
                    className="inline-flex h-12 items-center justify-center rounded-full border border-white/40 bg-white/10 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/20"
                  >
                    Talk to an expert
                  </Link>
                  <Link
                    href="/dashboard"
                    className="inline-flex h-12 items-center justify-center rounded-full border border-white/25 bg-transparent px-6 text-sm font-semibold text-[#d9e6ff] transition-colors hover:bg-white/10"
                  >
                    View dashboard preview
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        <div className="fixed inset-x-0 bottom-3 z-40 px-4 sm:hidden">
          <Link
            href="/onboarding"
            className="mx-auto flex h-12 w-full max-w-sm items-center justify-center gap-2 rounded-full bg-finance-accent text-sm font-semibold text-white shadow-[0_14px_30px_rgba(43,92,255,0.34)]"
          >
            Start your plan
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

      </div>
    </>
  );
}




