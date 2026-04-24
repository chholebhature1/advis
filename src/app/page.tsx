"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
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
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
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
  Briefcase,
  Landmark,
  Building2,
  ChevronRight,
  PieChart as PieChartIcon,
} from "lucide-react";
const MiniSparkline = dynamic(() => import("@/components/charts/HomepageCharts").then((mod) => mod.MiniSparkline), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-white/5 animate-pulse rounded-lg" />,
});

const MainTrendChart = dynamic(() => import("@/components/charts/HomepageCharts").then((mod) => mod.MainTrendChart), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-white/5 animate-pulse rounded-2xl" />,
});
import SiteHeader from "@/components/SiteHeader";
import { blogPosts } from "@/app/learn/blog-data";

const HeroPhoneMockup = dynamic(() => import("@/components/HeroPhoneMockup"), {
  ssr: false,
  loading: () => (
    <div className="relative flex w-full min-h-[330px] items-center justify-center sm:min-h-[500px] lg:min-h-[560px] xl:min-h-[620px]">
      <div className="relative flex h-[660px] w-[350px] items-center justify-center rounded-[2.5rem] border border-white/15 bg-[linear-gradient(180deg,rgba(18,31,61,0.9),rgba(14,22,45,0.96))] shadow-[0_24px_64px_rgba(0,0,0,0.26)]" />
    </div>
  ),
});



const CalendlyBookingSection = dynamic(() => import("@/components/CalendlyBookingSection"), {
  ssr: false,
  loading: () => (
    <section id="book-discovery-call" className="relative overflow-hidden py-28 md:py-36">
      <div className="mx-auto w-full max-w-7xl px-6 md:px-10 lg:px-14">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="h-[420px] animate-pulse rounded-[1.75rem] border border-[#d8e7ff] bg-white/80" />
          <div className="h-[420px] animate-pulse rounded-[1.75rem] border border-[#d8e7ff] bg-white/70" />
        </div>
      </div>
    </section>
  ),
});

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

