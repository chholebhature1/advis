"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, CalendarClock, CircleDashed, FileText, ShieldCheck, Sparkles, TrendingUp, TriangleAlert } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import AllocationChart from "@/components/AllocationChart";

type UserData = {
  name: string;
  financialGoal: string;
  goals?: string[];
  priorities?: string[];
  pref1: string;
  pref2: string;
  pref3: string;
};

function inferGoalYears(goal: string): number {
  const normalized = goal.toLowerCase();
  if (normalized.includes("retirement")) return 20;
  if (normalized.includes("education")) return 12;
  if (normalized.includes("house") || normalized.includes("home")) return 7;
  if (normalized.includes("wealth")) return 15;
  return 10;
}

function formatInr(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function riskScoreForAsset(name: string): number {
  const key = name.toLowerCase();
  if (key.includes("equity") || key.includes("stock")) return 3;
  if (key.includes("mutual") || key.includes("fund")) return 2;
  if (key.includes("gold") || key.includes("bond") || key.includes("debt") || key.includes("fixed")) return 1;
  return 2;
}

export default function Dashboard() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [allocation, setAllocation] = useState<{name: string, value: number}[]>([]);

  useEffect(() => {
    const data = localStorage.getItem("pravix_user_data");
    if (data) {
      const parsed = JSON.parse(data);
      setUserData(parsed);
      
      // Simple mock logic for allocation
      setAllocation([
        { name: parsed.pref1, value: 50 },
        { name: parsed.pref2, value: 30 },
        { name: parsed.pref3, value: 20 },
      ]);
    } else {
      setUserData({ name: "Guest", financialGoal: "Wealth Accumulation", pref1: "Equity", pref2: "Mutual Funds", pref3: "Gold" });
      setAllocation([
        { name: "Equity", value: 60 },
        { name: "Mutual Funds", value: 30 },
        { name: "Gold", value: 10 },
      ]);
    }
  }, []);

  if (!userData) {
    return <div className="min-h-screen bg-finance-bg flex items-center justify-center text-finance-green">Loading...</div>;
  }

  const totalValue = 1248390;
  const annualizedGrowth = 0.124;
  const yearsToGoal = inferGoalYears(userData.financialGoal);
  const targetValue = userData.financialGoal.toLowerCase().includes("retirement") ? 2500000 : 2100000;
  const projectedValue = 2820000;
  const monthlyContribution = 18500;
  const suggestedMonthlyContribution = 22500;
  const extraMonthlyNeeded = suggestedMonthlyContribution - monthlyContribution;

  const weightedRisk = allocation.reduce((sum, asset) => {
    return sum + riskScoreForAsset(asset.name) * (asset.value / 100);
  }, 0);

  const riskLevel = weightedRisk >= 2.35 ? "High" : weightedRisk >= 1.65 ? "Moderate" : "Low";
  const confidenceLevel = weightedRisk <= 2.4 ? "High" : weightedRisk <= 2.8 ? "Medium" : "Low";

  const progressVsTarget = totalValue / targetValue;
  const trajectory = progressVsTarget >= 0.72 ? "Ahead of Plan" : progressVsTarget >= 0.56 ? "On Track" : "Slightly Behind";
  const trajectoryTone = trajectory === "On Track"
    ? "text-finance-green bg-finance-green/15"
    : trajectory === "Slightly Behind"
      ? "text-amber-300 bg-amber-400/15"
      : "text-finance-accent bg-finance-accent/20";

  const weeklyChange = 0.9;
  const monthlyChange = 2.8;
  const benchmarkGap = 0.6;

  const changedRecently = [
    { label: "Weekly portfolio change", value: `+${weeklyChange}%`, note: "Driven by technology and quality financials." },
    { label: "Monthly strategy shift", value: "Rebalanced 4%", note: "Moved from cyclical exposure into defensive debt." },
    { label: "Benchmark relative", value: `+${benchmarkGap}%`, note: "Current path is outperforming your blended benchmark." },
  ];

  const insights = [
    "Inflation cool-off improves real debt yields for your time horizon.",
    "Valuation discipline suggests staggered SIP entries over the next quarter.",
  ];

  return (
    <>
      <SiteHeader />
      <div className="min-h-screen bg-finance-bg pt-24 pb-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-finance-dim">Portfolio Overview</p>
              <h1 className="mt-2 text-5xl font-semibold tracking-tight text-finance-text">
                ${totalValue.toLocaleString()} <span className="text-3xl text-finance-green">+12.4%</span>
              </h1>
              <p className="mt-1 text-finance-muted">Wealth planning for every Indian</p>
              <p className="mt-3 text-sm text-finance-dim">
                Based on your goal: <span className="text-finance-text">{userData.financialGoal}</span> in {yearsToGoal} years.
              </p>
              <div className={`mt-2 inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${trajectoryTone}`}>
                {trajectory}
              </div>
            </div>
            <div className="rounded-xl border border-finance-border/70 bg-finance-surface/70 p-4 min-w-64 transition-all duration-300 hover:-translate-y-0.5 hover:border-finance-border-soft">
              <p className="text-xs text-finance-dim">Active Strategy</p>
              <p className="mt-1 text-finance-text font-semibold">Balanced Pravix Path</p>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-finance-dim">Confidence Level</span>
                <span className={`rounded-full px-2.5 py-1 font-semibold ${
                  confidenceLevel === "High"
                    ? "bg-finance-green/15 text-finance-green"
                    : confidenceLevel === "Medium"
                      ? "bg-amber-300/15 text-amber-300"
                      : "bg-red-400/15 text-red-300"
                }`}>{confidenceLevel}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-6">
              <section className="rounded-2xl border border-finance-border/70 bg-[linear-gradient(140deg,rgba(29,34,53,0.95),rgba(17,22,38,0.94))] p-6 transition-all duration-300 hover:border-finance-border-soft hover:-translate-y-0.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold text-finance-text">Goal Performance</h2>
                    <p className="text-finance-muted text-sm">{userData.financialGoal} path vs. long-term projection</p>
                  </div>
                  <span className="rounded-full bg-finance-green/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.13em] text-finance-green">On Track</span>
                </div>

                <div className="mt-8">
                  <div className="relative h-40 overflow-hidden rounded-xl border border-finance-border/60 bg-finance-bg/70">
                    <div className="absolute inset-x-0 top-1/2 h-px bg-finance-border/30" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(78,231,191,0.18),transparent_45%)]" />
                    <div className="absolute bottom-8 left-0 right-0 h-16 bg-[linear-gradient(95deg,transparent_0%,rgba(143,145,255,0.65)_42%,rgba(213,214,255,0.95)_66%,rgba(143,145,255,0.5)_100%)] [clip-path:polygon(0%_80%,20%_70%,35%_58%,48%_40%,60%_26%,72%_18%,85%_13%,100%_20%,100%_35%,0%_35%)]" />
                    <div className="absolute inset-x-0 top-8 h-px border-t border-dashed border-finance-accent/45" />
                    <div className="absolute inset-x-8 bottom-3 flex items-center justify-between text-[10px] uppercase tracking-[0.1em] text-finance-dim">
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-finance-accent" />Now</span>
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-finance-green" />Milestone 1</span>
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-finance-green" />Milestone 2</span>
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-finance-text" />Target</span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-3 text-sm">
                    <div>
                      <p className="text-finance-dim">Current Capital</p>
                      <p className="text-finance-text text-2xl font-semibold">${(totalValue / 1000000).toFixed(2)}M</p>
                    </div>
                    <div>
                      <p className="text-finance-dim">Projected Target</p>
                      <p className="text-finance-green text-2xl font-semibold">${(projectedValue / 1000000).toFixed(2)}M</p>
                    </div>
                    <div>
                      <p className="text-finance-dim">Avg. Yield</p>
                      <p className="text-finance-text text-2xl font-semibold">{(annualizedGrowth * 100).toFixed(1)}% CAGR</p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-finance-border/70 bg-finance-surface/80 p-6 transition-all duration-300 hover:border-finance-border-soft hover:-translate-y-0.5">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-xl font-semibold text-finance-text">What Changed Recently</h3>
                  <span className="text-xs text-finance-dim">Weekly / Monthly intelligence</span>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  {changedRecently.map(item => (
                    <div key={item.label} className="rounded-xl border border-finance-border/70 bg-finance-bg/60 p-4">
                      <p className="text-[11px] uppercase tracking-[0.11em] text-finance-dim">{item.label}</p>
                      <p className="mt-2 text-lg font-semibold text-finance-text">{item.value}</p>
                      <p className="mt-2 text-sm text-finance-muted leading-relaxed">{item.note}</p>
                    </div>
                  ))}
                </div>
              </section>

              <div className="grid gap-6 md:grid-cols-2">
                <section className="rounded-2xl border border-finance-border/70 bg-finance-surface/85 p-6 transition-all duration-300 hover:border-finance-border-soft hover:-translate-y-0.5">
                  <h3 className="text-2xl font-semibold text-finance-text mb-4">Asset Allocation</h3>
                  <AllocationChart data={allocation} />
                  <div className="mt-3 rounded-lg border border-finance-border/60 bg-finance-bg/60 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-[0.12em] text-finance-dim">Risk Level</span>
                      <span className={`text-xs font-semibold ${
                        riskLevel === "High" ? "text-red-300" : riskLevel === "Moderate" ? "text-amber-300" : "text-finance-green"
                      }`}>{riskLevel}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-finance-border/40 overflow-hidden">
                      <div
                        className={`h-full ${riskLevel === "High" ? "bg-red-300" : riskLevel === "Moderate" ? "bg-amber-300" : "bg-finance-green"}`}
                        style={{ width: `${Math.min(100, (weightedRisk / 3) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {allocation.map((item, i) => (
                      <div key={item.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ["#4ee7bf", "#8f91ff", "#d6d7ff"][i % 3] }} />
                          <span className="text-finance-muted">{item.name}</span>
                        </div>
                        <span className="text-finance-text font-medium">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-finance-border/70 bg-finance-surface/85 p-6 transition-all duration-300 hover:border-finance-border-soft hover:-translate-y-0.5">
                  <h3 className="text-2xl font-semibold text-finance-text">Sector Exposure</h3>
                  <div className="mt-5 space-y-5">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-finance-muted">Technology</span>
                        <span className="text-finance-green font-medium">+2.4%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-finance-border/40 overflow-hidden">
                        <div className="h-full w-[42%] bg-finance-green" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-finance-muted">Energy &amp; Renewable</span>
                        <span className="text-red-300 font-medium">-0.8%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-finance-border/40 overflow-hidden">
                        <div className="h-full w-[18%] bg-finance-accent" />
                      </div>
                    </div>
                    <div className="rounded-xl border border-finance-border/70 bg-finance-bg/70 p-4">
                      <p className="text-finance-muted text-sm leading-relaxed">
                        Diversification across sectors keeps your {userData.financialGoal.toLowerCase()} plan resilient through shifting cycles.
                      </p>
                    </div>
                    <div className="rounded-xl border border-finance-border/70 bg-finance-bg/65 p-4">
                      <p className="text-xs uppercase tracking-[0.12em] text-finance-dim">Actionable Insight</p>
                      <p className="mt-2 text-sm text-finance-muted leading-relaxed">
                        If you invest <span className="text-finance-text font-medium">{formatInr(suggestedMonthlyContribution)}</span>/month, you can reach your target about 2.5 years faster.
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            </div>

            <aside className="space-y-5">
              <section className="rounded-2xl border border-finance-border/70 bg-finance-surface/85 p-6 transition-all duration-300 hover:border-finance-border-soft hover:-translate-y-0.5">
                <p className="text-[11px] uppercase tracking-[0.16em] text-finance-green font-semibold">Market Intel</p>
                <h3 className="mt-2 text-2xl font-semibold leading-tight text-finance-text">What rates mean for your allocation</h3>
                <p className="mt-3 text-finance-muted text-sm leading-relaxed">
                  As central banks pivot, we rebalance your strategy to capture stable growth while reducing drawdown risk.
                </p>
                <ul className="mt-4 space-y-2">
                  {insights.map(item => (
                    <li key={item} className="flex items-start gap-2 text-sm text-finance-muted">
                      <CircleDashed className="h-4 w-4 mt-0.5 text-finance-accent" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <button className="mt-5 text-sm font-medium text-finance-text hover:text-finance-accent transition-colors">Read Full Insight</button>
              </section>

              <section className="rounded-2xl border border-finance-border/70 bg-finance-surface/85 p-6 transition-all duration-300 hover:border-finance-border-soft hover:-translate-y-0.5">
                <h3 className="text-xl font-semibold text-finance-text">Optimize Strategy</h3>
                <p className="mt-2 text-sm text-finance-muted">Tax-loss and rebalance opportunities detected for this quarter.</p>
                <div className="mt-4 rounded-lg border border-finance-border/60 bg-finance-bg/60 p-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-finance-dim">Suggested Actions</p>
                  <div className="mt-3 space-y-2 text-sm">
                    <button className="w-full rounded-md border border-finance-border bg-finance-surface/60 px-3 py-2 text-left text-finance-text hover:border-finance-border-soft transition-colors">
                      Increase SIP by {formatInr(extraMonthlyNeeded)} / month
                    </button>
                    <button className="w-full rounded-md border border-finance-border bg-finance-surface/60 px-3 py-2 text-left text-finance-text hover:border-finance-border-soft transition-colors">
                      Rebalance allocation toward defensive debt +4%
                    </button>
                  </div>
                </div>
                <button className="mt-5 w-full rounded-lg bg-finance-green text-[#08111d] py-3 font-semibold hover:brightness-105 transition-all">
                  Execute Optimization
                </button>
              </section>

              <section className="rounded-2xl border border-finance-border/70 bg-finance-panel-2/65 p-5 transition-all duration-300 hover:border-finance-border-soft hover:-translate-y-0.5">
                <div className="flex items-center gap-2 text-finance-text font-semibold">
                  <CalendarClock className="w-4 h-4 text-finance-accent" /> Upcoming Review
                </div>
                <p className="mt-2 text-finance-text">Thursday, Oct 24</p>
                <p className="text-sm text-finance-muted">10:30 AM • Zoom</p>
                <button className="mt-4 w-full rounded-lg border border-finance-border bg-finance-bg/60 py-2.5 text-sm text-finance-text hover:border-finance-border-soft">Reschedule</button>
              </section>

              <button className="w-full rounded-xl border border-finance-border/70 bg-finance-surface/75 px-4 py-3 text-left text-sm text-finance-text hover:border-finance-border-soft transition-colors flex items-center justify-between">
                <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-finance-accent" /> Download Statements</span>
                <span className="text-finance-dim">&gt;</span>
              </button>
              <button className="w-full rounded-xl border border-finance-border/70 bg-finance-surface/75 px-4 py-3 text-left text-sm text-finance-text hover:border-finance-border-soft transition-colors flex items-center justify-between">
                <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-finance-accent" /> Security &amp; Compliance</span>
                <span className="text-finance-dim">&gt;</span>
              </button>

              <section className="rounded-2xl border border-finance-border/70 bg-finance-surface/85 p-6 transition-all duration-300 hover:border-finance-border-soft hover:-translate-y-0.5">
                <div className="flex items-center gap-2 text-finance-text font-semibold">
                  <Sparkles className="w-4 h-4 text-finance-green" /> Why this fits
                </div>
                <p className="mt-3 text-sm text-finance-muted leading-relaxed">
                  For your <strong className="text-finance-text">{userData.financialGoal}</strong> objective, we prioritized <strong className="text-finance-text">{userData.pref1}</strong> for long-term growth compounding, while <strong className="text-finance-text">{userData.pref2}</strong> and <strong className="text-finance-text">{userData.pref3}</strong> lower drawdown pressure in volatile cycles.
                </p>
                <p className="mt-2 text-sm text-finance-muted leading-relaxed">
                  With your current monthly investment pace of <strong className="text-finance-text">{formatInr(monthlyContribution)}</strong>, you are projected to reach <strong className="text-finance-text">{formatInr(projectedValue)}</strong> by year {new Date().getFullYear() + yearsToGoal}.
                </p>
                <p className="mt-3 text-xs text-finance-dim flex items-start gap-2">
                  {trajectory === "Slightly Behind" ? <TriangleAlert className="w-4 h-4 text-amber-300 mt-0.5" /> : <TrendingUp className="w-4 h-4 text-finance-green mt-0.5" />}
                  Educational projection only. Consult a certified planner for personal advice.
                </p>
              </section>
            </aside>
          </div>

          <section className="mt-10 rounded-2xl border border-finance-border/70 bg-[linear-gradient(145deg,rgba(30,35,56,0.9),rgba(18,22,36,0.86))] p-8 text-center transition-all duration-300 hover:border-finance-border-soft">
            <h2 className="text-4xl font-semibold text-finance-text">The Pravix Philosophy</h2>
            <p className="mx-auto mt-3 max-w-3xl text-finance-muted leading-relaxed">
              Wealth is more than a number. Your blueprint is designed for growth and resilience so your financial priorities stay protected across market cycles.
            </p>
            <button className="mt-6 rounded-lg border border-finance-accent/50 px-6 py-3 text-finance-accent font-medium hover:bg-finance-accent/10 transition-colors">
              Read Our Manifesto <ArrowUpRight className="inline h-4 w-4 ml-1" />
            </button>
          </section>
        </div>
      </div>
    </>
  );
}
