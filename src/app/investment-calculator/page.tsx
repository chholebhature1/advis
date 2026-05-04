import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calculator, BarChart3, ShieldCheck, TrendingUp } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import { absoluteUrl, faqJsonLd, breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Investment Calculator India — Project Your Wealth Growth",
  description:
    "Understand investment returns across equity, debt, and gold in India. Learn how Pravix helps you project wealth growth for SIP, lump sum, and goal-based investments.",
  keywords: [
    "investment calculator India",
    "investment calculator",
    "mutual fund calculator",
    "lump sum calculator India",
    "investment return calculator",
    "wealth growth calculator",
    "Pravix investment calculator",
    "compound interest calculator India",
    "goal-based investment calculator",
  ],
  alternates: { canonical: "/investment-calculator" },
  openGraph: {
    title: "Investment Calculator India — Smart Wealth Projections | Pravix",
    description:
      "Project your wealth growth across equity, debt, gold and more. Goal-based investment calculations for Indian investors.",
    url: absoluteUrl("/investment-calculator"),
    type: "website",
  },
};

const faqs = [
  {
    question: "How is an investment calculator different from a SIP calculator?",
    answer:
      "A SIP calculator focuses on regular monthly investments and their future value. An investment calculator is broader — it can handle lump sum investments, step-up SIPs, mixed portfolios with different asset classes, and factor in variables like inflation, tax implications, and varying return rates for equity, debt, gold, and liquid assets.",
  },
  {
    question: "What returns should I assume for different asset classes in India?",
    answer:
      "Historical long-term returns in India: Equity (large-cap mutual funds) 10-14% annually, Debt funds 6-8%, Gold 8-10%, Liquid/FD 4-6%. Pravix automatically assigns return assumptions based on your risk profile — conservative, moderate, or aggressive — so you get realistic projections.",
  },
  {
    question: "How does inflation affect my investment calculations?",
    answer:
      "Inflation erodes purchasing power over time. At 6% inflation, ₹1 crore today would be worth only about ₹55 lakh in real terms after 10 years. Pravix factors in inflation when calculating your goal corpus, ensuring your target amount reflects future purchasing power, not just today's value.",
  },
  {
    question: "Can I calculate returns for a diversified portfolio?",
    answer:
      "Yes. Unlike basic calculators that assume a single return rate, Pravix calculates returns for a diversified portfolio across equity, debt, gold, and liquid assets. The blended return is automatically computed based on your asset allocation and risk profile, giving you a more accurate projection.",
  },
  {
    question: "Should I invest lump sum or through SIP?",
    answer:
      "For most salaried individuals, SIP is recommended as it provides rupee cost averaging and aligns with monthly income. Lump sum works well for windfall gains or when markets are significantly undervalued. Pravix can analyze both approaches and suggest the optimal strategy for your situation.",
  },
];

const calculatorTypes = [
  {
    title: "SIP Return Calculator",
    desc: "Calculate how regular monthly investments compound over time. See the power of disciplined SIP investing across 5, 10, 15, and 20-year horizons.",
  },
  {
    title: "Lump Sum Growth Calculator",
    desc: "Project how a one-time investment grows. Ideal for planning windfall investments, bonus allocations, or inheritance deployment.",
  },
  {
    title: "Goal-Based Calculator",
    desc: "Start with your goal amount and timeline, then work backward to find the monthly investment needed. Factor in existing savings and inflation.",
  },
  {
    title: "Multi-Asset Portfolio Calculator",
    desc: "Calculate returns for a diversified portfolio across equity, debt, gold, and liquid assets with realistic per-asset return assumptions.",
  },
];

