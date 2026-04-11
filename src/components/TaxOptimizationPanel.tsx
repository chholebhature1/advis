"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Calculator, Loader2, RefreshCcw } from "lucide-react";
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
    return "border-finance-red/35 bg-finance-red/10 text-finance-red";
  }

  if (urgency === "medium") {
    return "border-amber-300/40 bg-amber-100/60 text-amber-800";
  }

  return "border-finance-border bg-finance-surface text-finance-text";
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

  return (
    <section className="rounded-2xl border border-finance-border bg-finance-panel p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-finance-muted">Tax Optimization Assistant</p>
          <h2 className="mt-1 text-2xl font-semibold text-finance-text">80C Room, Regime Hinting, Monthly Actions</h2>
          <p className="mt-1 text-sm text-finance-muted">
            Uses your onboarding tax snapshot to estimate remaining deductions and prioritize monthly tax actions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadTaxSummary()}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-full border border-finance-border px-4 py-2 text-sm font-semibold text-finance-text hover:bg-finance-surface disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          Refresh Tax View
        </button>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-finance-red/25 bg-finance-red/10 p-3 text-sm text-finance-red">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          <p>{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="mt-5 flex items-center gap-2 text-sm text-finance-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Computing tax optimization summary...
        </div>
      ) : !summary ? (
        <div className="mt-5 rounded-xl border border-finance-border bg-finance-surface/70 p-4 text-sm text-finance-muted">
          Complete onboarding tax fields to unlock optimization outputs.
        </div>
      ) : (
        <>
          <section className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-xl border border-finance-border bg-finance-panel p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-finance-muted">Annual Taxable Income</p>
              <p className="mt-2 text-xl font-semibold text-finance-text">{formatCurrency(summary.annualTaxableIncomeInr)}</p>
            </article>
            <article className="rounded-xl border border-finance-border bg-finance-panel p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-finance-muted">80C Used</p>
              <p className="mt-2 text-xl font-semibold text-finance-text">{formatCurrency(summary.section80cUsedInr)}</p>
            </article>
            <article className="rounded-xl border border-finance-border bg-finance-panel p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-finance-muted">80C Remaining</p>
              <p className="mt-2 text-xl font-semibold text-finance-green">{formatCurrency(summary.section80cRemainingInr)}</p>
            </article>
            <article className="rounded-xl border border-finance-border bg-finance-panel p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-finance-muted">FY Deadline</p>
              <p className="mt-2 text-xl font-semibold text-finance-text">{summary.daysToFinancialYearEnd} days</p>
              <p className="mt-1 text-xs text-finance-muted">{summary.financialYearEndDate}</p>
            </article>
          </section>

          <div className="mt-5 rounded-xl border border-finance-accent/25 bg-finance-accent/10 p-4">
            <div className="flex items-start gap-2">
              <Calculator className="mt-0.5 h-4 w-4 text-finance-accent" />
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-finance-muted">Old vs New Regime Hint</p>
                <p className="mt-1 text-sm font-semibold text-finance-text">{summary.regimeHint.message}</p>
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

          <div className="mt-5">
            <p className="text-xs uppercase tracking-[0.14em] text-finance-muted">Do This Month</p>
            <div className="mt-3 space-y-3">
              {summary.checklist.map((item) => (
                <article
                  key={item.id}
                  className={`rounded-xl border p-4 ${getUrgencyClass(item.urgency)}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]">
                      {item.urgency}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed">{item.detail}</p>
                </article>
              ))}
            </div>
          </div>

          <p className="mt-4 text-xs text-finance-muted">{summary.disclaimer}</p>
        </>
      )}
    </section>
  );
}
