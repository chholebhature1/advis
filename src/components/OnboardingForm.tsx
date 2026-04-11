"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ONBOARDING_QUESTIONNAIRE_FLOW, type OnboardingField } from "@/lib/onboarding/questionnaire-flow";
import type { TaxOptimizationSummary } from "@/lib/agent/tax-optimization";

type FieldValue = string | boolean;
type Answers = Record<string, FieldValue>;

type ExistingSessionRow = {
  id: string;
  current_screen_id: string | null;
};

type PersistedResponseRow = {
  response_data: Record<string, unknown> | null;
};

type SubmitResult = {
  profile_id?: string;
};

const FLOW = ONBOARDING_QUESTIONNAIRE_FLOW;
const TOTAL_STEPS = FLOW.length;
const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function formatCurrency(value: number): string {
  return inrFormatter.format(value);
}

function formatRegime(regime: "old" | "new" | null): string {
  if (regime === "old") {
    return "Old Regime";
  }

  if (regime === "new") {
    return "New Regime";
  }

  return "Not selected";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildInitialAnswers(): Answers {
  const initial: Answers = {};

  for (const screen of FLOW) {
    for (const field of screen.fields) {
      initial[field.key] = field.type === "boolean" ? false : "";
    }
  }

  return initial;
}

function normalizeFieldValue(field: OnboardingField, value: FieldValue): string | number | boolean | null {
  if (field.type === "boolean") {
    return value === true;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (field.type === "number" || field.type === "currency") {
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      return null;
    }

    return parsed;
  }

  return trimmed;
}

function coercePersistedFieldValue(field: OnboardingField, rawValue: unknown): FieldValue | undefined {
  if (field.type === "boolean") {
    if (typeof rawValue === "boolean") {
      return rawValue;
    }

    if (typeof rawValue === "string") {
      const normalized = rawValue.trim().toLowerCase();
      if (normalized === "true") {
        return true;
      }

      if (normalized === "false") {
        return false;
      }
    }

    if (typeof rawValue === "number") {
      return rawValue === 1;
    }

    return undefined;
  }

  if (typeof rawValue === "string") {
    return rawValue;
  }

  if (typeof rawValue === "number") {
    return String(rawValue);
  }

  return undefined;
}

function hydrateAnswersFromResponses(baseAnswers: Answers, rows: PersistedResponseRow[]): Answers {
  const hydrated: Answers = { ...baseAnswers };
  const fieldByKey = new Map<string, OnboardingField>();

  for (const screen of FLOW) {
    for (const field of screen.fields) {
      fieldByKey.set(field.key, field);
    }
  }

  for (const row of rows) {
    if (!isRecord(row.response_data)) {
      continue;
    }

    for (const [key, rawValue] of Object.entries(row.response_data)) {
      const field = fieldByKey.get(key);
      if (!field) {
        continue;
      }

      const coercedValue = coercePersistedFieldValue(field, rawValue);
      if (coercedValue !== undefined) {
        hydrated[key] = coercedValue;
      }
    }
  }

  return hydrated;
}

function getStepIndexByScreenId(screenId: string | null): number {
  if (!screenId) {
    return 0;
  }

  const index = FLOW.findIndex((screen) => screen.id === screenId);
  return index >= 0 ? index : 0;
}

function validateField(field: OnboardingField, value: FieldValue): string | null {
  if (field.type === "boolean") {
    if (field.required && value !== true) {
      return `Please confirm: ${field.label}.`;
    }

    return null;
  }

  if (typeof value !== "string") {
    return `Invalid value for ${field.label}.`;
  }

  const trimmed = value.trim();
  if (field.required && !trimmed) {
    return `${field.label} is required.`;
  }

  if (!trimmed) {
    return null;
  }

  if (field.type === "email") {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmed)) {
      return `Please provide a valid email for ${field.label}.`;
    }
  }

  if (field.type === "number" || field.type === "currency") {
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      return `${field.label} must be a valid number.`;
    }

    if (field.min !== undefined && parsed < field.min) {
      return `${field.label} must be at least ${field.min}.`;
    }

    if (field.max !== undefined && parsed > field.max) {
      return `${field.label} must be at most ${field.max}.`;
    }
  }

  return null;
}

