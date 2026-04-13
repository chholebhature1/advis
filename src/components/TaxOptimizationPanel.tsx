"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Calculator, Loader2, RefreshCcw } from "lucide-react";
import {
  ChecklistCard,
  DashboardSectionCard,
  EmptyState,
  StatCard,
  StatusBadge,
} from "@/components/dashboard/DashboardPrimitives";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { TaxOptimizationSummary } from "@/lib/agent/tax-optimization";

type TaxOptimizationPanelProps = {
  refreshKey: number;
};

type TaxApiPayload = {
  ok?: boolean;
  summary?: TaxOptimizationSummary;
  error?: string;
};

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

function getUrgencyClass(urgency: "low" | "medium" | "high") {
  if (urgency === "high") {
    return "border-finance-red/20 bg-finance-red/5 text-finance-red";
  }

  if (urgency === "medium") {
    return "border-amber-300/20 bg-amber-100/30 text-amber-800";
  }

  return "border-finance-border bg-finance-surface text-finance-text";
}

function confidenceTone(confidence: "low" | "medium" | "high") {
  if (confidence === "high") {
    return "success" as const;
  }

  if (confidence === "medium") {
    return "warning" as const;
  }

  return "neutral" as const;
}

export default function TaxOptimizationPanel({ refreshKey }: TaxOptimizationPanelProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<TaxOptimizationSummary | null>(null);

  const getAccessToken = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const { data, error: authError } = await supabase.auth.getSession();

    if (authError) {
      throw authError;
    }

    const token = data.session?.access_token;
    if (!token) {
      throw new Error("Authentication session expired. Please sign in again.");
    }

    return token;
  }, []);

  const loadTaxSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await getAccessToken();
      const response = await fetch("/api/agent/tax", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = (await response.json().catch(() => ({}))) as TaxApiPayload;
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not load tax optimization summary.");
      }

      setSummary(payload.summary ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load tax optimization summary.");
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    void loadTaxSummary();
  }, [loadTaxSummary, refreshKey]);

  const regimeDeltaLabel = useMemo(() => {
    if (!summary) {
      return null;
    }

    const delta = summary.regimeHint.estimatedTaxDeltaInr;
    if (Math.abs(delta) <= 1) {
      return "Old and new regime estimates are nearly identical.";
    }

    if (delta > 0) {
      return `New regime estimate is lower by ${formatCurrency(Math.abs(delta))}.`;
    }

    return `Old regime estimate is lower by ${formatCurrency(Math.abs(delta))}.`;
  }, [summary]);

  const utilizationPct = useMemo(() => {
    if (!summary || summary.section80cLimitInr <= 0) {
      return 0;
    }

    return Math.max(0, Math.min(100, (summary.section80cUsedInr / summary.section80cLimitInr) * 100));
  }, [summary]);

  const hasRegimeMismatchWarning = useMemo(() => {
    if (!summary || !summary.regimeHint.currentRegime) {
      return false;
    }

    return (
      summary.regimeHint.currentRegime !== summary.regimeHint.suggestedRegime &&
      summary.regimeHint.estimatedPotentialSavingsInr > 5000
    );
  }, [summary]);

  return (
    <DashboardSectionCard
      eyebrow="Tax Optimization Assistant"
      title="80C runway, regime confidence, monthly actions"
      description="Deterministic tax planning guidance based on your onboarding and latest profile signals."
      actions={
        <button
          type="button"
          onClick={() => void loadTaxSummary()}
          disabled={isLoading}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-finance-border px-4 text-sm font-semibold text-finance-text transition-all duration-150 hover:bg-finance-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-finance-accent/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          Refresh Tax View
        </button>
      }
    >

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-finance-red/25 bg-finance-red/10 p-3 text-sm text-finance-red sm:p-3.5">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          <p>{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-finance-muted sm:mt-5">
          <Loader2 className="h-4 w-4 animate-spin" />
          Computing tax optimization summary...
        </div>
      ) : !summary ? (
        <div className="mt-4 sm:mt-5">
          <EmptyState
            title="Tax optimization data is not ready"
            description="Complete onboarding tax fields and refresh this panel to unlock regime and deduction insights."
          />
        </div>
      ) : (
        <>
          <section className="mt-2 grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Annual Taxable Income" value={formatCurrency(summary.annualTaxableIncomeInr)} />
            <StatCard label="80C Used" value={formatCurrency(summary.section80cUsedInr)} />
            <StatCard label="80C Remaining" value={formatCurrency(summary.section80cRemainingInr)} tone="positive" />
            <StatCard
              label="FY Deadline"
              value={`${summary.daysToFinancialYearEnd} days`}
              hint={summary.financialYearEndDate}
              tone={summary.daysToFinancialYearEnd <= 60 ? "critical" : summary.daysToFinancialYearEnd <= 120 ? "warning" : "default"}
            />
          </section>

          <div className="mt-4 rounded-xl border border-finance-border bg-finance-surface/60 p-4 sm:mt-5 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-[0.12em] text-finance-muted">Section 80C Progress</p>
              <StatusBadge label={`${Math.round(utilizationPct)}% utilized`} tone={utilizationPct >= 90 ? "success" : "warning"} />
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-finance-border-soft">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#2b5cff_0%,#3b6bff_55%,#00d8ff_100%)] transition-[width] duration-500 ease-out"
                style={{ width: `${utilizationPct}%` }}
                aria-label="80C utilization progress"
              />
            </div>
            <p className="mt-2 text-xs text-finance-muted">
              Remaining room {formatCurrency(summary.section80cRemainingInr)} · Suggested monthly contribution {formatCurrency(summary.suggestedMonthly80cInr)}
            </p>
          </div>

          <div className="mt-4 rounded-xl border border-finance-accent/25 bg-finance-accent/10 p-4 sm:p-5">
            <div className="flex items-start gap-2">
              <Calculator className="mt-0.5 h-4 w-4 text-finance-accent" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs uppercase tracking-[0.12em] text-finance-muted">Old vs New Regime Hint</p>
                  <StatusBadge label={`confidence ${summary.regimeHint.confidence}`} tone={confidenceTone(summary.regimeHint.confidence)} />
                </div>
                <p className="mt-1 text-sm font-medium text-finance-text">{summary.regimeHint.message}</p>
                <p className="mt-1 text-xs text-finance-muted">
                  Current: {formatRegime(summary.regimeHint.currentRegime)} | Suggested: {formatRegime(summary.regimeHint.suggestedRegime)}
                </p>
                <p className="text-xs text-finance-muted">
                  Estimated old: {formatCurrency(summary.regimeHint.estimatedTaxOldInr)} | Estimated new: {formatCurrency(summary.regimeHint.estimatedTaxNewInr)}
                </p>
                {regimeDeltaLabel ? <p className="text-xs text-finance-muted">{regimeDeltaLabel}</p> : null}
              </div>
            </div>
          </div>

          {hasRegimeMismatchWarning ? (
            <div className="mt-4 rounded-xl border border-finance-red/25 bg-finance-red/10 p-3.5 text-finance-red sm:p-4">
              <p className="text-sm font-semibold">Consistency warning</p>
              <p className="mt-1 text-sm">
                Your current selection differs from the suggested regime with meaningful potential savings. Re-run exact payroll figures before the next declaration lock.
              </p>
            </div>
          ) : null}

          <div className="mt-4 sm:mt-5">
            <p className="text-xs uppercase tracking-[0.14em] text-finance-muted">Do This Month</p>
            <div className="mt-3 space-y-2.5 sm:space-y-3">
              {summary.checklist.map((item) => (
                <div key={item.id} className={getUrgencyClass(item.urgency)}>
                  <ChecklistCard
                    title={item.title}
                    detail={item.detail}
                    urgency={item.urgency}
                    actionLabel={item.urgency === "high" ? "Prioritize now" : "Mark for this month"}
                  />
                </div>
              ))}
            </div>
          </div>

          <p className="mt-3 text-xs text-finance-muted sm:mt-4">{summary.disclaimer}</p>
        </>
      )}
    </DashboardSectionCard>
  );
}