export default function InvestmentCalculatorPage() {
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
              { name: "Investment Calculator", url: absoluteUrl("/investment-calculator") },
            ]),
          ),
        }}
      />

      <div className="mx-auto w-full max-w-4xl px-6 py-16 md:px-10 md:py-24">
        {/* Hero */}
        <div className="text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#d8e7ff] bg-[#eef4ff] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#2b5cff]">
            <Calculator className="h-3.5 w-3.5" />
            Investment Calculator India
          </div>
          <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-[#0a1930] sm:text-5xl">
            Investment Calculator —{" "}
            <span className="bg-[linear-gradient(120deg,#2b5cff,#0099ff)] bg-clip-text text-transparent">
              Project Your Wealth
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-[#50607d]">
            Go beyond simple return calculations. Pravix provides goal-based investment projections
            with multi-asset allocation, scenario analysis, and inflation-adjusted targets for Indian investors.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/onboarding"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-[#2b5cff] px-7 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(43,92,255,0.3)] transition-transform hover:-translate-y-0.5"
            >
              Get Your Investment Plan Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/sip-calculator"
              className="inline-flex h-12 items-center gap-2 rounded-full border border-[#d8e7ff] bg-white px-7 text-sm font-semibold text-[#0a1930] transition-colors hover:bg-[#f5f8ff]"
            >
              Try SIP Calculator
            </Link>
          </div>
        </div>

        {/* Types of Calculators */}
        <section className="mt-20">
          <h2 className="text-2xl font-bold text-[#0a1930] sm:text-3xl">
            Types of Investment Calculations
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#50607d]">
            Different investment scenarios require different calculation approaches. Pravix handles
            all of them within a single, unified planning engine.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {calculatorTypes.map((calc) => (
              <div key={calc.title} className="rounded-xl border border-[#e1ebff] bg-white p-5">
                <BarChart3 className="h-5 w-5 text-[#2b5cff]" />
                <h3 className="mt-3 text-sm font-bold text-[#0a1930]">{calc.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#586987]">{calc.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Understanding Returns */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-[#0a1930] sm:text-3xl">
            Understanding Investment Returns in India
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#50607d]">
            Investment returns in India vary significantly by asset class, time horizon, and market conditions.
            Using a single flat return rate — as most basic calculators do — gives you an incomplete picture.
          </p>
          <div className="mt-6 overflow-hidden rounded-xl border border-[#e1ebff]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f8faff]">
                  <th className="px-5 py-3 text-left font-semibold text-[#0a1930]">Asset Class</th>
                  <th className="px-5 py-3 text-left font-semibold text-[#0a1930]">10-Year Avg Return</th>
                  <th className="px-5 py-3 text-left font-semibold text-[#0a1930]">Risk Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e1ebff]">
                {[
                  { asset: "Equity (Large Cap)", ret: "10–14%", risk: "High" },
                  { asset: "Equity (Mid/Small Cap)", ret: "12–18%", risk: "Very High" },
                  { asset: "Debt (Bond Funds)", ret: "6–8%", risk: "Low-Medium" },
                  { asset: "Gold", ret: "8–10%", risk: "Medium" },
                  { asset: "Fixed Deposits", ret: "5–7%", risk: "Very Low" },
                  { asset: "Liquid Funds", ret: "4–6%", risk: "Very Low" },
                ].map((row) => (
                  <tr key={row.asset} className="bg-white">
                    <td className="px-5 py-3 text-[#0a1930]">{row.asset}</td>
                    <td className="px-5 py-3 font-medium text-[#2b5cff]">{row.ret}</td>
                    <td className="px-5 py-3 text-[#586987]">{row.risk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-[#8a99b5]">
            Note: Past performance does not guarantee future returns. Pravix uses conservative assumptions
            and provides scenario ranges to give you a realistic view.
          </p>
        </section>

        {/* Why Pravix */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-[#0a1930] sm:text-3xl">
            Why Pravix Beats Simple Investment Calculators
          </h2>
          <div className="mt-6 space-y-4">
            {[
              {
                title: "Multi-Asset Blended Returns",
                desc: "Instead of a single return rate, Pravix calculates a blended return based on your actual portfolio allocation across equity, debt, gold, and liquid assets.",
              },
              {
                title: "Inflation-Adjusted Goals",
                desc: "Your ₹1 crore goal today may need ₹1.8 crore in 10 years due to inflation. Pravix automatically adjusts your target.",
              },
              {
                title: "Feasibility Intelligence",
                desc: "Know whether your goal is comfortable, tight, stretched, or not viable — and get specific strategies to improve your odds.",
              },
              {
                title: "Step-Up SIP Optimization",
                desc: "See how increasing your SIP by just 10% annually can dramatically accelerate your wealth compared to a fixed SIP.",
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-3 rounded-xl border border-[#e1ebff] bg-[#f8faff] p-5">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#2b5cff]" />
                <div>
                  <h3 className="text-sm font-bold text-[#0a1930]">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-[#586987]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-20">
          <h2 className="text-2xl font-bold text-[#0a1930] sm:text-3xl">
            Investment Calculator FAQs
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
            Get Your Personalized Investment Projections
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-blue-100/80">
            Stop guessing with generic calculators. Get a complete, goal-based investment plan
            with multi-asset projections, scenario analysis, and actionable strategies.
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