const allocationColors = ["#2b5cff", "#00d8ff", "#86a9a3", "#6fa39a", "#dce8ff"];
const trustedPartners = [
  {
    name: "HDFC Mutual Fund",
    subtitle: "Mutual Fund",
    logo: (
      <div className="flex h-full w-full items-center justify-center bg-transparent">
        <Image
          src="/image/partners/hdfc-visual-mark.png"
          alt="HDFC Mutual Fund logo"
          width={300}
          height={100}
          className="h-14 w-auto object-contain sm:h-16"
          sizes="(max-width: 640px) 140px, 180px"
        />
      </div>
    ),
  },
  {
    name: "ICICI Prudential Mutual Fund",
    subtitle: "Mutual Fund",
    logo: (
      <div className="flex h-full w-full items-center justify-center gap-2 bg-transparent">
        <div className="relative flex h-7 w-7 shrink-0 items-center justify-center">
           <div className="absolute inset-0 rotate-45 rounded-full border-[3.5px] border-[#da1f2f] border-b-transparent border-r-transparent" />
           <div className="h-3 w-3 rounded-full bg-[#da1f2f]" />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-[1.35rem] font-black italic tracking-tighter text-[#da1f2f]">ICICI</span>
          <span className="-mt-0.5 text-[0.95rem] font-extrabold italic tracking-tighter text-[#da1f2f]">PRUDENTIAL</span>
          <span className="mt-0.5 text-[0.5rem] font-bold tracking-[0.2em] text-[#143e7a]">MUTUAL FUND</span>
        </div>
      </div>
    ),
  },
  {
    name: "Kotak Mutual Fund",
    subtitle: "Mutual Fund",
    logo: (
      <div className="flex h-full w-full items-center justify-center bg-transparent">
        <Image
          src="/image/partners/kotak-mutual-fund-logo.webp"
          alt="Kotak Mutual Fund logo"
          width={300}
          height={100}
          className="h-9 w-auto object-contain sm:h-10"
          sizes="(max-width: 640px) 140px, 180px"
        />
      </div>
    ),
  },
  {
    name: "L&T Mutual Fund",
    subtitle: "Mutual Fund",
    logo: (
      <div className="flex h-full w-full items-center justify-center gap-2.5 bg-transparent">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[2.5px] border-black text-black">
          <span className="text-lg font-black tracking-tighter">LT</span>
        </div>
        <div className="flex min-w-0 flex-col justify-center">
          <p className="text-[1.25rem] font-bold italic leading-none text-black">L&amp;T Mutual Fund</p>
        </div>
      </div>
    ),
  },
  {
    name: "SBI Mutual Fund",
    subtitle: "A partner for life",
    logo: (
      <div className="flex h-full w-full items-center justify-center bg-transparent">
        <Image
          src="/image/partners/sbi-mutual-fund-logo.svg"
          alt="SBI Mutual Fund logo"
          width={380}
          height={120}
          className="h-11 w-auto object-contain sm:h-12"
          sizes="(max-width: 640px) 160px, 200px"
        />
      </div>
    ),
  },
  {
    name: "DSP Mutual Fund",
    subtitle: "Mutual Fund",
    logo: (
      <div className="flex h-full w-full items-center justify-center gap-2 bg-transparent">
        <div className="flex items-end gap-1.5">
          <div className="flex flex-col">
            <span className="text-[2.2rem] font-black leading-none text-black font-serif">DSP</span>
            <div className="mt-1 h-[4px] w-[85%] bg-[#0ec5bf]" />
          </div>
          <span className="mb-1 text-[0.7rem] font-bold tracking-[0.12em] text-black">MUTUAL FUND</span>
        </div>
      </div>
    ),
  },
  {
    name: "Edelweiss Mutual Fund",
    subtitle: "Mutual Fund",
    logo: (
      <div className="flex h-full w-full items-center justify-center gap-2.5 bg-transparent">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-[#1f4f99] text-white">
          <span className="mt-1.5 text-3xl font-serif leading-none">*</span>
        </div>
        <div className="flex flex-col justify-center leading-none">
          <p className="mb-1 text-[1.3rem] font-medium tracking-[0.02em] text-[#1f4f99]">Edelweiss</p>
          <p className="text-[0.65rem] font-medium uppercase tracking-[0.1em] text-[#1f4f99]">Mutual Fund</p>
        </div>
      </div>
    ),
  },
  {
    name: "Franklin Templeton Mutual Fund",
    subtitle: "Mutual Fund",
    logo: (
      <div className="flex h-full w-full items-center justify-center gap-2.5 bg-transparent">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-black bg-white shadow-sm">
          <div className="flex h-full w-full items-center justify-center bg-gray-100">
             <div className="h-7 w-5 rounded-t-full bg-gray-400" />
          </div>
        </div>
        <div className="flex flex-col justify-center leading-none">
          <p className="text-[1.05rem] font-bold uppercase text-black font-serif">Franklin Templeton</p>
          <div className="mt-1 flex items-center gap-1">
             <div className="h-[0.5px] flex-1 bg-black" />
             <p className="text-[0.45rem] font-bold uppercase tracking-[0.15em] text-black">Investments</p>
             <div className="h-[0.5px] flex-1 bg-black" />
          </div>
        </div>
      </div>
    ),
  },
  {
    name: "Nippon India Mutual Fund",
    subtitle: "Wealth sets you free",
    logo: (
      <div className="flex h-full w-full items-center justify-center gap-3 bg-transparent">
        <div className="grid h-8 w-8 shrink-0 rotate-45 grid-cols-2 gap-[2px]">
            <span className="h-full w-full rounded-tl-[8px] bg-[#e22d2d]" />
            <span className="h-full w-full rounded-tr-[8px] bg-[#e22d2d]" />
            <span className="h-full w-full rounded-bl-[8px] bg-[#e22d2d]" />
            <span className="h-full w-full rounded-br-[8px] bg-[#e22d2d]" />
        </div>
        <div className="flex flex-col leading-none">
          <p className="text-[1.3rem] font-medium text-[#4a4a4a]">Nippon <span className="text-[#e22d2d]">india</span></p>
          <p className="mt-1 text-[1.1rem] font-medium text-[#4a4a4a]">Mutual Fund</p>
          <p className="mt-1 text-[0.55rem] font-medium uppercase tracking-[0.05em] text-[#9b9b9b]">Wealth sets you free</p>
        </div>
      </div>
    ),
  },
  {
    name: "HDFC Life",
    subtitle: "Life Insurance",
    logo: (
      <div className="flex h-full w-full items-center justify-center bg-transparent">
        <Image
          src="/image/partners/hdfc-life-visual-mark.png"
          alt="HDFC Life logo"
          width={300}
          height={100}
          className="h-14 w-auto object-contain sm:h-16"
          sizes="(max-width: 640px) 140px, 180px"
        />
      </div>
    ),
  },
  {
    name: "TATA AIA Life Insurance",
    subtitle: "Life Insurance",
    logo: (
      <div className="flex h-full w-full flex-col justify-center bg-transparent">
        <div className="flex items-end justify-center gap-2 leading-none">
          <span className="text-[clamp(1rem,2vw,1.42rem)] font-black tracking-[0.04em] text-[#1277bb]">TATA</span>
          <span className="text-[clamp(1rem,2vw,1.42rem)] font-black tracking-[0.06em] text-[#c71e61]">AIA</span>
        </div>
        <div className="mt-2 flex items-center justify-center gap-1.5">
          <span className="h-1 w-5 rounded-full bg-[#1277bb]" />
          <span className="h-1 w-4 rounded-full bg-[#c71e61]" />
          <span className="text-[0.86rem] font-bold leading-none text-[#3e4654]">LIFE INSURANCE</span>
        </div>
      </div>
    ),
  },
  {
    name: "IndiaFirst Life Insurance",
    subtitle: "Promoted by Bank of Baroda",
    logo: (
      <div className="flex h-full w-full flex-col justify-center bg-transparent">
        <div className="mx-auto mb-1 flex w-[88%] items-end justify-start gap-1.5">
          <span className="h-2.5 w-8 -skew-x-[24deg] bg-[#ea1b2c]" />
          <span className="h-3 w-9 -skew-x-[24deg] bg-[#1ea1df]" />
          <span className="h-3.5 w-10 -skew-x-[24deg] bg-[#f36f21]" />
        </div>
        <p className="text-center text-[clamp(0.88rem,1.95vw,1.24rem)] font-extrabold leading-none text-[#174b90]">
          IndiaFirst<span className="text-[#f36f21]">Life</span>
        </p>
        <p className="mt-1 text-center text-[0.63rem] font-semibold uppercase tracking-[0.14em] text-[#6a7d9f]">
          Promoted by
        </p>
        <p className="text-center text-[0.82rem] font-bold leading-none text-[#f07e23]">Bank of Baroda</p>
      </div>
    ),
  },
  {
    name: "Wealthy",
    subtitle: "Digital Wealth Platform",
    logo: (
      <div className="flex h-full w-full items-center gap-3 bg-transparent">
        <div className="flex h-12 w-12 items-end justify-center gap-1 rounded-xl bg-white/70 px-1.5 py-1.5">
          <span className="h-2 w-1.5 rounded-full bg-[#5a2de1]" />
          <span className="h-4 w-1.5 rounded-full bg-[#5a2de1]" />
          <span className="h-6 w-1.5 rounded-full bg-[#5a2de1]" />
          <span className="h-8 w-1.5 rounded-full bg-[#5a2de1]" />
        </div>
        <div className="min-w-0">
          <p className="text-[clamp(1rem,2.1vw,1.5rem)] font-bold leading-none tracking-tight text-[#5a2de1]">wealthy</p>
          <p className="mt-1 text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-[#7e89a4]">Digital Platform</p>
        </div>
      </div>
    ),
  },
];
const MARKET_POLL_INTERVAL_MS = 30_000; // 30s — indices don't need sub-second refresh on a marketing homepage
const poweredByRotator = [
  "Smart AI Insights",
  "Book Expert Call",
  "Smart Dashboard",
];

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
  const [poweredByIndex, setPoweredByIndex] = useState(0);
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
    const rotatorTimer = window.setTimeout(() => {
      setPoweredByIndex((currentIndex) => (currentIndex + 1) % poweredByRotator.length);
    }, 2200);

    return () => {
      window.clearTimeout(rotatorTimer);
    };
  }, [poweredByIndex]);

  useEffect(() => {
    let cancelled = false;

    async function loadLiveMarket() {
      setIsLiveMarketLoading(true);
      setIsInsightDataLoading(true);

      try {
        const [homeResponse, trendResponse] = await Promise.allSettled([
          fetch("/api/market/homepage", {
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
          setMarketIndices(payload.ok ? payload : null);
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
    }, MARKET_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
    };
  }, []);

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
        <section className="relative overflow-hidden pt-32 pb-10 sm:pt-24 md:pb-12 md:pt-28 lg:min-h-screen">
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
            <div className="relative z-20 mt-2 flex w-full max-w-[36rem] flex-1 flex-col items-center text-center sm:mt-0 lg:-mt-12 lg:items-center lg:text-center xl:-mt-16 2xl:-mt-20">
              <div className="mb-5 flex w-full justify-center lg:justify-center">
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

              <div className="flex w-full flex-col items-center text-center lg:items-center lg:text-center">
                <h2 className="mb-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[1.45rem] font-bold leading-none tracking-tight text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)] sm:text-2xl md:text-[1.9rem]">
                  <span className="whitespace-nowrap">Powered by</span>
                  <span className="group relative inline-flex min-h-[2.7rem] min-w-[18rem] items-center gap-1.5 self-center overflow-visible rounded-full border border-[#00e0ff]/30 bg-[linear-gradient(120deg,rgba(0,224,255,0.12),rgba(43,92,255,0.15),rgba(0,224,255,0.08))] px-3 py-1.5 text-[0.76em] shadow-[0_0_16px_rgba(0,224,255,0.18),0_6px_18px_rgba(0,216,255,0.12)] backdrop-blur-md transition-all duration-500 hover:border-[#00e0ff]/50 hover:shadow-[0_0_24px_rgba(0,224,255,0.3),0_8px_24px_rgba(0,216,255,0.18)] sm:text-[0.82em]">
                    <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
                      <span className="absolute inset-0 -translate-x-full animate-[shimmer_3s_ease-in-out_infinite] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)]" />
                    </span>
                    <Sparkles className="relative h-3.5 w-3.5 shrink-0 text-[#00e0ff] drop-shadow-[0_0_6px_rgba(0,224,255,0.5)]" />
                    <span className="relative flex h-[1.15em] flex-1 items-center overflow-hidden leading-none tracking-wide text-transparent">
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={poweredByRotator[poweredByIndex]}
                          initial={{ y: 18, opacity: 0, filter: "blur(3px)" }}
                          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                          exit={{ y: -18, opacity: 0, filter: "blur(3px)" }}
                          transition={{ type: "spring", stiffness: 140, damping: 18 }}
                          className="absolute inset-x-0 bg-[linear-gradient(120deg,#c5f6ff,#ffffff,#a0ecff)] bg-clip-text text-center font-bold text-transparent"
                        >
                          {poweredByRotator[poweredByIndex]}
                        </motion.span>
                      </AnimatePresence>
                    </span>
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
              className="mt-1 flex w-full max-w-[18.5rem] flex-1 justify-center sm:max-w-[22rem] md:max-w-[27rem] lg:mt-0 lg:max-w-[30rem] lg:-translate-x-[80px] lg:justify-end xl:max-w-[34rem]"
            >
              <HeroPhoneMockup />
            </motion.div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION: WHO PRAVIX IS FOR — Premium Redesign
            ═══════════════════════════════════════════════════════════════════ */}
        <motion.section
          id="why-goals"
          className="relative overflow-hidden py-24 md:py-32"
          style={{ background: "linear-gradient(175deg, #f0f5ff 0%, #e4edff 35%, #f7f9ff 70%, #eef4ff 100%)" }}
          variants={sectionReveal}
          initial="hidden"
          whileInView="show"
          viewport={denseSectionViewport}
        >
          {/* Decorative background orbs */}
          <div className="pointer-events-none absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(43,92,255,0.07),transparent_70%)]" />
          <div className="pointer-events-none absolute -bottom-32 -right-32 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(0,216,255,0.06),transparent_70%)]" />
          <div className="pointer-events-none absolute left-1/2 top-1/3 h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(43,92,255,0.04),transparent_65%)]" />

          <div className="relative mx-auto w-full max-w-7xl px-6 md:px-10 lg:px-14">
            {/* ── Section Header ── */}
            <motion.div
              className="mx-auto max-w-3xl text-center"
              variants={chartCardReveal}
              custom={0}
            >
              <div className="mx-auto mb-5 inline-flex items-center gap-2.5 rounded-full border border-[#2b5cff]/15 bg-white/80 px-4 py-1.5 shadow-[0_4px_16px_rgba(43,92,255,0.08)] backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2b5cff] opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#2b5cff]" />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#2b5cff]">Who It&apos;s For</span>
              </div>
              <h2 className="text-[clamp(1.8rem,4.5vw,3.2rem)] font-bold leading-[1.1] tracking-tight text-[#0a1930]">
                Built for people planning{" "}
                <span className="bg-[linear-gradient(120deg,#2b5cff,#0099ff)] bg-clip-text text-transparent">
                  real life goals
                </span>
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#50607d] md:text-lg">
                Whether you&apos;re saving for your child&apos;s education, your first home, or long-term family security —
                Pravix turns your ambitions into a clear, disciplined plan.
              </p>
            </motion.div>

            {/* ── Audience Cards — Icon-driven grid ── */}
            <motion.div
              className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
              initial="hidden"
              whileInView="show"
              viewport={cardGridViewport}
            >
              {[
                {
                  icon: Wallet,
                  title: "Salaried Professionals",
                  desc: "Optimize monthly savings with structured SIP plans and tax-efficient strategies.",
                  accent: "#2b5cff",
                  accentBg: "#edf4ff",
                },
                {
                  icon: Target,
                  title: "Young Families",
                  desc: "Plan for education, home, and family milestones with goal-first roadmaps.",
                  accent: "#0099ff",
                  accentBg: "#e8f6ff",
                },
                {
                  icon: LineChartIcon,
                  title: "Goal-Based Investors",
                  desc: "Track progress across multiple goals with priority scoring and monthly actions.",
                  accent: "#00b894",
                  accentBg: "#e8fff5",
                },
                {
                  icon: Calculator,
                  title: "Tax-Conscious Earners",
                  desc: "Stay ahead of 80C, ELSS, and tax-loss harvesting with quarterly runway tracking.",
                  accent: "#6c5ce7",
                  accentBg: "#f0edff",
                },
              ].map((card, index) => (
                <motion.article
                  key={card.title}
                  className="group relative overflow-hidden rounded-[1.4rem] border border-white/80 bg-white/70 p-6 shadow-[0_8px_32px_rgba(43,92,255,0.06)] backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_48px_rgba(43,92,255,0.14)]"
                  variants={featureCardReveal}
                  custom={index}
                >
                  {/* Top gradient accent bar */}
                  <div
                    className="absolute inset-x-0 top-0 h-1 transition-all duration-300 group-hover:h-1.5"
                    style={{ background: `linear-gradient(90deg, ${card.accent}, ${card.accent}88)` }}
                  />
                  {/* Hover glow */}
                  <div
                    className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-0 blur-[40px] transition-opacity duration-500 group-hover:opacity-100"
                    style={{ backgroundColor: `${card.accent}18` }}
                  />

                  <div
                    className="relative inline-flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                    style={{ backgroundColor: card.accentBg }}
                  >
                    <card.icon className="h-5.5 w-5.5" style={{ color: card.accent }} />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-[#0a1930]">{card.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-[#586987]">{card.desc}</p>
                </motion.article>
              ))}
            </motion.div>

            {/* ── Main Content: Family Visual + Money Mistakes ── */}
            <div className="mt-16 grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch">
              {/* Left: Cinematic family image with floating stats */}
              <motion.div
                className="group relative overflow-hidden rounded-[2rem] shadow-[0_24px_64px_rgba(10,25,48,0.16)]"
                variants={chartCardReveal}
                custom={0}
              >
                <div className="relative aspect-[4/3] sm:aspect-[16/10] lg:aspect-auto lg:h-full lg:min-h-[420px]">
                  <Image
                    src="/image/about-hero-family.webp"
                    alt="Indian family planning their financial future together"
                    fill
                    className="object-cover object-center transition-transform duration-700 group-hover:scale-[1.03]"
                    sizes="(min-width: 1024px) 56vw, 100vw"
                  />
                  {/* Dark gradient overlay */}
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(10,25,48,0)_30%,rgba(10,25,48,0.65)_100%)]" />
                  {/* Subtle blue tint */}
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(43,92,255,0.06),transparent_60%)]" />

                  {/* Floating stats badges */}
                  <div className="absolute left-4 top-4 sm:left-6 sm:top-6">
                    <motion.div
                      className="rounded-2xl border border-white/25 bg-black/30 px-4 py-3 backdrop-blur-xl"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.6, delay: 0.3 }}
                      viewport={{ once: true }}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white">Families Served</p>
                      <p className="mt-0.5 text-2xl font-bold text-white">2,500+</p>
                    </motion.div>
                  </div>

                  <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
                    <motion.div
                      className="rounded-2xl border border-white/25 bg-black/30 px-4 py-3 backdrop-blur-xl"
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.6, delay: 0.45 }}
                      viewport={{ once: true }}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white">Goals Tracked</p>
                      <p className="mt-0.5 text-2xl font-bold text-white">8,200+</p>
                    </motion.div>
                  </div>

                  {/* Bottom caption bar */}
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-5 py-4 sm:px-7 sm:py-5">
                    <div>
                      <p className="text-sm font-semibold text-white sm:text-base">Goal-first. Family-first. Mobile-first.</p>
                      <p className="mt-0.5 text-xs text-white/70">Building India&apos;s most disciplined wealth planning experience</p>
                    </div>
                    <div className="hidden items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-3 py-1.5 backdrop-blur-md sm:inline-flex">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00e0ff] opacity-60" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00e0ff]" />
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/90">Live Platform</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Right: Money Mistakes — premium checklist */}
              <motion.div
                className="flex flex-col gap-4"
                variants={chartCardReveal}
                custom={1}
              >
                {/* Core Services Card */}
                <div className="flex-1 rounded-[1.6rem] border border-[#d8e7ff] bg-white p-6 shadow-[0_16px_40px_rgba(43,92,255,0.08)] sm:p-7">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0f5ff]">
                      <Briefcase className="h-5 w-5 text-[#2b5cff]" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2b5cff]/80">Wealth Architecture</p>
                      <h3 className="text-lg font-bold text-[#0a1930]">Core services we provide</h3>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {[
                      { name: "HNI Services", icon: <Briefcase className="h-4 w-4" />, desc: "Goal-linked allocation & tax-aware structuring" },
                      { name: "Mutual Fund Portfolio", icon: <Landmark className="h-4 w-4" />, desc: "Curated SIP & lump sum strategies" },
                      { name: "Corporate Bonds", icon: <Building2 className="h-4 w-4" />, desc: "Income-focused fixed income opportunities" },
                      { name: "Alternative Products", icon: <PieChartIcon className="h-4 w-4" />, desc: "IPOs, NFOs, Insurance & Corporate FDs" },
                    ].map((item, index) => (
                      <Link href="/services" key={item.name}>
                        <motion.div
                          className="group flex items-center gap-3.5 rounded-xl border border-[#e0ebff]/60 bg-gradient-to-r from-[#f8faff] to-white px-4 py-3.5 transition-all duration-200 hover:border-[#2b5cff]/30 hover:from-[#f0f5ff] hover:to-white hover:shadow-[0_8px_24px_rgba(43,92,255,0.12)] cursor-pointer mt-3"
                          variants={featureCardReveal}
                          custom={index}
                        >
                          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-[#2b5cff] shadow-[0_2px_10px_rgba(43,92,255,0.12)] transition-transform group-hover:scale-110">
                            {item.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[15px] font-bold text-[#0a1930] leading-tight truncate">{item.name}</p>
                            <p className="text-[13px] text-[#475569] mt-0.5 truncate">{item.desc}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 flex-shrink-0 text-[#2b5cff]/40 transition-all group-hover:text-[#2b5cff] group-hover:translate-x-1" />
                        </motion.div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Built for India — compact accent card */}
                <div className="rounded-[1.4rem] border border-[#2b5cff]/12 bg-gradient-to-br from-[#2b5cff] to-[#1e44cd] p-5 text-white shadow-[0_16px_40px_rgba(43,92,255,0.2)] sm:p-6">
                  <div className="flex items-center gap-2.5">
                    <Globe2 className="h-5 w-5 text-[#00d8ff]" />
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#00d8ff]">Built for India</p>
                  </div>
                  <h3 className="mt-2.5 text-lg font-bold leading-snug text-white sm:text-xl">
                    Local context, family goals, disciplined planning.
                  </h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {[
                      "INR-based goals",
                      "Section 80C & tax runway",
                      "Family milestones",
                      "Monthly nudges",
                    ].map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/20 bg-white/12 px-3 py-1.5 text-[11px] font-semibold text-white/90 backdrop-blur-sm transition-colors hover:bg-white/20"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION: GOALS & PRIORITIES — Premium Redesign
            ═══════════════════════════════════════════════════════════════════ */}
        <motion.section
          id="insights-priorities"
          className="relative w-full overflow-hidden py-28 text-white md:py-36"
          style={{ background: "linear-gradient(155deg, #1a3f8f 0%, #234daa 35%, #1e408c 70%, #172f6e 100%)" }}
          variants={sectionReveal}
          initial="hidden"
          whileInView="show"
          viewport={sectionViewport}
        >
          {/* Decorative elements */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_12%,rgba(0,224,255,0.2),transparent_42%),radial-gradient(circle_at_18%_82%,rgba(255,255,255,0.06),transparent_50%)]" />
          <div className="pointer-events-none absolute -left-24 top-1/4 h-[400px] w-[400px] rounded-full bg-[#2b5cff]/10 blur-[120px]" />
          <div className="pointer-events-none absolute -right-24 bottom-1/4 h-[350px] w-[350px] rounded-full bg-[#00d8ff]/8 blur-[100px]" />

          <div className="relative mx-auto grid w-full max-w-7xl gap-10 px-6 md:px-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-stretch lg:gap-14 lg:px-14">
            <motion.div variants={chartCardReveal} custom={0}>
              <div className="group relative h-full min-h-[380px] overflow-hidden rounded-[2rem] border border-white/15 shadow-[0_32px_80px_rgba(0,0,0,0.35)]">
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                >
                  <source src="/video/pravix-sec2.mp4" type="video/mp4" />
                </video>
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(26,63,143,0.15),rgba(23,47,110,0.55))]" />
                <div className="pointer-events-none absolute inset-0 rounded-[2rem] border border-white/10" />
                {/* Floating label */}
                <div className="absolute left-5 top-5 rounded-xl border border-white/20 bg-white/12 px-3.5 py-2 backdrop-blur-xl">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#00e0ff]">Live Preview</p>
                </div>
              </div>
            </motion.div>

            <motion.div variants={chartCardReveal} custom={1} className="flex flex-col justify-center">
              <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-[#00e0ff]/25 bg-[#00e0ff]/8 px-3.5 py-1.5 backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-[#00e0ff]" />
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#00e0ff]">AI-Powered Insights</span>
              </div>
              <h3 className="text-[clamp(2rem,4.5vw,3.6rem)] font-bold leading-[1.06] tracking-[-0.02em]">
                <span className="text-white">Your Goals &amp; </span>
                <span className="bg-[linear-gradient(120deg,#00d8ff,#7df9ff)] bg-clip-text text-transparent">Financial Priorities</span>
              </h3>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-blue-100/90 md:text-lg">
                Every recommendation is shaped around what matters most to you — your risk comfort, your timeline, your family.
              </p>

              <div className="mt-9 space-y-4">
                {[
                  {
                    title: "Market Trends & Data Signals",
                    detail: "Insights reflect current market movements and evolving patterns.",
                    icon: LineChartIcon,
                  },
                  {
                    title: "Expert-Backed Analysis",
                    detail: "Guidance informed by Pravix's investment professionals and research.",
                    icon: ShieldCheck,
                  },
                  {
                    title: "Global Economic Developments",
                    detail: "Broader events that influence markets and long-term opportunities.",
                    icon: Globe2,
                  },
                ].map((item, index) => (
                  <motion.article
                    key={item.title}
                    className="group rounded-2xl border border-white/15 bg-white/8 px-5 py-4.5 backdrop-blur-sm transition-all duration-300 hover:border-[#00d8ff]/30 hover:bg-white/12"
                    variants={featureCardReveal}
                    custom={index}
                  >
                    <div className="flex items-start gap-4">
                      <span className="mt-0.5 inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#00d8ff]/15 transition-colors duration-300 group-hover:bg-[#00d8ff]/25">
                        <item.icon className="h-5 w-5 text-[#00d8ff]" />
                      </span>
                      <div>
                        <h4 className="text-lg font-semibold text-white">{item.title}</h4>
                        <p className="mt-1.5 text-sm leading-relaxed text-blue-100/80">{item.detail}</p>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION: HOW PRAVIX WORKS — Premium Redesign
            ═══════════════════════════════════════════════════════════════════ */}
        <motion.section
          id="how-it-works"
          className="relative overflow-hidden bg-white py-28 md:py-36"
          variants={sectionReveal}
          initial="hidden"
          whileInView="show"
          viewport={denseSectionViewport}
        >
          {/* Subtle decorative background */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(43,92,255,0.03),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(0,216,255,0.03),transparent_50%)]" />

          <div className="relative mx-auto w-full max-w-7xl px-6 md:px-10 lg:px-14">
            {/* Section Header */}
            <motion.div className="mx-auto max-w-3xl text-center" variants={chartCardReveal} custom={0}>
              <div className="mx-auto mb-5 inline-flex items-center gap-2.5 rounded-full border border-[#2b5cff]/12 bg-[#edf4ff] px-4 py-1.5">
                <Compass className="h-3.5 w-3.5 text-[#2b5cff]" />
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#2b5cff]">How It Works</span>
              </div>
              <h2 className="text-[clamp(1.8rem,4.5vw,3.2rem)] font-bold leading-[1.1] tracking-tight text-[#0a1930]">
                A simple four-step path from{" "}
                <span className="bg-[linear-gradient(120deg,#2b5cff,#0099ff)] bg-clip-text text-transparent">goals to action</span>
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#50607d] md:text-lg">
                Share your goals, get a clear roadmap, follow monthly actions, and adjust with AI plus expert support.
              </p>
            </motion.div>

            {/* Steps Grid — connected timeline */}
            <motion.div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4" initial="hidden" whileInView="show" viewport={denseSectionViewport}>
              {[
                {
                  step: "01",
                  title: "Tell us your goals",
                  detail: "Capture your milestones, income, risk comfort, and preferences in one guided flow.",
                  icon: CircleUserRound,
                  accent: "#2b5cff",
                  accentBg: "#edf4ff",
                },
                {
                  step: "02",
                  title: "Get your roadmap",
                  detail: "See a practical plan across goals, allocation, tax runway, and monthly focus.",
                  icon: Target,
                  accent: "#0099ff",
                  accentBg: "#e8f6ff",
                },
                {
                  step: "03",
                  title: "Track & act monthly",
                  detail: "Stay disciplined with timely nudges, checklists, and progress tracking.",
                  icon: RefreshCcw,
                  accent: "#00b894",
                  accentBg: "#e8fff5",
                },
                {
                  step: "04",
                  title: "Adjust with AI + experts",
                  detail: "Use Pravix AI Buddy and advisor guidance as life and markets change.",
                  icon: Compass,
                  accent: "#6c5ce7",
                  accentBg: "#f0edff",
                },
              ].map((item, index) => (
                <motion.article
                  key={item.step}
                  className="group relative overflow-hidden rounded-[1.6rem] border border-[#e2ebff] bg-white p-6 shadow-[0_8px_28px_rgba(43,92,255,0.06)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(43,92,255,0.14)]"
                  variants={featureCardReveal}
                  custom={index}
                >
                  {/* Step number watermark */}
                  <span className="pointer-events-none absolute -right-2 -top-4 text-[5rem] font-black leading-none text-[#2b5cff]/[0.04]">{item.step}</span>

                  <div
                    className="relative inline-flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                    style={{ backgroundColor: item.accentBg }}
                  >
                    <item.icon className="h-5.5 w-5.5" style={{ color: item.accent }} />
                  </div>
                  <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: item.accent }}>Step {item.step}</p>
                  <h3 className="mt-1.5 text-lg font-bold text-[#0a1930]">{item.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-[#586987]">{item.detail}</p>

                  {/* Bottom accent line */}
                  <div className="mt-5 h-0.5 w-0 rounded-full transition-all duration-500 group-hover:w-full" style={{ background: `linear-gradient(90deg, ${item.accent}, transparent)` }} />
                </motion.article>
              ))}
            </motion.div>

            {/* Why Families Choose — premium dark card */}
            <motion.div
              className="mt-16 overflow-hidden rounded-[2rem] border border-[#2b5cff]/15 shadow-[0_32px_80px_rgba(10,25,48,0.2)]"
              style={{ background: "linear-gradient(155deg, #1d4494 0%, #2650a6 50%, #1e3f85 100%)" }}
              variants={chartCardReveal}
              custom={0}
            >
              <div className="relative p-8 text-white sm:p-10 md:p-12">
                <div className="pointer-events-none absolute -right-20 -top-20 h-[250px] w-[250px] rounded-full bg-[#00d8ff]/10 blur-[80px]" />
                <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#00d8ff]">Why Families Choose Pravix</p>
                    <h3 className="mt-4 text-2xl font-bold leading-tight sm:text-3xl md:text-4xl">
                      Not just better returns.<br />
                      <span className="bg-[linear-gradient(120deg,#00d8ff,#7df9ff)] bg-clip-text text-transparent">Better financial behavior.</span>
                    </h3>
                    <p className="mt-4 text-sm leading-relaxed text-blue-100/80 md:text-base">
                      Pravix is designed to make wealth planning feel calm, clear, and confident — even during uncertain markets.
                    </p>
                  </div>
                  <motion.div className="space-y-3.5" initial="hidden" whileInView="show" viewport={cardGridViewport}>
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
                        detail: "Automated nudges keep goals on track before missed SIPs or tax gaps become expensive.",
                      },
                    ].map((point, index) => (
                      <motion.div
                        key={point.title}
                        className="group rounded-xl border border-white/12 bg-white/8 px-4 py-3.5 backdrop-blur-sm transition-all duration-200 hover:border-[#00d8ff]/25 hover:bg-white/12"
                        variants={featureCardReveal}
                        custom={index}
                      >
                        <div className="flex items-start gap-3">
                          <point.icon className="mt-0.5 h-4.5 w-4.5 text-[#00d8ff]" />
                          <div>
                            <p className="text-sm font-semibold text-white">{point.title}</p>
                            <p className="mt-1 text-[13px] leading-relaxed text-blue-100/70">{point.detail}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              </div>
            </motion.div>
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
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${
                        indexItem.trend === "up"
                          ? "bg-[#10b981]/20 text-[#6ee7b7] shadow-[0_0_8px_rgba(16,185,129,0.15)]"
                          : indexItem.trend === "down"
                            ? "bg-[#ef4444]/20 text-[#fca5a5] shadow-[0_0_8px_rgba(239,68,68,0.15)]"
                            : "bg-white/15 text-[#dbe9ff]"
                      }`}>
                        {indexItem.trend === "up" ? "▲" : indexItem.trend === "down" ? "▼" : ""} {indexItem.trend}
                      </span>
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-white">
                      {indexItem.value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </p>
                    <p className={`mt-1 text-xs font-medium ${
                      indexItem.changePct > 0 ? "text-[#6ee7b7]" : indexItem.changePct < 0 ? "text-[#fca5a5]" : "text-[#d9e6ff]"
                    }`}>
                      {changeAbsPrefix}{Math.abs(indexItem.changeAbs).toFixed(2)} • {changePctPrefix}{Math.abs(indexItem.changePct).toFixed(2)}%
                    </p>
                    <div className="mt-3 h-14">
                      {miniTrendPoints.length > 1 ? (
                        <MiniSparkline data={miniTrendPoints} trend={indexItem.trend} gradientId={gradientId} />
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
                  <MainTrendChart data={trendPoints} />
                ) : (
                  <div className="h-full w-full animate-pulse rounded-2xl border border-white/20 bg-white/10" />
                )}
              </div>
            </motion.article>

          </div>
        </motion.section>

        <motion.section
          id="trusted-partners"
          className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f7f9fc_100%)] py-24 md:py-28"
          variants={sectionReveal}
          initial="hidden"
          whileInView="show"
          viewport={sectionViewport}
        >
          <div className="pointer-events-none absolute -left-32 top-10 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(43,92,255,0.04),transparent_65%)]" />
          <div className="pointer-events-none absolute -right-36 bottom-0 h-[380px] w-[380px] rounded-full bg-[radial-gradient(circle,rgba(0,216,255,0.04),transparent_65%)]" />

          <div className="relative mx-auto w-full max-w-7xl px-6 md:px-10 lg:px-14">
            <motion.div className="max-w-3xl" variants={chartCardReveal} custom={0}>
              <div className="mb-4 inline-flex items-center gap-2.5 rounded-full border border-[#2b5cff]/12 bg-[#edf4ff] px-4 py-1.5 shadow-[0_4px_16px_rgba(43,92,255,0.08)] backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-[#2b5cff]" />
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#2b5cff]">Partner Network</span>
              </div>
              <h2 className="text-[clamp(1.9rem,4.6vw,3.35rem)] font-bold leading-[1.08] tracking-tight text-[#0a1930]">
                Our Trusted Partners
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-[#50607d] md:text-lg">
                Pravix surfaces respected fund houses in a clean, scannable format so clients can compare trusted names while staying inside a calm, modern wealth-planning experience.
              </p>
            </motion.div>

            <motion.div
              className="mt-10 overflow-hidden rounded-[2rem] border border-[#dbe7ff] bg-white p-5 shadow-[0_16px_40px_rgba(10,25,48,0.08)] md:p-6"
              variants={chartCardReveal}
              custom={1}
            >
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#0a1930]">Fund Houses</p>
                  <p className="mt-1 text-xs text-[#5f7396]">Official brand names shown in a premium tile layout.</p>
                </div>
                <span className="inline-flex items-center rounded-full border border-[#cfe0ff] bg-[#edf4ff] px-3 py-1 text-xs font-semibold text-[#2b5cff]">
                  {trustedPartners.length} partner tiles
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {trustedPartners.map((partner, index) => (
                  <motion.article
                    key={`${partner.name}-${index}`}
                    className="group rounded-[1.4rem] border border-[#e1ebfb] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-3.5 shadow-[0_8px_22px_rgba(43,92,255,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_30px_rgba(43,92,255,0.12)]"
                    variants={featureCardReveal}
                    custom={index}
                  >
                    <div className="flex h-24 items-center justify-center sm:h-28">
                      <div className="w-full max-w-[170px]">{partner.logo}</div>
                    </div>
                    <div className="mt-3 border-t border-[#edf2fb] pt-3 text-center">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5f7396]">{partner.subtitle}</p>
                      <p className="mt-1 text-sm font-semibold text-[#0a1930]">{partner.name}</p>
                    </div>
                  </motion.article>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.section>

        <motion.section
          id="market-signals"
          className="relative overflow-hidden bg-white py-24 md:py-28"
          variants={sectionReveal}
          initial="hidden"
          whileInView="show"
          viewport={denseSectionViewport}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(43,92,255,0.03),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(0,216,255,0.03),transparent_50%)]" />

          <div className="relative mx-auto w-full max-w-7xl px-6 md:px-10 lg:px-14">
            <motion.div className="mx-auto max-w-3xl text-center" variants={chartCardReveal} custom={0}>
              <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-[#2b5cff]/12 bg-[#edf4ff] px-4 py-1.5">
                <LineChartIcon className="h-3.5 w-3.5 text-[#2b5cff]" />
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#2b5cff]">Market Signals</span>
              </div>
              <h2 className="text-[clamp(1.8rem,4.5vw,3.2rem)] font-bold leading-[1.1] tracking-tight text-[#0a1930]">
                Breadth, allocation, and currency context in one place
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#50607d] md:text-lg">
                This view separates the broader live signals from the planning layer above so the section stays scannable.
              </p>
            </motion.div>

            <motion.div className="mt-10 grid gap-5 lg:grid-cols-3" initial="hidden" whileInView="show" viewport={denseSectionViewport}>
              <motion.article
                className="rounded-3xl border border-[#e2ebff] bg-[#f8fbff] p-5 shadow-[0_10px_28px_rgba(43,92,255,0.06)] lg:col-span-2"
                variants={chartCardReveal}
                custom={0}
              >
                <div className="flex items-center gap-2">
                  <LineChartIcon className="h-4.5 w-4.5 text-[#2b5cff]" />
                  <p className="text-sm font-semibold text-[#0a1930]">Fear &amp; Greed Trend</p>
                </div>
                <p className="mt-1 text-xs text-[#50607d]">
                  {isLiveMarketLoading ? "Loading live sentiment feed..." : sentimentSourceLabel}
                </p>
                <div className="mt-4 h-64">
                  {isHeroReady ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sentimentChartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="4 4" stroke="rgba(43,92,255,0.12)" />
                        <XAxis dataKey="label" stroke="#5f7396" fontSize={12} />
                        <YAxis stroke="#5f7396" fontSize={12} domain={[0, 100]} />
                        <Tooltip
                          formatter={(value, name) => [
                            `${Number(value ?? 0).toFixed(1)}`,
                            name === "value" ? "Index" : "3D Avg",
                          ]}
                          contentStyle={{ backgroundColor: "#ffffff", borderColor: "#d8e7ff", borderRadius: "10px" }}
                          labelStyle={{ color: "#0a1930" }}
                          itemStyle={{ color: "#142a4a" }}
                        />
                        <Line type="monotone" dataKey="value" stroke="#2b5cff" strokeWidth={2.8} dot={false} />
                        <Line type="monotone" dataKey="avg" stroke="#86a9a3" strokeWidth={2} dot={false} strokeDasharray="6 3" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full w-full animate-pulse rounded-2xl border border-[#e2ebff] bg-[#f8fbff]" />
                  )}
                </div>
              </motion.article>

              <motion.article
                className="rounded-3xl border border-[#e2ebff] bg-[#f8fbff] p-5 shadow-[0_10px_28px_rgba(43,92,255,0.06)]"
                variants={chartCardReveal}
                custom={1}
              >
                <div className="flex items-center gap-2">
                  <Wallet className="h-4.5 w-4.5 text-[#2b5cff]" />
                  <p className="text-sm font-semibold text-[#0a1930]">Allocation Mix</p>
                </div>
                <p className="mt-1 text-xs text-[#50607d]">A balanced goal-first structure with diversification controls</p>
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
                          contentStyle={{ backgroundColor: "#ffffff", borderColor: "#d8e7ff", borderRadius: "10px" }}
                          labelStyle={{ color: "#0a1930" }}
                          itemStyle={{ color: "#142a4a" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full w-full animate-pulse rounded-2xl border border-[#e2ebff] bg-[#f8fbff]" />
                  )}
                </div>
                <div className="mt-2 grid grid-cols-1 gap-1.5">
                  {allocationMixData.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between text-xs text-[#50607d]">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: allocationColors[index % allocationColors.length] }} />
                        {item.name}
                      </span>
                      <span className="font-semibold text-[#0a1930]">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </motion.article>

              <motion.article
                className="rounded-3xl border border-[#e2ebff] bg-[#f8fbff] p-5 shadow-[0_10px_28px_rgba(43,92,255,0.06)] lg:col-span-3"
                variants={chartCardReveal}
                custom={2}
              >
                <div className="flex items-center gap-2">
                  <Globe2 className="h-4.5 w-4.5 text-[#2b5cff]" />
                  <p className="text-sm font-semibold text-[#0a1930]">USD/INR Drift (Live)</p>
                </div>
                <p className="mt-1 text-xs text-[#50607d]">
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
                        <CartesianGrid strokeDasharray="4 4" stroke="rgba(43,92,255,0.12)" />
                        <XAxis dataKey="label" stroke="#5f7396" fontSize={12} />
                        <YAxis stroke="#5f7396" fontSize={12} tickFormatter={(value) => `${Number(value).toFixed(2)}`} />
                        <Tooltip
                          formatter={(value, name) => [
                            `${Number(value ?? 0).toFixed(3)}`,
                            name === "rate" ? "USD/INR" : "3D Avg",
                          ]}
                          contentStyle={{ backgroundColor: "#ffffff", borderColor: "#d8e7ff", borderRadius: "10px" }}
                          labelStyle={{ color: "#0a1930" }}
                          itemStyle={{ color: "#142a4a" }}
                        />
                        <Area type="monotone" dataKey="rolling" stroke="#86a9a3" fill="transparent" strokeDasharray="7 4" />
                        <Area type="monotone" dataKey="rate" stroke="#2b5cff" fill="url(#sipGradient)" strokeWidth={2.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full w-full animate-pulse rounded-2xl border border-[#e2ebff] bg-[#f8fbff]" />
                  )}
                </div>
              </motion.article>
            </motion.div>
          </div>
        </motion.section>



        {/* ═══════════════════════════════════════════════════════════════════
          SECTION: TEAM PRAVIX — Premium Redesign
          ═══════════════════════════════════════════════════════════════════ */}
        <motion.section
          id="about-us"
          className="relative overflow-hidden bg-white py-28 md:py-36"
          variants={sectionReveal}
          initial="hidden"
          whileInView="show"
          viewport={denseSectionViewport}
        >
          <div className="pointer-events-none absolute -left-32 top-20 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(43,92,255,0.03),transparent_65%)]" />
          <div className="pointer-events-none absolute -right-32 bottom-20 h-[350px] w-[350px] rounded-full bg-[radial-gradient(circle,rgba(0,153,255,0.03),transparent_65%)]" />

          <div className="relative mx-auto w-full max-w-7xl px-6 md:px-10 lg:px-14">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="mb-4 inline-flex items-center gap-2.5 rounded-full border border-[#2b5cff]/12 bg-[#edf4ff] px-4 py-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#2b5cff]" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#2b5cff]">About Pravix</span>
                </div>
                <h2 className="text-[clamp(1.8rem,4.5vw,3.2rem)] font-bold leading-[1.1] tracking-tight text-[#0a1930]">
                  A trusted wealth partner for{" "}
                  <span className="bg-[linear-gradient(120deg,#2b5cff,#0099ff)] bg-clip-text text-transparent">Indian families</span>
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
                      src="/image/aditya-saini-profile-2026.jpg"
                      alt="Aditya Saini, Advocate and Tax Consultant"
                      fill
                      className="object-cover object-center"
                      sizes="(min-width: 1280px) 28vw, (min-width: 768px) 46vw, 100vw"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,25,48,0)_25%,rgba(10,25,48,0.62)_100%)]" />
                    <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                      <p className="text-xl font-semibold">Aditya Saini</p>
                      <p className="text-xs uppercase tracking-[0.12em] text-[#d8e5ff]">Advocate & Tax Consultant ·</p>
                    </div>
                  </div>
                  {/* <div className="border-t border-[#d8e7ff] px-4 py-3 text-xs text-[#50607d]">Contact: adv.aaditya00@gmail.com</div> */}
                </motion.article>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION: BLOG — Premium Redesign
            ═══════════════════════════════════════════════════════════════════ */}
        <motion.section
          id="blog"
          className="relative overflow-hidden py-28 md:py-36"
          style={{ background: "linear-gradient(175deg, #f6f9ff 0%, #edf4ff 50%, #f7f9ff 100%)" }}
          variants={sectionReveal}
          initial="hidden"
          whileInView="show"
          viewport={denseSectionViewport}
        >
          <div className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(43,92,255,0.04),transparent_65%)]" />

          <div className="relative mx-auto w-full max-w-7xl px-6 md:px-10 lg:px-14">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#2b5cff]/12 bg-white/80 px-4 py-1.5 shadow-[0_4px_12px_rgba(43,92,255,0.06)] backdrop-blur-sm">
                  <Sparkles className="h-3.5 w-3.5 text-[#2b5cff]" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#2b5cff]">Wealth Notes</span>
                </div>
                <h2 className="text-[clamp(1.8rem,4.5vw,3.2rem)] font-bold leading-[1.1] tracking-tight text-[#0a1930]">
                  Insights you can{" "}
                  <span className="bg-[linear-gradient(120deg,#2b5cff,#0099ff)] bg-clip-text text-transparent">apply this month</span>
                </h2>
              </div>
              <Link
                href="/learn"
                className="group inline-flex items-center gap-2 self-start rounded-full border border-[#2b5cff]/20 bg-white px-6 py-3 text-sm font-semibold text-[#2b5cff] shadow-[0_4px_16px_rgba(43,92,255,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(43,92,255,0.16)]"
              >
                Browse all articles
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            <motion.div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4" initial="hidden" whileInView="show" viewport={denseSectionViewport}>
              {featuredBlogPosts.map((post, index) => (
                <motion.article
                  key={post.slug}
                  className="group overflow-hidden rounded-[1.4rem] border border-[#e2ebff] bg-white shadow-[0_8px_28px_rgba(43,92,255,0.06)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_48px_rgba(43,92,255,0.14)]"
                  variants={featureCardReveal}
                  custom={index}
                >
                  <div className="overflow-hidden">
                    <Image
                      src={post.coverImage}
                      alt={post.title}
                      width={1600}
                      height={900}
                      className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between text-[11px] text-[#5f7396]">
                      <span>{new Date(post.publishedAt).toLocaleDateString("en-IN")}</span>
                      <span className="rounded-full bg-[#f0f5ff] px-2 py-0.5 font-medium">{post.readTime}</span>
                    </div>
                    <h3 className="mt-2.5 line-clamp-2 text-lg font-bold text-[#0a1930] transition-colors group-hover:text-[#2b5cff]">{post.title}</h3>
                    <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-[#586987]">{post.excerpt}</p>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {post.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="rounded-full border border-[#2b5cff]/15 bg-[#f0f5ff] px-2.5 py-1 text-[10px] font-semibold text-[#2b5cff]">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <Link
                      href={`/learn/${post.slug}`}
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#2b5cff] transition-colors group-hover:text-[#0066cc]"
                    >
                      Read article
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                </motion.article>
              ))}
            </motion.div>
          </div>
        </motion.section>

        {/* Calendly Booking Section */}
        <CalendlyBookingSection />

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION: FINAL CTA — Premium Redesign
            ═══════════════════════════════════════════════════════════════════ */}
        <motion.section
          id="contact"
          className="relative overflow-hidden py-28 text-white md:py-36"
          style={{ background: "linear-gradient(160deg, #152d65 0%, #1d4494 35%, #1a3a7c 70%, #132552 100%)" }}
          variants={sectionReveal}
          initial="hidden"
          whileInView="show"
          viewport={denseSectionViewport}
        >
          {/* Decorative elements */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(0,216,255,0.15),transparent_42%),radial-gradient(circle_at_15%_85%,rgba(43,92,255,0.12),transparent_45%)]" />
          <div className="pointer-events-none absolute right-0 top-0 h-[500px] w-[500px] bg-[radial-gradient(circle,rgba(0,216,255,0.06),transparent_60%)]" />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 h-[300px] w-[300px] rounded-full bg-[#2b5cff]/8 blur-[100px]" />

          <div className="relative mx-auto w-full max-w-7xl px-6 md:px-10 lg:px-14">
            <motion.div className="grid gap-5 md:grid-cols-3" initial="hidden" whileInView="show" viewport={denseSectionViewport}>
              {[
                {
                  title: "Secure private profile",
                  desc: "Authenticated sessions with user-scoped access and robust backend enforcement for profile privacy.",
                  icon: ShieldCheck,
                },
                {
                  title: "Transparent reasoning",
                  desc: "Each recommendation explains what changed, why it matters, and what you can do next.",
                  icon: Sparkles,
                },
                {
                  title: "Human + AI support",
                  desc: "Use self-serve guidance daily, and connect with an expert when you want deeper confidence.",
                  icon: MessageCircle,
                },
              ].map((item, index) => (
                <motion.article
                  key={item.title}
                  className="group rounded-2xl border border-white/10 bg-white/6 p-6 backdrop-blur-sm transition-all duration-300 hover:border-[#00d8ff]/20 hover:bg-white/10"
                  variants={featureCardReveal}
                  custom={index}
                >
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#00d8ff]/12 transition-colors group-hover:bg-[#00d8ff]/20">
                    <item.icon className="h-5 w-5 text-[#00d8ff]" />
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-blue-100/70">{item.desc}</p>
                </motion.article>
              ))}
            </motion.div>

            <div className="mt-5 rounded-xl border border-white/10 bg-white/5 px-5 py-3.5 text-[13px] leading-relaxed text-blue-100/60">
              Pravix provides educational guidance and planning support. It does not promise guaranteed returns and does not replace personalized licensed investment advice.
            </div>

            {/* Hero CTA Card */}
            <div className="mt-16 overflow-hidden rounded-[2rem] border border-white/15 p-1 shadow-[0_32px_80px_rgba(0,0,0,0.3)]" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))" }}>
              <div className="relative rounded-[1.6rem] p-8 sm:p-10 md:p-14" style={{ background: "linear-gradient(140deg, #1e4494 0%, #2650a6 50%, #1d3d82 100%)" }}>
                <div className="pointer-events-none absolute -right-16 -top-16 h-[200px] w-[200px] rounded-full bg-[#00d8ff]/12 blur-[60px]" />
                <div className="pointer-events-none absolute -bottom-12 -left-12 h-[180px] w-[180px] rounded-full bg-[#2b5cff]/15 blur-[60px]" />

                <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
                  <div className="max-w-2xl">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#00d8ff]/25 bg-[#00d8ff]/8 px-3.5 py-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00d8ff] opacity-60" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00d8ff]" />
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#00d8ff]">Start With Confidence</span>
                    </div>
                    <h2 className="text-[clamp(1.8rem,4vw,3rem)] font-bold leading-tight">
                      <span className="text-white">Stay on track for every </span>
                      <span className="bg-[linear-gradient(120deg,#00d8ff,#7df9ff)] bg-clip-text text-transparent">major life goal.</span>
                    </h2>
                    <p className="mt-4 max-w-xl text-base leading-relaxed text-blue-100/80">
                      Begin with guided onboarding, follow clear monthly actions, and use Pravix support whenever you need it.
                    </p>
                  </div>

                  <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[17rem]">
                    <Link
                      href="/onboarding"
                      className="group inline-flex h-13 items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-semibold text-[#1e4494] shadow-[0_8px_24px_rgba(0,0,0,0.15)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.22)]"
                    >
                      Start your plan
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                    <Link
                      href="/onboarding?mode=advisor"
                      className="inline-flex h-12 items-center justify-center rounded-full border border-white/30 bg-white/8 px-6 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/15"
                    >
                      Talk to an expert
                    </Link>
                    <Link
                      href="/dashboard"
                      className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 bg-transparent px-6 text-sm font-semibold text-blue-100/80 transition-colors hover:border-white/25 hover:bg-white/6 hover:text-white"
                    >
                      View dashboard preview
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

      </div>
    </>
  );
}




