import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, ShieldCheck, Sparkles, Target, TrendingUp } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import { absoluteUrl, faqJsonLd, breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Wealth Planning Tool — AI-Powered Financial Planning Platform",
  description:
    "Pravix wealth planning tool helps Indian families plan investments, track goals, and optimize portfolios. AI-powered asset allocation, scenario analysis, and personalized strategies.",
  keywords: [
    "wealth planning tool",
    "wealth planning platform India",
    "investment planning tool",
    "AI financial planning tool",
    "goal-based investing tool",
    "Pravix wealth planning",
    "best wealth management tool India",
    "portfolio planning tool",
    "financial goal tracker India",
  ],
  alternates: { canonical: "/wealth-planning-tool" },
  openGraph: {
    title: "Pravix Wealth Planning Tool — AI-Powered Financial Planning",
    description:
      "Plan investments, track goals, and optimize your portfolio with Pravix. Built for Indian families.",
    url: absoluteUrl("/wealth-planning-tool"),
    type: "website",
  },
};

const faqs = [
  {
    question: "What makes Pravix different from other wealth planning tools?",
    answer:
      "Pravix combines AI-powered financial analysis with India-specific context. Unlike generic calculators, it considers your complete financial picture — income, expenses, risk profile, tax regime, and life goals — to generate a holistic plan with smart asset allocation and scenario projections.",
  },
  {
    question: "Is Pravix free to use?",
    answer:
      "Yes, getting started with Pravix is completely free. You can complete the onboarding, receive your personalized financial plan, view your dashboard with goal tracking, scenario analysis, and market insights at no cost.",
  },
  {
    question: "How accurate are the projections from Pravix?",
    answer:
      "Pravix uses conservative assumptions based on historical Indian market data. It provides three scenarios — conservative, moderate, and optimistic — so you understand the range of possible outcomes. The engine factors in inflation, tax implications, and realistic return expectations for each asset class.",
  },
  {
    question: "Can I use Pravix for retirement planning?",
    answer:
      "Absolutely. Pravix excels at long-term goal planning including retirement. It calculates your required corpus considering inflation, estimates the monthly SIP needed, and suggests an asset allocation that evolves as you approach retirement — shifting from growth-oriented to capital-preservation strategies.",
  },
  {
    question: "Does Pravix replace a financial advisor?",
    answer:
      "Pravix is designed to complement professional financial advice. It provides the analytical framework, projections, and planning tools to help you make informed decisions. For complex situations like estate planning or tax-saving strategies, we recommend consulting with a qualified financial advisor.",
  },
];

const features = [
  {
    title: "Smart Asset Allocation",
    desc: "AI-driven portfolio split across equity, debt, gold, and liquid assets — calibrated to your risk profile and time horizon.",
    accent: "#2b5cff",
  },
  {
    title: "Scenario Projections",
    desc: "See conservative, moderate, and optimistic outcomes. Understand the range of possibilities before you invest a single rupee.",
    accent: "#00b4d8",
  },
  {
    title: "Goal Feasibility Analysis",
    desc: "Know instantly whether your financial goal is achievable, and get actionable strategies to close any gap.",
    accent: "#ff6b35",
  },
  {
    title: "Milestone Roadmap",
    desc: "Year-by-year wealth projection showing exactly where you will be at each stage of your investment journey.",
    accent: "#10b981",
  },
  {
    title: "Real-Time Market Context",
    desc: "Live market indicators integrated into your dashboard, so your plan is always grounded in reality.",
    accent: "#8b5cf6",
  },
  {
    title: "Behavioral Insights",
    desc: "Understand your investor archetype and receive personalized recommendations to improve your financial behavior.",
    accent: "#f59e0b",
  },
];

