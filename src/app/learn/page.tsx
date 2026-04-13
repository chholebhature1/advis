import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";

const journeySteps = [
  {
    label: "Step 01",
    title: "Basic Profile",
    body: "Establish your digital wealth identity with encrypted protocols so your plan starts on a secure and trustworthy foundation.",
    points: ["Bank-grade encryption protocols", "Zero-knowledge data storage"],
  },
  {
    label: "Step 02",
    title: "Goals & Preferences",
    body: "Define your timeline, risk tolerance, and financial priorities to shape a strategy that reflects your personal ambitions.",
    points: ["Conservative to growth options", "Goal-led allocation framework"],
  },
  {
    label: "Step 03",
    title: "Personalized Suggestions",
    body: "Pravix analyzes your profile against live market signals and presents a practical, goal-aligned investment blueprint.",
    points: ["Live data signal mapping", "Scenario-backed recommendations"],
  },
  {
    label: "Final Touch",
    title: "Expert Consultation",
    body: "Partner with an investment specialist to validate assumptions, refine allocation, and plan execution with confidence.",
    points: ["1-on-1 strategy call", "Actionable next steps"],
  },
];

export default function LearnPage() {
  return (
    <>
      <SiteHeader />
      <div className="min-h-screen bg-finance-bg pt-24 pb-16">
        <div className="mx-auto max-w-6xl px-6">
          <section className="text-center max-w-4xl mx-auto">
            <p className="text-[11px] uppercase tracking-[0.2em] text-finance-muted">The Pravix Journey</p>
            <h1 className="mt-3 text-5xl md:text-7xl font-semibold leading-[1.02] tracking-tight text-finance-text">
              The Path to <span className="text-finance-green">Financial Clarity</span>
            </h1>
            <p className="mt-5 text-finance-muted text-lg">
              Wealth planning for every Indian. Algorithmic precision, expert oversight, and disciplined execution.
            </p>
          </section>

          <section className="relative mt-16">
            <div className="absolute left-1/2 top-2 bottom-2 w-px -translate-x-1/2 bg-finance-border/70 hidden md:block" />
            <div className="space-y-10">
              {journeySteps.map((step, idx) => (
                <article key={step.title} className="grid md:grid-cols-2 gap-6 items-center">
                  <div className={idx % 2 === 0 ? "md:order-1" : "md:order-2"}>
                    <div className="rounded-2xl border border-finance-border/70 bg-finance-panel p-6">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-finance-green">{step.label}</p>
                      <h2 className="mt-2 text-3xl font-semibold text-finance-text">{step.title}</h2>
                      <p className="mt-3 text-finance-muted leading-relaxed">{step.body}</p>
                      <ul className="mt-5 space-y-2">
                        {step.points.map((point) => (
                          <li key={point} className="flex items-center gap-2 text-sm text-finance-muted">
                            <CheckCircle2 className="w-4 h-4 text-finance-green" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className={idx % 2 === 0 ? "md:order-2" : "md:order-1"}>
                    <div className="h-full min-h-48 rounded-2xl border border-finance-border/70 bg-finance-surface/80 p-6 flex items-center justify-center">
                      <div className="w-full rounded-xl border border-finance-border/70 bg-finance-bg/75 p-4">
                        <div className="h-2 w-24 rounded bg-finance-border mb-3" />
                        <div className="h-2 w-40 rounded bg-finance-border mb-3" />
                        <div className="h-2 w-32 rounded bg-finance-border" />
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-16 rounded-2xl border border-finance-border/70 bg-finance-panel p-8 text-center">
            <h2 className="text-4xl font-semibold text-finance-text">Ready to secure your legacy?</h2>
            <p className="mt-3 text-finance-muted">Join investors moving from uncertainty to disciplined wealth creation.</p>
            <div className="mt-7 flex flex-wrap justify-center gap-4">
              <Link href="/onboarding" className="inline-flex items-center gap-2 rounded-lg bg-finance-accent px-6 py-3 text-white font-semibold shadow-[0_8px_20px_rgba(43,92,255,0.22)] hover:brightness-95">
                Get Started Now
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-lg border border-finance-border-soft px-6 py-3 text-finance-text hover:bg-finance-surface/80">
                View Dashboard
              </Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

