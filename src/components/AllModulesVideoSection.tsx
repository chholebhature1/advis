"use client";

import Link from "next/link";
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  BellRing,
  Calculator,
  CircleUserRound,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type AllModulesVideoSectionProps = {
  isCompactMotion: boolean;
  isHeroReady: boolean;
};

type ModuleCluster = {
  title: string;
  summary: string;
  items: string[];
};

type ModuleCard = {
  icon: typeof BellRing;
  title: string;
  desc: string;
  badge: string;
};

type ModuleImpactPoint = {
  module: string;
  score: number;
};

type TaxEfficiencyPoint = {
  quarter: string;
  used: number;
  potential: number;
};

const motionEase = [0.22, 1, 0.36, 1] as const;

const moduleImpactData: ModuleImpactPoint[] = [
  { module: "Alerts", score: 88 },
  { module: "Holdings", score: 93 },
  { module: "Tax", score: 81 },
  { module: "Profile", score: 76 },
  { module: "Copilot", score: 90 },
];

const taxEfficiencyData: TaxEfficiencyPoint[] = [
  { quarter: "Q1", used: 28, potential: 40 },
  { quarter: "Q2", used: 47, potential: 63 },
  { quarter: "Q3", used: 71, potential: 84 },
  { quarter: "Q4", used: 96, potential: 100 },
];

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

function createCardReveal(isCompactMotion: boolean) {
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

function createChartReveal(isCompactMotion: boolean) {
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

export default function AllModulesVideoSection({ isCompactMotion, isHeroReady }: AllModulesVideoSectionProps) {
  const sectionReveal = useMemo(() => createSectionReveal(isCompactMotion), [isCompactMotion]);
  const featureCardReveal = useMemo(() => createCardReveal(isCompactMotion), [isCompactMotion]);
  const chartCardReveal = useMemo(() => createChartReveal(isCompactMotion), [isCompactMotion]);
  const denseSectionViewport = useMemo(
    () => ({ once: true, amount: isCompactMotion ? 0.1 : 0.2 }),
    [isCompactMotion],
  );

  const clusters: ModuleCluster[] = [
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
  ];

  const modules: ModuleCard[] = [
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
  ];

  return (
    <motion.section
      id="platform"
      className="relative overflow-hidden py-28 md:py-36"
      variants={sectionReveal}
      initial="hidden"
      whileInView="show"
      viewport={denseSectionViewport}
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#06111e_0%,#08142a_26%,#0f1e3d_64%,#0f1730_100%)]" />
      <div className="absolute inset-0">
        <video
          className="h-full w-full object-cover opacity-55"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/image/hero-banner-3.png"
          style={{ objectPosition: isCompactMotion ? "64% center" : "center" }}
        >
          <source src="/video/pravix%20hero%20video.mp4" type="video/mp4" />
        </video>
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,216,255,0.24),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(43,92,255,0.22),transparent_34%),linear-gradient(120deg,rgba(4,10,24,0.78),rgba(4,10,24,0.54)_42%,rgba(12,26,56,0.74))]" />
      <div className="pointer-events-none absolute -right-40 top-20 h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(43,92,255,0.16),transparent_70%)] blur-2xl" />
      <div className="pointer-events-none absolute -left-32 bottom-40 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(0,216,255,0.1),transparent_70%)] blur-2xl" />

      <div className="relative mx-auto w-full max-w-7xl px-6 md:px-10 lg:px-14">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-1.5 shadow-[0_12px_28px_rgba(4,10,24,0.28)] backdrop-blur-xl">
              <BarChart3 className="h-3.5 w-3.5 text-[#7cc6ff]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#b9dbff]">Platform Features</span>
            </div>
            <h2 className="text-[clamp(1.8rem,4.5vw,3.4rem)] font-bold leading-[1.06] tracking-tight text-white">
              Feature clusters built around <span className="bg-[linear-gradient(120deg,#8fe8ff,#6fa8ff_45%,#ffffff)] bg-clip-text text-transparent">your outcomes</span>
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#d1def6] md:text-base">
              The section below keeps the original Pravix module story, but frames it as a cinematic control surface for planning,
              alerting, optimization, and private AI guidance.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="group inline-flex items-center gap-2 self-start rounded-full border border-white/15 bg-white/10 px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(4,10,24,0.28)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/14 hover:shadow-[0_16px_32px_rgba(4,10,24,0.34)]"
          >
            View dashboard preview
            <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>
        </div>

        <motion.div className="mt-8 grid gap-5 lg:grid-cols-3" initial="hidden" whileInView="show" viewport={denseSectionViewport}>
          {clusters.map((cluster, index) => (
            <motion.article
              key={cluster.title}
              className="rounded-2xl border border-white/12 bg-white/10 p-5 text-white shadow-[0_18px_42px_rgba(4,10,24,0.24)] backdrop-blur-xl"
              variants={featureCardReveal}
              custom={index}
            >
              <h3 className="text-xl font-bold text-white">{cluster.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#d1def6]">{cluster.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {cluster.items.map((item) => (
                  <span key={item} className="rounded-full border border-white/15 bg-white/8 px-3 py-1 text-xs font-semibold text-[#edf5ff]">
                    {item}
                  </span>
                ))}
              </div>
            </motion.article>
          ))}
        </motion.div>

        <div className="mt-8 flex items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-white/30 to-transparent" />
          <p className="flex-shrink-0 text-xs font-bold uppercase tracking-[0.18em] text-[#cfe1ff]">All Modules</p>
          <div className="h-px flex-1 bg-gradient-to-l from-white/30 to-transparent" />
        </div>

        <motion.div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3" initial="hidden" whileInView="show" viewport={denseSectionViewport}>
          {modules.map((module, index) => (
            <motion.article
              key={module.title}
              className="group rounded-2xl border border-white/12 bg-white/10 p-6 text-white shadow-[0_20px_40px_rgba(4,10,24,0.24)] backdrop-blur-xl transition-all duration-250 hover:-translate-y-1 hover:border-[#8fe8ff]/45 hover:bg-white/12"
              variants={featureCardReveal}
              custom={index}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[linear-gradient(135deg,rgba(143,232,255,0.18),rgba(111,168,255,0.18))] text-[#d9f6ff] ring-1 ring-white/12 transition-transform duration-300 group-hover:scale-[1.03]">
                  <module.icon className="h-5 w-5" />
                </div>
                <span className="rounded-full border border-[#8fe8ff]/25 bg-[#08162e]/45 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#d4efff]">
                  {module.badge}
                </span>
              </div>

              <h3 className="mt-4 text-xl font-bold text-white">{module.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#d1def6]">{module.desc}</p>
            </motion.article>
          ))}
        </motion.div>

        <motion.div className="mt-12 grid gap-5 lg:grid-cols-2" initial="hidden" whileInView="show" viewport={denseSectionViewport}>
          <motion.article
            className="rounded-3xl border border-white/12 bg-white/90 p-6 shadow-[0_24px_46px_rgba(4,10,24,0.24)] backdrop-blur-xl"
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
            className="rounded-3xl border border-white/12 bg-white/90 p-6 shadow-[0_24px_46px_rgba(4,10,24,0.24)] backdrop-blur-xl"
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
  );
}