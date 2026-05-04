import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calculator, TrendingUp, ShieldCheck, Target } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import { absoluteUrl, faqJsonLd, breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "SIP Calculator India — Plan Your Systematic Investment",
  description:
    "Learn how SIP investing works and plan your wealth growth with Pravix. Understand returns, monthly investment strategies, and build a disciplined savings habit for your financial goals in India.",
  keywords: [
    "SIP calculator India",
    "SIP calculator",
    "systematic investment plan calculator",
    "mutual fund SIP calculator",
    "SIP return calculator",
    "monthly SIP calculator India",
    "Pravix SIP calculator",
    "best SIP calculator",
    "SIP investment planner",
  ],
  alternates: { canonical: "/sip-calculator" },
  openGraph: {
    title: "SIP Calculator India — Smart Investment Planning | Pravix",
    description:
      "Project your wealth growth with Pravix SIP calculator. Estimate returns, plan monthly investments, and achieve your financial goals.",
    url: absoluteUrl("/sip-calculator"),
    type: "website",
  },
};

const faqs = [
  {
    question: "What is a SIP calculator?",
    answer:
      "A SIP calculator is a financial tool that estimates the future value of your Systematic Investment Plan (SIP) based on your monthly investment amount, expected rate of return, and investment duration. It uses the compound interest formula to project your wealth growth over time.",
  },
  {
    question: "How much should I invest in SIP per month?",
    answer:
      "The ideal SIP amount depends on your financial goals, current income, and expenses. A common guideline is to invest 20-30% of your monthly income. Pravix helps you calculate the exact SIP amount needed based on your specific goal — whether it is retirement, a child's education, or buying a home.",
  },
  {
    question: "What returns can I expect from SIP investments in India?",
    answer:
      "Historical returns for equity mutual funds in India have averaged 12-15% annually over 10+ year periods. However, returns vary based on market conditions, fund selection, and investment horizon. Debt funds typically return 6-8% annually. Pravix factors in your risk profile to provide realistic projections.",
  },
  {
    question: "Is SIP better than lump sum investing?",
    answer:
      "SIP offers rupee cost averaging, which reduces the impact of market volatility by spreading your investments over time. For most salaried individuals, SIP is more practical as it aligns with monthly income. However, lump sum can outperform SIP in steadily rising markets. Pravix analyzes both approaches for your specific situation.",
  },
  {
    question: "How does Pravix SIP planning differ from other calculators?",
    answer:
      "Unlike basic SIP calculators, Pravix provides goal-based planning that considers your complete financial picture — income, expenses, existing savings, risk profile, and inflation. It generates a personalized allocation across equity, debt, gold, and liquid assets, with scenario analysis showing conservative, moderate, and optimistic outcomes.",
  },
];

