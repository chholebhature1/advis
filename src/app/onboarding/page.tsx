import type { Metadata } from "next";
import OnboardingForm from "@/components/OnboardingForm";
import OnboardingQuestionnairePlan from "@/components/OnboardingQuestionnairePlan";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Onboarding",
  description: "Complete your Pravix onboarding to receive personalized wealth guidance.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function OnboardingPage() {
  return (
    <>
      <SiteHeader />
      <div className="min-h-screen bg-finance-bg pt-24 pb-16">
        <div className="mx-auto w-full max-w-4xl px-6">
          <div className="mb-8">
            <h1 className="text-4xl md:text-6xl font-semibold leading-[1.02] tracking-tight text-finance-text">
              Let&apos;s craft your <span className="text-finance-accent">financial sovereignty.</span>
            </h1>
            <p className="mt-4 text-finance-muted text-base md:text-xl max-w-2xl">
              Provide your details to generate a bespoke investment roadmap tailored to your specific ambitions.
            </p>
          </div>
          <OnboardingForm />

          <OnboardingQuestionnairePlan />

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-finance-border/70 bg-finance-surface/70 p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-finance-green font-semibold">Secured Vault</p>
              <p className="mt-2 text-sm text-finance-muted leading-relaxed">
                Your data is encrypted using military-grade protocols. Pravix never sells personal information.
              </p>
            </div>
            <div className="rounded-xl border border-finance-border/70 bg-finance-surface/70 p-4">
              <p className="text-sm italic text-finance-muted">
                &quot;True wealth is the ability to fully experience life on your own terms.&quot;
              </p>
              <p className="mt-2 text-xs text-finance-text font-semibold">Marcus V., Chief Strategist</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