export default function WealthPlanningToolPage() {
  return (
    <>
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(faqs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: absoluteUrl("/") },
              { name: "Wealth Planning Tool", url: absoluteUrl("/wealth-planning-tool") },
            ]),
          ),
        }}
      />

      <div className="mx-auto w-full max-w-4xl px-6 py-16 md:px-10 md:py-24">
        {/* Hero */}
        <div className="text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#d8e7ff] bg-[#eef4ff] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#2b5cff]">
            <Sparkles className="h-3.5 w-3.5" />
            Wealth Planning Tool
          </div>
          <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-[#0a1930] sm:text-5xl">
            The Smartest{" "}
            <span className="bg-[linear-gradient(120deg,#2b5cff,#0099ff)] bg-clip-text text-transparent">
              Wealth Planning Tool
            </span>{" "}
            for India
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-[#50607d]">
            Pravix combines AI-powered financial analysis with India-specific market context to
            create a personalized wealth plan for your family. Plan, track, and optimize — all in one platform.
          </p>
          <Link
            href="/onboarding"
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-[#2b5cff] px-7 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(43,92,255,0.3)] transition-transform hover:-translate-y-0.5"
          >
            Try the Wealth Planning Tool Free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* What It Does */}
        <section className="mt-20">
          <h2 className="text-2xl font-bold text-[#0a1930] sm:text-3xl">
            What Does the Pravix Wealth Planning Tool Do?
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#50607d]">
            The Pravix wealth planning tool is a comprehensive <strong>goal-based financial planning platform</strong> designed
            specifically for Indian families. It goes beyond simple calculators to deliver a complete investment
            strategy — from understanding your financial position to generating a personalized action plan.
          </p>
          <p className="mt-3 text-base leading-relaxed text-[#50607d]">
            In under five minutes, the tool analyzes your income, expenses, existing savings, risk tolerance,
            and financial goals to produce a detailed plan with smart asset allocation, scenario projections,
            and a milestone roadmap. Every number is backed by the Pravix financial engine — a deterministic
            system that ensures consistent, transparent calculations.
          </p>
        </section>

        {/* Features Grid */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-[#0a1930] sm:text-3xl">
            Key Features of Pravix Wealth Planning
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-xl border border-[#e1ebff] bg-white p-5">
                <div
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${feature.accent}15` }}
                >
                  <BarChart3 className="h-4 w-4" style={{ color: feature.accent }} />
                </div>
                <h3 className="mt-3 text-sm font-bold text-[#0a1930]">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#586987]">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Who Is It For */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-[#0a1930] sm:text-3xl">
            Who Is This Wealth Planning Tool For?
          </h2>
          <div className="mt-6 space-y-3">
            {[
              "Salaried professionals planning for retirement, home, or children's education",
              "Young investors starting their first SIP and wanting a structured approach",
              "Families looking to optimize existing investments and reduce financial anxiety",
              "Business owners needing clarity on personal wealth separate from business assets",
              "NRIs planning investments in India with tax-efficient strategies",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-lg border border-[#e1ebff] bg-[#f8faff] p-4">
                <Target className="mt-0.5 h-4 w-4 shrink-0 text-[#2b5cff]" />
                <p className="text-sm text-[#50607d]">{item}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-20">
          <h2 className="text-2xl font-bold text-[#0a1930] sm:text-3xl">
            Common Questions About Pravix Wealth Planning
          </h2>
          <div className="mt-6 space-y-5">
            {faqs.map((faq) => (
              <details key={faq.question} className="group rounded-xl border border-[#e1ebff] bg-white">
                <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-[#0a1930] transition-colors hover:text-[#2b5cff]">
                  {faq.question}
                </summary>
                <p className="px-5 pb-4 text-sm leading-relaxed text-[#586987]">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mt-20 rounded-2xl bg-[linear-gradient(135deg,#0a1930,#162950)] p-10 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Start Planning Your Wealth Today
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-blue-100/80">
            It takes just 5 minutes to get your personalized financial plan. No payment required.
            No hidden fees. Just smart, goal-based wealth planning.
          </p>
          <Link
            href="/onboarding"
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-[#2b5cff] px-8 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(43,92,255,0.4)] transition-transform hover:-translate-y-0.5"
          >
            Start Your Financial Plan with Pravix
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </div>
    </>
  );
}