export default function SipCalculatorPage() {
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
              { name: "SIP Calculator", url: absoluteUrl("/sip-calculator") },
            ]),
          ),
        }}
      />

      <div className="mx-auto w-full max-w-4xl px-6 py-16 md:px-10 md:py-24">
        {/* Hero */}
        <div className="text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#d8e7ff] bg-[#eef4ff] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#2b5cff]">
            <Calculator className="h-3.5 w-3.5" />
            SIP Calculator India
          </div>
          <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-[#0a1930] sm:text-5xl">
            SIP Calculator — Plan Your{" "}
            <span className="bg-[linear-gradient(120deg,#2b5cff,#0099ff)] bg-clip-text text-transparent">
              Systematic Investment
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-[#50607d]">
            Estimate how your monthly SIP grows over time. Use Pravix to go beyond simple projections — get
            a personalized, goal-based investment plan built for Indian families.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/onboarding"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-[#2b5cff] px-7 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(43,92,255,0.3)] transition-transform hover:-translate-y-0.5"
            >
              Start Your Free SIP Plan
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/learn"
              className="inline-flex h-12 items-center gap-2 rounded-full border border-[#d8e7ff] bg-white px-7 text-sm font-semibold text-[#0a1930] transition-colors hover:bg-[#f5f8ff]"
            >
              Learn About SIP Investing
            </Link>
          </div>
        </div>

        {/* What is SIP */}
        <section className="mt-20">
          <h2 className="text-2xl font-bold text-[#0a1930] sm:text-3xl">
            What is a Systematic Investment Plan (SIP)?
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#50607d]">
            A Systematic Investment Plan (SIP) is a disciplined method of investing a fixed amount in mutual
            funds at regular intervals — typically monthly. SIP allows Indian investors to benefit from
            <strong> rupee cost averaging</strong> and the <strong>power of compounding</strong>, making it
            one of the most effective wealth-building strategies available today.
          </p>
          <p className="mt-3 text-base leading-relaxed text-[#50607d]">
            Whether you are saving for retirement, your child&apos;s education, or buying a home, SIP provides a
            structured path to achieve your financial goals without trying to time the market. With as little
            as ₹500 per month, anyone can start building wealth through SIP investments in India.
          </p>
        </section>

        {/* How SIP Calculator Works */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-[#0a1930] sm:text-3xl">
            How Does a SIP Calculator Work?
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#50607d]">
            A SIP calculator uses the <strong>future value of annuity formula</strong> to project your
            investment growth. It takes three key inputs:
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              { icon: Calculator, title: "Monthly Amount", desc: "The fixed amount you invest each month via SIP" },
              { icon: TrendingUp, title: "Expected Return", desc: "Annualized return rate based on fund category and historical data" },
              { icon: Target, title: "Investment Duration", desc: "Number of years you plan to stay invested" },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-[#e1ebff] bg-white p-5"
              >
                <item.icon className="h-6 w-6 text-[#2b5cff]" />
                <h3 className="mt-3 text-sm font-bold text-[#0a1930]">{item.title}</h3>
                <p className="mt-1.5 text-sm text-[#586987]">{item.desc}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-base leading-relaxed text-[#50607d]">
            The formula accounts for compounding at regular intervals, showing how small monthly investments
            can grow into substantial wealth over 10, 15, or 20+ years. For example, investing ₹10,000/month
            at 12% annual returns for 20 years can grow to approximately ₹1 crore.
          </p>
        </section>

        {/* Why Pravix */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-[#0a1930] sm:text-3xl">
            Why Use Pravix Instead of a Basic SIP Calculator?
          </h2>
          <div className="mt-6 space-y-4">
            {[
              {
                title: "Goal-Based Planning",
                desc: "Pravix does not just calculate returns — it builds a complete plan based on your specific financial goal, timeline, and risk tolerance.",
              },
              {
                title: "Smart Asset Allocation",
                desc: "Get a personalized split across equity, debt, gold, and liquid assets based on your risk profile and investment horizon.",
              },
              {
                title: "Scenario Analysis",
                desc: "See conservative, moderate, and optimistic outcomes for your plan — not just a single number.",
              },
              {
                title: "Feasibility Check",
                desc: "Pravix tells you whether your goal is achievable with your current income and suggests actionable strategies if there is a gap.",
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

        {/* FAQ Section */}
        <section className="mt-20">
          <h2 className="text-2xl font-bold text-[#0a1930] sm:text-3xl">
            Frequently Asked Questions About SIP
          </h2>
          <div className="mt-6 space-y-5">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-xl border border-[#e1ebff] bg-white"
              >
                <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-[#0a1930] transition-colors hover:text-[#2b5cff]">
                  {faq.question}
                </summary>
                <p className="px-5 pb-4 text-sm leading-relaxed text-[#586987]">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mt-20 rounded-2xl bg-[linear-gradient(135deg,#0a1930,#162950)] p-10 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Ready to Build Your Personalized SIP Plan?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-blue-100/80">
            Go beyond basic calculations. Start your free financial plan with Pravix and
            get a goal-based investment strategy tailored to your life.
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
