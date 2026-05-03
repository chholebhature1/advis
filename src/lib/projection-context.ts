/**
 * Projection Context & Disclaimers
 * Non-calculational utilities for displaying projection assumptions to users
 * These do NOT modify any financial calculations - they only provide display context
 */

import type { FinancialSnapshot } from "./agent/types";

/**
 * Get the assumed annual return percentage based on risk profile
 * This READS from the snapshot's expectedReturn and returns it for display
 */
export function getAssumedReturnPercent(snapshot: FinancialSnapshot): number {
  // expectedReturn is stored as decimal (0.12 for 12%)
  return Math.round(snapshot.expectedReturn * 100);
}

/**
 * Get the blended return label with risk profile context
 */
export function getReturnAssumptionText(snapshot: FinancialSnapshot, riskProfile?: string): string {
  const returnPct = getAssumedReturnPercent(snapshot);
  const profile = riskProfile || snapshot.userProfile.riskProfile || "moderate";
  return `${returnPct}% annually (based on ${profile} risk profile)`;
}

/**
 * Determine if projectedCorpus significantly exceeds target
 * Returns a context message if relevant
 */
export function getGoalExcessContext(snapshot: FinancialSnapshot): string | null {
  const { projectedCorpus, goal } = snapshot;
  const excessRatio = projectedCorpus / goal.targetAmount;

  // If projected corpus is 150%+ of target, mention it
  if (excessRatio >= 1.5) {
    const excessPercent = Math.round((excessRatio - 1) * 100);
    return `Your current plan may exceed your goal by ${excessPercent}% under expected market conditions.`;
  }

  return null;
}

/**
 * Get scenario comparison text for conservative vs moderate vs optimistic
 */
export function getScenarioComparison(snapshot: FinancialSnapshot): {
  conservative: string;
  moderate: string;
  optimistic: string;
} {
  const { scenarioOutcomes } = snapshot;
  return {
    conservative: `₹${scenarioOutcomes.conservative.toLocaleString("en-IN")}`,
    moderate: `₹${scenarioOutcomes.moderate.toLocaleString("en-IN")}`,
    optimistic: `₹${scenarioOutcomes.optimistic.toLocaleString("en-IN")}`,
  };
}

/**
 * Get a disclaimer about projection uncertainty
 */
export const PROJECTION_DISCLAIMER =
  "Projected returns are based on assumed market performance and are not guaranteed. Actual results may vary significantly based on market conditions and your investment discipline.";

/**
 * Get a conservative scenario note
 */
export function getConservativeScenarioNote(snapshot: FinancialSnapshot): string {
  const conservativeCorpus = snapshot.scenarioOutcomes.conservative;
  const target = snapshot.goal.targetAmount;
  const isFeasible = conservativeCorpus >= target;

  if (isFeasible) {
    const percent = Math.round(((conservativeCorpus - target) / target) * 100);
    return `Even in a conservative scenario (lower market returns), your plan would reach ₹${conservativeCorpus.toLocaleString(
      "en-IN"
    )}, exceeding your goal by ${percent}%.`;
  } else {
    const shortfall = target - conservativeCorpus;
    return `In a conservative scenario (lower market returns), you may fall short by ₹${shortfall.toLocaleString("en-IN")}. Consider a higher SIP to ensure goal achievement across all market conditions.`;
  }
}

/**
 * Explanation tone improvement - highlight uncertainty
 */
export function emphasizeUncertainty(explanation: string): string {
  // Replace absolute language with probabilistic language
  let improved = explanation;

  // Common replacements to add uncertainty
  const replacements: Array<[RegExp, string]> = [
    [/\byou will achieve\b/gi, "you may achieve"],
    [/\bguaranteed\b/gi, "projected"],
    [/\byou will reach\b/gi, "you may reach"],
    [/\bcertain to\b/gi, "likely to"],
    [/\bwill definitely\b/gi, "should"],
    [/\byou'll reach\b/gi, "you may reach"],
    [/\byour target is\b/gi, "your target could be"],
  ];

  replacements.forEach(([pattern, replacement]) => {
    improved = improved.replace(pattern, replacement);
  });

  return improved;
}

/**
 * Get compounding context for explanation
 */
export function getCompoundingContext(
  sipMonthly: number,
  yearsHorizon: number,
  returnPct: number
): string {
  const totalInvested = sipMonthly * 12 * yearsHorizon;
  const monthlyRate = returnPct / 12 / 100;
  const months = yearsHorizon * 12;
  const fv = sipMonthly * (((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate));
  const gain = fv - totalInvested;

  return `Over ${yearsHorizon} years, your ₹${sipMonthly.toLocaleString("en-IN")}/month SIP will generate approximately ₹${gain.toLocaleString(
    "en-IN"
  )} in returns through compounding—assuming consistent ${returnPct}% returns.`;
}

/**
 * Get timeline importance context
 */
export function getTimelineContext(yearsHorizon: number): string {
  if (yearsHorizon < 2) {
    return "Your short timeline limits the power of compounding. Market volatility may have a larger impact.";
  }
  if (yearsHorizon < 5) {
    return "Your medium-term horizon allows for some growth through compounding, but volatility in the early years could matter.";
  }
  return "Your long-term horizon gives compounding significant time to work in your favor, smoothing out short-term market volatility.";
}