export default function OnboardingForm() {
  const [answers, setAnswers] = useState<Answers>(() => buildInitialAnswers());
  const [currentStep, setCurrentStep] = useState(0);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [submitTaxSummary, setSubmitTaxSummary] = useState<TaxOptimizationSummary | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [didResumeSession, setDidResumeSession] = useState(false);

  const currentScreen = FLOW[currentStep];
  const isLastStep = currentStep === TOTAL_STEPS - 1;
  const completionPercent = Math.round(((currentStep + 1) / TOTAL_STEPS) * 100);

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      setIsInitializing(true);
      setSubmitError(null);

      try {
        const supabase = getSupabaseBrowserClient();
        const [{ data: userData, error: userError }, { data: authSessionData, error: authSessionError }] =
          await Promise.all([supabase.auth.getUser(), supabase.auth.getSession()]);

        if (userError) {
          throw userError;
        }

        if (authSessionError) {
          throw authSessionError;
        }

        if (!userData.user || !authSessionData.session) {
          if (isMounted) {
            setAuthRequired(true);
            setDidResumeSession(false);
          }
          return;
        }

        let activeSessionId: string;
        let activeStep = 0;
        let hydratedAnswers = buildInitialAnswers();

        const { data: existingSessionData, error: existingSessionError } = await supabase
          .from("onboarding_sessions")
          .select("id,current_screen_id")
          .eq("user_id", userData.user.id)
          .eq("status", "in_progress")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingSessionError) {
          throw existingSessionError;
        }

        const existingSession = (existingSessionData ?? null) as ExistingSessionRow | null;

        if (existingSession) {
          activeSessionId = existingSession.id;
          activeStep = getStepIndexByScreenId(existingSession.current_screen_id);

          const { data: responseRowsData, error: responseRowsError } = await supabase
            .from("onboarding_responses")
            .select("response_data")
            .eq("session_id", existingSession.id)
            .order("submitted_at", { ascending: true });

          if (responseRowsError) {
            throw responseRowsError;
          }

          hydratedAnswers = hydrateAnswersFromResponses(hydratedAnswers, (responseRowsData ?? []) as PersistedResponseRow[]);

          if (isMounted) {
            setDidResumeSession(true);
          }
        } else {
          const { data: onboardingSession, error: onboardingSessionError } = await supabase
            .from("onboarding_sessions")
            .insert({
              current_screen_id: FLOW[0].id,
              metadata: {
                flow_version: "v1",
                total_steps: TOTAL_STEPS,
              },
            })
            .select("id")
            .single();

          if (onboardingSessionError) {
            throw onboardingSessionError;
          }

          activeSessionId = onboardingSession.id;

          if (isMounted) {
            setDidResumeSession(false);
          }
        }

        const authEmail =
          typeof userData.user.email === "string" && userData.user.email.length > 0 ? userData.user.email : null;

        if (authEmail && typeof hydratedAnswers.email === "string" && hydratedAnswers.email.trim().length === 0) {
          hydratedAnswers.email = authEmail;
        }

        if (isMounted) {
          setSessionId(activeSessionId);
          setCurrentStep(activeStep);
          setAnswers(hydratedAnswers);
          setAuthRequired(false);
        }
      } catch (error) {
        if (isMounted) {
          const message = error instanceof Error ? error.message : "We could not start onboarding.";
          setSubmitError(message);
        }
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    }

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  function getFieldValue(field: OnboardingField): FieldValue {
    return answers[field.key] ?? (field.type === "boolean" ? false : "");
  }

  function setFieldValue(field: OnboardingField, value: FieldValue) {
    setAnswers((previous) => ({
      ...previous,
      [field.key]: value,
    }));
  }

  function getCurrentScreenPayload() {
    return Object.fromEntries(
      currentScreen.fields.map((field) => [field.key, normalizeFieldValue(field, getFieldValue(field))]),
    );
  }

  function buildAllAnswersPayload() {
    const entries: Array<[string, string | number | boolean | null]> = [];

    for (const screen of FLOW) {
      for (const field of screen.fields) {
        entries.push([field.key, normalizeFieldValue(field, getFieldValue(field))]);
      }
    }

    return Object.fromEntries(entries);
  }

  async function persistCurrentScreen() {
    if (!sessionId) {
      throw new Error("Onboarding session was not initialized.");
    }

    const supabase = getSupabaseBrowserClient();
    const responseData = getCurrentScreenPayload();

    const { error: deleteError } = await supabase
      .from("onboarding_responses")
      .delete()
      .eq("session_id", sessionId)
      .eq("screen_id", currentScreen.id);

    if (deleteError) {
      throw deleteError;
    }

    const { error: insertError } = await supabase.from("onboarding_responses").insert({
      session_id: sessionId,
      screen_id: currentScreen.id,
      response_data: responseData,
    });

    if (insertError) {
      throw insertError;
    }

    const nextScreenId = isLastStep ? currentScreen.id : FLOW[currentStep + 1].id;
    const { error: updateSessionError } = await supabase
      .from("onboarding_sessions")
      .update({ current_screen_id: nextScreenId })
      .eq("id", sessionId);

    if (updateSessionError) {
      throw updateSessionError;
    }
  }

  async function submitFinalPayload() {
    if (!sessionId) {
      throw new Error("Onboarding session was not initialized.");
    }

    const supabase = getSupabaseBrowserClient();
    const { data: authSessionData, error: authSessionError } = await supabase.auth.getSession();

    if (authSessionError) {
      throw authSessionError;
    }

    const accessToken = authSessionData.session?.access_token;
    if (!accessToken) {
      throw new Error("Authentication session expired. Please sign in again.");
    }

    const response = await fetch("/api/onboarding/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        sessionId,
        answers: buildAllAnswersPayload(),
      }),
    });

    const responseBody = (await response.json().catch(() => ({}))) as {
      error?: string;
      result?: SubmitResult;
      taxSummary?: TaxOptimizationSummary;
    };

    if (!response.ok) {
      throw new Error(responseBody.error ?? "Final onboarding submit failed.");
    }

    setSubmitResult(responseBody.result ?? null);
    setSubmitTaxSummary(responseBody.taxSummary ?? null);
  }

  async function handleNext() {
    setSubmitError(null);

    for (const field of currentScreen.fields) {
      const validationMessage = validateField(field, getFieldValue(field));
      if (validationMessage) {
        setSubmitError(validationMessage);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      await persistCurrentScreen();

      if (isLastStep) {
        await submitFinalPayload();
        setSubmitSuccess(true);
      } else {
        setCurrentStep((previous) => previous + 1);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "We could not save this onboarding step.";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleBack() {
    setSubmitError(null);
    setCurrentStep((previous) => Math.max(0, previous - 1));
  }

  if (isInitializing) {
    return (
      <section className="rounded-2xl border border-finance-border bg-finance-panel p-6 md:p-8">
        <div className="flex items-center gap-3 text-finance-text">
          <Loader2 className="h-4 w-4 animate-spin" />
          <p className="text-sm">Initializing secure onboarding session...</p>
        </div>
      </section>
    );
  }

  if (authRequired) {
    return (
      <section className="rounded-2xl border border-finance-border bg-finance-panel p-6 md:p-8">
        <div className="rounded-lg border border-finance-border bg-finance-surface p-4">
          <p className="text-sm font-semibold text-finance-text">Sign in required</p>
          <p className="mt-2 text-sm text-finance-muted">
            The onboarding wizard stores each step to your secure account session. Please sign in first.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="inline-flex items-center rounded-full bg-finance-accent px-4 py-2 text-sm font-semibold text-white"
            >
              Go to Login
            </Link>
            <Link
              href="/create-account"
              className="inline-flex items-center rounded-full border border-finance-border px-4 py-2 text-sm font-semibold text-finance-text"
            >
              Create Account
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (submitSuccess) {
    return (
      <section className="rounded-2xl border border-finance-border bg-finance-panel p-6 md:p-8">
        <div className="rounded-lg border border-finance-green/35 bg-finance-green/10 p-4 text-sm text-finance-text">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-finance-green" />
            <div>
              <p className="font-semibold">Onboarding completed successfully.</p>
              <p className="mt-1 text-finance-muted">
                Your answers have been persisted screen-by-screen and submitted through a transactional final write.
              </p>
              {submitResult?.profile_id ? (
                <p className="mt-1 text-xs text-finance-muted">Profile id: {submitResult.profile_id}</p>
              ) : null}

              {submitTaxSummary ? (
                <div className="mt-4 rounded-lg border border-finance-accent/25 bg-finance-accent/10 p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-finance-muted">Tax Optimization Snapshot</p>

                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg border border-finance-border bg-finance-panel p-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-finance-muted">80C Remaining</p>
                      <p className="mt-1 text-base font-semibold text-finance-green">
                        {formatCurrency(submitTaxSummary.section80cRemainingInr)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-finance-border bg-finance-panel p-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-finance-muted">Suggested Regime</p>
                      <p className="mt-1 text-base font-semibold text-finance-text">
                        {formatRegime(submitTaxSummary.regimeHint.suggestedRegime)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-finance-border bg-finance-panel p-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-finance-muted">FY Deadline</p>
                      <p className="mt-1 text-base font-semibold text-finance-text">
                        {submitTaxSummary.daysToFinancialYearEnd} days left
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg border border-finance-border bg-finance-panel p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-finance-muted">Old vs New Hint</p>
                    <p className="mt-1 text-sm font-semibold text-finance-text">{submitTaxSummary.regimeHint.message}</p>
                    <p className="mt-1 text-xs text-finance-muted">
                      Current: {formatRegime(submitTaxSummary.regimeHint.currentRegime)} | Old estimate: {formatCurrency(submitTaxSummary.regimeHint.estimatedTaxOldInr)} | New estimate: {formatCurrency(submitTaxSummary.regimeHint.estimatedTaxNewInr)}
                    </p>
                  </div>

                  <div className="mt-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-finance-muted">Do This Month</p>
                    <div className="mt-2 space-y-2">
                      {submitTaxSummary.checklist.map((item) => (
                        <div key={item.id} className="rounded-lg border border-finance-border bg-finance-panel p-3">
                          <p className="text-sm font-semibold text-finance-text">{item.title}</p>
                          <p className="mt-1 text-xs text-finance-muted leading-relaxed">{item.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-4">
                <Link href="/dashboard" className="inline-flex text-finance-accent font-semibold hover:underline">
                  Open my dashboard
                </Link>
                <Link href="/learn" className="inline-flex text-finance-accent font-semibold hover:underline">
                  Continue to learning hub
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  function renderField(field: OnboardingField) {
    const value = getFieldValue(field);
    const sharedInputClass =
      "w-full rounded-lg border border-finance-border px-3 text-finance-text bg-white focus:outline-none focus:ring-2 focus:ring-finance-accent/25";

    if (field.type === "boolean") {
      return (
        <label key={field.key} className="flex items-start gap-3 rounded-lg border border-finance-border bg-finance-surface p-3">
          <input
            type="checkbox"
            checked={value === true}
            onChange={(event) => setFieldValue(field, event.target.checked)}
            className="mt-1"
          />
          <span className="text-sm text-finance-text">
            {field.label}
            {field.required ? <span className="text-finance-red"> *</span> : null}
            {field.helpText ? <span className="block mt-1 text-xs text-finance-muted">{field.helpText}</span> : null}
          </span>
        </label>
      );
    }

    if (field.type === "select") {
      return (
        <label key={field.key} className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-finance-text">
            {field.label}
            {field.required ? " *" : ""}
          </span>
          <select
            value={typeof value === "string" ? value : ""}
            onChange={(event) => setFieldValue(field, event.target.value)}
            className={`h-11 ${sharedInputClass}`}
          >
            <option value="">Select an option</option>
            {(field.options ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {field.helpText ? <span className="text-xs text-finance-muted">{field.helpText}</span> : null}
        </label>
      );
    }

    if (field.type === "textarea") {
      return (
        <label key={field.key} className="flex flex-col gap-2 md:col-span-2">
          <span className="text-sm font-semibold text-finance-text">
            {field.label}
            {field.required ? " *" : ""}
          </span>
          <textarea
            rows={4}
            value={typeof value === "string" ? value : ""}
            onChange={(event) => setFieldValue(field, event.target.value)}
            placeholder={field.placeholder}
            className={`py-2 ${sharedInputClass}`}
          />
          {field.helpText ? <span className="text-xs text-finance-muted">{field.helpText}</span> : null}
        </label>
      );
    }

    const inputType =
      field.type === "currency" || field.type === "number"
        ? "number"
        : field.type === "phone"
          ? "tel"
          : field.type;

    return (
      <label key={field.key} className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-finance-text">
          {field.label}
          {field.required ? " *" : ""}
        </span>
        <input
          type={inputType}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => setFieldValue(field, event.target.value)}
          placeholder={field.placeholder}
          min={field.min}
          max={field.max}
          step={field.step ?? (field.type === "currency" ? 0.01 : undefined)}
          className={`h-11 ${sharedInputClass}`}
        />
        {field.helpText ? <span className="text-xs text-finance-muted">{field.helpText}</span> : null}
      </label>
    );
  }

  return (
    <section className="rounded-2xl border border-finance-border bg-finance-panel shadow-[0_20px_45px_rgba(43,92,255,0.08)] p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-finance-muted">Runtime Onboarding Wizard</p>
          <h2 className="mt-1 text-xl md:text-2xl font-semibold text-finance-text">{currentScreen.title}</h2>
          <p className="mt-1 text-sm text-finance-muted">{currentScreen.description}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-finance-muted">
            Step {currentStep + 1} of {TOTAL_STEPS}
          </p>
          <p className="text-xs text-finance-muted">Est. {currentScreen.estimatedMinutes} min</p>
        </div>
      </div>

      <div className="mt-4 h-2 rounded-full bg-finance-surface overflow-hidden">
        <div className="h-full bg-finance-accent transition-all duration-300" style={{ width: `${completionPercent}%` }} />
      </div>

      {didResumeSession ? (
        <div className="mt-4 rounded-lg border border-finance-accent/25 bg-finance-accent/10 p-3 text-sm text-finance-text">
          Resumed your previous session.
        </div>
      ) : null}

      <div className="mt-6 grid gap-5 md:grid-cols-2">{currentScreen.fields.map((field) => renderField(field))}</div>

      {submitError && (
        <div className="mt-5 flex items-start gap-2 rounded-lg border border-finance-red/25 bg-finance-red/10 p-3 text-sm text-finance-red">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          <p>{submitError}</p>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleBack}
          disabled={currentStep === 0 || isSubmitting}
          className="inline-flex items-center gap-2 rounded-full border border-finance-border px-4 py-2 text-sm font-semibold text-finance-text disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={isSubmitting || !sessionId}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-finance-accent px-6 py-3 text-white font-semibold shadow-[0_8px_20px_rgba(43,92,255,0.35)] hover:bg-[#1f4ee8] transition-colors disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isSubmitting ? "Saving..." : isLastStep ? "Submit Onboarding" : "Save and Continue"}
          {!isSubmitting ? <ArrowRight className="h-4 w-4" /> : null}
        </button>
      </div>
    </section>
  );
}
