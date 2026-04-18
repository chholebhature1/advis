import type { Metadata } from "next";
import OnboardingForm from "@/components/OnboardingForm";
import SiteHeader from "@/components/SiteHeader";
import { ShieldCheck, Sparkles, TimerReset } from "lucide-react";

export const metadata: Metadata = {
  title: "Onboarding",
  description: "Answer a few quick questions and get your personalized investment plan.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function OnboardingPage() {
  return (
    <>
      <SiteHeader />
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#f2f7ff] via-[#ecf4ff] to-[#e5f1ff] pb-16 pt-24">
        <div className="pointer-events-none absolute -left-20 top-24 h-72 w-72 rounded-full bg-[#8eb0ff]/25 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 top-44 h-72 w-72 rounded-full bg-[#5ad5ff]/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-16 left-1/3 h-72 w-72 rounded-full bg-[#b7cfff]/22 blur-3xl" />

        <div className="relative mx-auto w-full max-w-6xl px-5 sm:px-6">
          <div className="mb-7 rounded-[30px] border border-white/60 bg-white/82 p-6 shadow-[0_22px_48px_rgba(16,47,103,0.12)] backdrop-blur-sm md:p-7">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#c9daf9] bg-[#f4f8ff] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.13em] text-finance-muted">
              <Sparkles className="h-3.5 w-3.5 text-finance-accent" />
              Goal-Based Onboarding
            </p>

            <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-finance-text md:text-5xl">
              Build a money plan that feels
              <span className="block bg-gradient-to-r from-[#2b5cff] to-[#00beff] bg-clip-text text-transparent">
                bold, clear, and made for you.
              </span>
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-finance-muted md:text-base">
              In a few quick steps, Pravix captures your goals, timeline, and comfort with risk to craft a strategy that is
              personalized from day one.
            </p>

            <div className="mt-4 flex flex-wrap gap-2.5">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d4e2fb] bg-white px-3.5 py-2 text-xs font-semibold text-finance-text shadow-[0_8px_16px_rgba(16,47,103,0.08)]">
                <TimerReset className="h-3.5 w-3.5 text-finance-accent" />
                Around 7 minutes
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d4e2fb] bg-white px-3.5 py-2 text-xs font-semibold text-finance-text shadow-[0_8px_16px_rgba(16,47,103,0.08)]">
                <ShieldCheck className="h-3.5 w-3.5 text-finance-accent" />
                Secure and private
              </div>
            </div>
          </div>

          <OnboardingForm />
        </div>
      </div>
    </>
  );
}
