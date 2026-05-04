import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Compass, ShieldCheck, Target, TrendingUp, Landmark } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import { absoluteUrl, faqJsonLd, breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Financial Planning in India — Complete Guide for Families",
  description:
    "Comprehensive financial planning guide for Indian families. Learn about goal-based investing, tax optimization, SIP strategies, and building long-term wealth with Pravix.",
  keywords: [
    "financial planning India",
    "financial planning for Indian families",
    "best financial planner India",
    "goal-based financial planning",
    "wealth planning India",
    "investment planning India",
    "tax planning India",
    "Pravix financial planning",
    "personal finance India",
  ],
  alternates: { canonical: "/financial-planning-india" },
  openGraph: {
    title: "Financial Planning in India — Goal-Based Wealth Guide | Pravix",
    description:
      "Complete guide to financial planning for Indian families. Goal-based investing, tax optimization, and disciplined wealth building.",
    url: absoluteUrl("/financial-planning-india"),
    type: "article",
  },
};

const faqs = [
  {
    question: "Why is financial planning important for Indian families?",
    answer:
      "Indian families face unique financial challenges — rising education costs, healthcare expenses, inflation at 6-7%, and the need to support multiple generations. A structured financial plan ensures you meet short-term needs while building long-term wealth through tax-efficient investments.",
  },
  {
    question: "How much should an Indian family save and invest?",
    answer:
      "Financial experts recommend saving at least 20-30% of monthly income. Of this, a portion should go toward emergency funds (6 months of expenses), and the rest into goal-linked investments through SIPs in mutual funds, PPF, NPS, or other instruments suited to your risk profile.",
  },
  {
    question: "What is goal-based financial planning?",
    answer:
      "Goal-based financial planning links every rupee you invest to a specific life goal — retirement, child's education, home purchase, or wealth creation. Instead of chasing returns, you define the amount needed, the timeline, and work backward to determine the monthly investment required.",
  },
  {
    question: "How does Pravix help with financial planning in India?",
    answer:
      "Pravix provides an AI-powered financial planning platform built specifically for Indian families. It analyzes your income, expenses, goals, and risk profile to create a personalized plan with smart asset allocation, scenario projections, and actionable steps — all free to start.",
  },
  {
    question: "When should I start financial planning?",
    answer:
      "The best time to start is now. Thanks to compounding, even small investments made early can grow substantially. A 25-year-old investing ₹5,000/month at 12% returns will accumulate approximately ₹3.2 crore by age 55 — while a 35-year-old with the same plan would accumulate only ₹1 crore.",
  },
];

export default function FinancialPlanningIndiaPage() {
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
              { name: "Financial Planning India", url: absoluteUrl("/financial-planning-india") },
            ]),
          ),
        }}
      />

      <div className="mx-auto w-full max-w-4xl px-6 py-16 md:px-10 md:py-24">
        {/* Hero */}
        <div className="text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#d8e7ff] bg-[#eef4ff] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#2b5cff]">
            <Compass className="h-3.5 w-3.5" />
            Financial Planning India
          </div>
          <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-[#0a1930] sm:text-5xl">
            Financial Planning for{" "}
            <span className="bg-[linear-gradient(120deg,#2b5cff,#0099ff)] bg-clip-text text-transparent">
              Indian Families
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-[#50607d]">
            A complete guide to building, protecting, and growing wealth in India. From SIP
            strategies to tax optimization — everything you need to secure your family&apos;s financial future.
          </p>
          <Link
            href="/onboarding"
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-[#2b5cff] px-7 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(43,92,255,0.3)] transition-transform hover:-translate-y-0.5"
          >
            Get Your Free Financial Plan
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Why Financial Planning */}
        <section className="mt-20">
          <h2 className="text-2xl font-bold text-[#0a1930] sm:text-3xl">
            Why Every Indian Family Needs a Financial Plan
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#50607d]">
            India&apos;s economic landscape presents both opportunities and challenges for families planning their
            financial future. With <strong>inflation averaging 6-7% annually</strong>, the purchasing power
            of idle savings erodes rapidly. Meanwhile, costs for education, healthcare, and housing continue
            to rise faster than general inflation.
          </p>
          <p className="mt-3 text-base leading-relaxed text-[#50607d]">
            A well-structured financial plan accounts for these realities by creating a disciplined investment
            strategy aligned with your specific life goals. Rather than reactive decision-making, financial
            planning gives Indian families a <strong>proactive framework</strong> for wealth building — one
            that adapts to changing market conditions while staying true to long-term objectives.
          </p>
        </section>

        {/* Pillars */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-[#0a1930] sm:text-3xl">
            The Five Pillars of Financial Planning in India
          </h2>
          <div className="mt-6 space-y-4">
            {[
              {
                icon: Target,
                title: "1. Goal Setting & Prioritization",
                desc: "Define clear financial goals — retirement corpus, children's education, home purchase, emergency fund — and prioritize them based on timeline and importance.",
              },
              {
                icon: TrendingUp,
                title: "2. Investment Strategy & Asset Allocation",
                desc: "Build a diversified portfolio across equity mutual funds, debt instruments, gold, and liquid assets — calibrated to your risk appetite and time horizon.",
              },
              {
                icon: Landmark,
                title: "3. Tax Planning & Optimization",
                desc: "Maximize Section 80C, 80D, NPS deductions, and choose between old and new tax regimes to keep more of what you earn.",
              },
              {
                icon: ShieldCheck,
                title: "4. Risk Management & Insurance",
                desc: "Ensure adequate term life cover, health insurance, and an emergency fund of 6-12 months expenses before aggressive investing.",
              },
              {
                icon: Compass,
                title: "5. Regular Review & Rebalancing",
                desc: "Revisit your plan annually or after major life events. Rebalance asset allocation to stay aligned with changing goals and market conditions.",
              },
            ].map((pillar) => (
              <div key={pillar.title} className="flex gap-4 rounded-xl border border-[#e1ebff] bg-[#f8faff] p-5">
                <pillar.icon className="mt-0.5 h-5 w-5 shrink-0 text-[#2b5cff]" />
                <div>
                  <h3 className="text-sm font-bold text-[#0a1930]">{pillar.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-[#586987]">{pillar.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How Pravix Helps */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-[#0a1930] sm:text-3xl">
            How Pravix Makes Financial Planning Simple
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#50607d]">
            Pravix is India&apos;s goal-based wealth planning platform that transforms complex financial
            decisions into a clear, actionable plan. Our AI-powered engine analyzes your complete financial
            picture — income, expenses, existing savings, risk profile, and life goals — to generate a
            personalized strategy in minutes.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              "Personalized asset allocation across equity, debt, gold & liquid",
              "Scenario analysis: conservative, moderate, and optimistic outcomes",
              "Feasibility analysis telling you if your goal is achievable",
              "Step-up SIP recommendations for accelerated wealth building",
              "Real-time market context integrated into your plan",
              "Milestone roadmap showing your progress year by year",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2.5 rounded-lg border border-[#e1ebff] bg-white p-4">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#2b5cff]" />
                <p className="text-sm text-[#50607d]">{item}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-20">
          <h2 className="text-2xl font-bold text-[#0a1930] sm:text-3xl">
            Financial Planning FAQs for Indian Families
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
            Start Your Financial Planning Journey Today
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-blue-100/80">
            Start planning your family&apos;s financial future with Pravix.
            It takes just 5 minutes to get your personalized financial plan.
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
