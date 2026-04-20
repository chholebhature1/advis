import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Compass,
  Landmark,
  Mail,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UserRoundCheck,
} from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import { absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Team Pravix",
  description:
    "Meet the Pravix leadership team and learn our vision for disciplined, goal-based wealth management for Indian families.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "Team Pravix | Vision, Leadership, and Advisory Team",
    description:
      "Meet the Pravix leadership team and learn our vision for disciplined, goal-based wealth management for Indian families.",
    url: absoluteUrl("/about"),
    type: "website",
    images: [
      {
        url: "/image/about-hero-family.webp",
        alt: "Pravix leadership and family-focused wealth planning",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Team Pravix | Vision, Leadership, and Advisory Team",
    description:
      "Meet the Pravix leadership team and learn our vision for disciplined, goal-based wealth management for Indian families.",
    images: ["/image/about-hero-family.webp"],
  },
};

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-finance-bg pb-16 pt-24">
        <div className="mx-auto w-full max-w-6xl px-6">
          <section className="relative overflow-hidden rounded-3xl border border-finance-border shadow-[0_18px_42px_rgba(10,25,48,0.16)]">
            <Image
              src="/image/about-hero-family.webp"
              alt="An Indian family reviewing financial plans together on a tablet at home"
              fill
              priority
              className="object-cover object-center"
              sizes="(min-width: 1024px) 1200px, 100vw"
            />
            <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(10,25,48,0.82)_0%,rgba(10,25,48,0.55)_48%,rgba(10,25,48,0.28)_100%)]" />
            <div className="relative z-10 flex min-h-[360px] items-end p-7 md:min-h-[460px] md:p-10">
              <div className="max-w-3xl rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-[2px] md:p-6">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#d6e6ff]">About Pravix</p>
                <h1 className="mt-2 text-3xl font-semibold leading-tight text-white md:text-5xl">
                  Where family goals become shared financial decisions
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#e3edf9] md:text-base">
                  This hero reflects the heart of Pravix: financial progress is strongest when families plan together.
                  We combine practical systems, clear guidance, and disciplined execution so households can move from
                  uncertainty to confident long-term wealth building.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-8 relative overflow-hidden rounded-3xl border border-finance-border bg-finance-panel p-8 md:p-10">
            <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-finance-accent/10 blur-2xl" />
            <div className="grid gap-6 md:grid-cols-[1.25fr_0.75fr] md:items-stretch">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-finance-muted">Director&apos;s Vision</p>
                <blockquote className="mt-3 border-l-2 border-finance-accent pl-4 text-finance-text">
                  <p className="text-lg leading-relaxed md:text-xl">
                    &quot;Our vision at Pravix is to make high-quality wealth strategy accessible, structured, and actionable for
                    every Indian family. We want investors to move from confusion to confidence by using disciplined systems,
                    not market speculation. Pravix is being built as a long-term partner in financial decision-making, where
                    technology and expert judgment work together for meaningful outcomes.&quot;
                  </p>
                </blockquote>
                <p className="mt-3 text-sm font-semibold text-finance-text">- Umesh Kumar Sharma, Director</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-finance-border bg-white/80 p-3">
                    <p className="text-[10px] uppercase tracking-[0.1em] text-finance-muted">Core Focus</p>
                    <p className="mt-1 text-sm font-semibold text-finance-text">Goal-first wealth systems</p>
                  </div>
                  <div className="rounded-xl border border-finance-border bg-white/80 p-3">
                    <p className="text-[10px] uppercase tracking-[0.1em] text-finance-muted">Approach</p>
                    <p className="mt-1 text-sm font-semibold text-finance-text">Data + expert judgement</p>
                  </div>
                  <div className="rounded-xl border border-finance-border bg-white/80 p-3">
                    <p className="text-[10px] uppercase tracking-[0.1em] text-finance-muted">Outcome</p>
                    <p className="mt-1 text-sm font-semibold text-finance-text">Confidence through discipline</p>
                  </div>
                </div>
              </div>

              <article className="group overflow-hidden rounded-2xl border border-finance-border bg-white shadow-[0_14px_32px_rgba(10,25,48,0.10)]">
                <div className="relative aspect-[4/5] overflow-hidden">
                  <Image
                    src="/image/about-umesh-kumar-sharma.jpg"
                    alt="Umesh Kumar Sharma, Director of Pravix"
                    fill
                    className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
                    sizes="(min-width: 1024px) 28vw, 100vw"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,25,48,0.05)_0%,rgba(10,25,48,0.45)_100%)]" />
                  <span className="absolute left-3 top-3 inline-flex items-center rounded-full border border-white/35 bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white backdrop-blur-sm">
                    Director
                  </span>
                  <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                    <p className="text-xl font-semibold">Umesh Kumar Sharma</p>
                    <p className="text-xs uppercase tracking-[0.12em] text-[#d8e5ff]">Vision & Platform Strategy</p>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <section className="mt-8 rounded-3xl border border-finance-border bg-[linear-gradient(160deg,#f7f9fc_0%,#eef4ff_100%)] p-8 md:p-10">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-finance-muted">Leadership & Advisory Team</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-finance-text">Experienced. Accountable. Family-first.</h2>
              </div>
              <p className="max-w-md text-sm leading-relaxed text-finance-muted">
                Pravix blends long-term strategic guidance with practical tax advisory support, giving families and professionals
                a clear path from planning to execution.
              </p>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <article className="group overflow-hidden rounded-2xl border border-finance-border bg-white shadow-[0_16px_36px_rgba(10,25,48,0.10)]">
                <div className="relative aspect-[5/4] overflow-hidden">
                  <Image
                    src="/image/about-umesh-kumar-sharma.jpg"
                    alt="Umesh Kumar Sharma in Pravix office"
                    fill
                    className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]"
                    sizes="(min-width: 1024px) 40vw, 100vw"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,25,48,0)_28%,rgba(10,25,48,0.58)_100%)]" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/12 px-2.5 py-1 text-[11px] uppercase tracking-[0.09em] text-[#dbe8ff]">
                      <BriefcaseBusiness className="h-3.5 w-3.5" />
                      Director
                    </div>
                    <h3 className="mt-2 text-2xl font-semibold">Umesh Kumar Sharma</h3>
                    <p className="mt-1 text-sm text-[#e0ebff]">Leads strategic direction and long-horizon execution at Pravix.</p>
                  </div>
                </div>
                <div className="grid gap-2 p-5 sm:grid-cols-2">
                  <div className="rounded-lg border border-finance-border bg-finance-surface/70 p-3">
                    <p className="text-[10px] uppercase tracking-[0.1em] text-finance-muted">Specialty</p>
                    <p className="mt-1 text-sm font-semibold text-finance-text">Family wealth strategy</p>
                  </div>
                  <div className="rounded-lg border border-finance-border bg-finance-surface/70 p-3">
                    <p className="text-[10px] uppercase tracking-[0.1em] text-finance-muted">Working Style</p>
                    <p className="mt-1 text-sm font-semibold text-finance-text">Disciplined, systems-led</p>
                  </div>
                </div>
              </article>

              <article className="group overflow-hidden rounded-2xl border border-finance-border bg-white shadow-[0_16px_36px_rgba(10,25,48,0.10)]">
                <div className="relative aspect-[5/4] overflow-hidden">
                  <Image
                    src="/image/aditya-saini-profile-2026.jpg"
                    alt="Aditya Saini, Advocate and Tax Consultant"
                    fill
                    className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.04]"
                    sizes="(min-width: 1024px) 40vw, 100vw"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,25,48,0)_28%,rgba(10,25,48,0.58)_100%)]" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/12 px-2.5 py-1 text-[11px] uppercase tracking-[0.09em] text-[#dbe8ff]">
                      <Landmark className="h-3.5 w-3.5" />
                      Advocate & Tax Consultant
                    </div>
                    <h3 className="mt-2 text-2xl font-semibold">Aditya Saini</h3>
                    <p className="mt-1 text-sm text-[#e0ebff]">B.Sc, LLB. Supports compliant, practical tax planning for users.</p>
                  </div>
                </div>
                <div className="p-5">
                  <div className="inline-flex items-center gap-2 rounded-full border border-finance-border bg-finance-surface/75 px-3 py-1 text-xs text-finance-muted">
                    <Mail className="h-3.5 w-3.5" />
                    adv.aaditya00@gmail.com
                  </div>
                  <ul className="mt-4 space-y-2">
                    {[
                      "Tax-aware planning and compliance support",
                      "Practical interpretation of taxation pathways",
                      "Review of tax optimization strategy for users",
                    ].map((point) => (
                      <li key={point} className="flex items-start gap-2 text-sm text-finance-muted">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-finance-accent" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            </div>
          </section>

          <section className="mt-8 rounded-3xl border border-finance-border bg-finance-panel p-8 shadow-[0_18px_40px_rgba(10,25,48,0.08)] md:p-10">
            <p className="text-[11px] uppercase tracking-[0.2em] text-finance-muted">About Pravix</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-finance-text md:text-5xl">
              Building disciplined wealth outcomes for Indian households
            </h2>
            <p className="mt-4 max-w-4xl text-base leading-relaxed text-finance-muted md:text-lg">
              Pravix is a goal-based wealth intelligence platform designed for Indian investors who want clarity, consistency,
              and confidence. We combine data signals, practical planning systems, and human advisory context so users can
              move from reactive money decisions to structured long-term wealth creation.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-finance-border bg-white p-3.5">
                <p className="text-[10px] uppercase tracking-[0.1em] text-finance-muted">Goal Lens</p>
                <p className="mt-1 text-base font-semibold text-finance-text">100%</p>
                <p className="mt-1 text-xs text-finance-muted">Recommendations mapped to outcomes</p>
              </div>
              <div className="rounded-xl border border-finance-border bg-white p-3.5">
                <p className="text-[10px] uppercase tracking-[0.1em] text-finance-muted">Execution Rhythm</p>
                <p className="mt-1 text-base font-semibold text-finance-text">Monthly</p>
                <p className="mt-1 text-xs text-finance-muted">Checklist-first action framework</p>
              </div>
              <div className="rounded-xl border border-finance-border bg-white p-3.5">
                <p className="text-[10px] uppercase tracking-[0.1em] text-finance-muted">Guidance Style</p>
                <p className="mt-1 text-base font-semibold text-finance-text">Human + AI</p>
                <p className="mt-1 text-xs text-finance-muted">Transparent and context-driven</p>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-5 md:grid-cols-3">
            <article className="rounded-2xl border border-finance-border bg-white p-5">
              <ShieldCheck className="h-5 w-5 text-finance-accent" />
              <h2 className="mt-3 text-lg font-semibold text-finance-text">Trust-first architecture</h2>
              <p className="mt-2 text-sm leading-relaxed text-finance-muted">
                We prioritize privacy, secure user-scoped context, and transparent reasoning so financial guidance remains
                responsible and dependable.
              </p>
            </article>
            <article className="rounded-2xl border border-finance-border bg-white p-5">
              <Target className="h-5 w-5 text-finance-accent" />
              <h2 className="mt-3 text-lg font-semibold text-finance-text">Goal-centric design</h2>
              <p className="mt-2 text-sm leading-relaxed text-finance-muted">
                Every recommendation is mapped to real outcomes: retirement readiness, tax efficiency, portfolio balance,
                and monthly execution quality.
              </p>
            </article>
            <article className="rounded-2xl border border-finance-border bg-white p-5">
              <TrendingUp className="h-5 w-5 text-finance-accent" />
              <h2 className="mt-3 text-lg font-semibold text-finance-text">Execution over noise</h2>
              <p className="mt-2 text-sm leading-relaxed text-finance-muted">
                Our philosophy is simple: better behavior drives better outcomes. Pravix helps users follow clear action
                plans instead of reacting to daily market noise.
              </p>
            </article>
          </section>

          <section className="mt-8 rounded-3xl border border-finance-border bg-finance-panel p-8 md:p-10">
            <p className="text-[11px] uppercase tracking-[0.16em] text-finance-muted">Who We Serve</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-finance-text">Built for real Indian financial lives</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <article className="rounded-2xl border border-finance-border bg-white p-5">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-finance-accent/10 text-finance-accent">
                  <UserRoundCheck className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-finance-text">Salaried professionals and young families</h3>
                <p className="mt-2 text-sm leading-relaxed text-finance-muted">
                  Users balancing income growth, EMI commitments, school and family responsibilities, and long-term goals
                  like retirement and wealth protection.
                </p>
              </article>
              <article className="rounded-2xl border border-finance-border bg-white p-5">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-finance-accent/10 text-finance-accent">
                  <Compass className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-finance-text">Investors seeking structure, not noise</h3>
                <p className="mt-2 text-sm leading-relaxed text-finance-muted">
                  Users who want practical monthly actions, better tax timing, and portfolio discipline instead of
                  headline-driven decisions.
                </p>
              </article>
            </div>
          </section>

          <section className="mt-8 rounded-3xl border border-finance-border bg-finance-panel p-8 md:p-10">
            <p className="text-[11px] uppercase tracking-[0.16em] text-finance-muted">How Pravix Works</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-finance-text">Our operating methodology</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <article className="rounded-2xl border border-finance-border bg-white p-5">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-finance-accent/10 text-finance-accent">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-finance-text">1) Capture context</h3>
                <p className="mt-2 text-sm leading-relaxed text-finance-muted">
                  We map user goals, horizon, income-expense profile, risk comfort, and holdings context to build a clear
                  baseline before recommendations.
                </p>
              </article>
              <article className="rounded-2xl border border-finance-border bg-white p-5">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-finance-accent/10 text-finance-accent">
                  <Target className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-finance-text">2) Prioritize actions</h3>
                <p className="mt-2 text-sm leading-relaxed text-finance-muted">
                  The system ranks what needs attention first across goal gap, concentration risk, alert pipeline health,
                  and tax runway so users know where to act now.
                </p>
              </article>
              <article className="rounded-2xl border border-finance-border bg-white p-5">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-finance-accent/10 text-finance-accent">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-finance-text">3) Execute monthly</h3>
                <p className="mt-2 text-sm leading-relaxed text-finance-muted">
                  Users follow a monthly execution rhythm with checklist-based actions, visibility into progress, and
                  structured intervention signals.
                </p>
              </article>
              <article className="rounded-2xl border border-finance-border bg-white p-5">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-finance-accent/10 text-finance-accent">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-finance-text">4) Improve continuously</h3>
                <p className="mt-2 text-sm leading-relaxed text-finance-muted">
                  Recommendations evolve with updated profile data, market context, and user behavior to improve long-term
                  decision quality over time.
                </p>
              </article>
            </div>
          </section>

          <section className="mt-8 rounded-3xl border border-finance-border bg-finance-panel p-8 md:p-10">
            <p className="text-[11px] uppercase tracking-[0.16em] text-finance-muted">Trust & Responsibility</p>
            <ul className="mt-4 space-y-2">
              {[
                "Educational and planning-first guidance with transparent recommendation logic.",
                "User-specific context handling with privacy-aware design principles.",
                "Risk-aware communication focused on suitability and long-term discipline.",
                "Clear distinction between guidance support and guaranteed outcome claims.",
              ].map((point) => (
                <li key={point} className="flex items-start gap-2 text-sm text-finance-muted">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-finance-accent" />
                  {point}
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-8 rounded-2xl border border-finance-border bg-white p-8 text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-finance-text">Start your wealth journey with clarity</h2>
            <p className="mt-3 text-finance-muted">
              Build your profile, map your goals, and get a disciplined action roadmap through Pravix.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/create-account"
                className="inline-flex items-center gap-2 rounded-full bg-finance-accent px-5 py-3 text-sm font-semibold text-white hover:brightness-95"
              >
                Create Account
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center rounded-full border border-finance-border px-5 py-3 text-sm font-semibold text-finance-text hover:bg-finance-surface"
              >
                Explore Dashboard
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
