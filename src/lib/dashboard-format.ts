/**
 * Dashboard formatting utilities.
 *
 * Pure display functions — zero business logic, zero side effects.
 * These functions format values for human-readable display only.
 */

import type { RiskAppetite, DashboardHorizon, KpiDeltaTone, InsightTone } from "./dashboard-types";

// ────────────────────────────────────────────────────────────────
// Currency
// ────────────────────────────────────────────────────────────────

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const compactInrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatCurrency(value: number): string {
  return inrFormatter.format(value);
}

export function formatCompactCurrency(value: number): string {
  return compactInrFormatter.format(value);
}

// ────────────────────────────────────────────────────────────────
// Risk & Profile
// ────────────────────────────────────────────────────────────────

export function formatRisk(value: RiskAppetite): string {
  if (value === "conservative") {
    return "Conservative";
  }

  if (value === "aggressive") {
    return "Aggressive";
  }

  return "Moderate";
}

// ────────────────────────────────────────────────────────────────
// Date & Time
// ────────────────────────────────────────────────────────────────

export function formatDateTime(value: string | null): string {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// ────────────────────────────────────────────────────────────────
// Numbers
// ────────────────────────────────────────────────────────────────

export function formatSignedNumber(value: number, digits = 2): string {
  const prefix = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${prefix}${Math.abs(value).toFixed(digits)}`;
}

export function formatSignedPercent(value: number): string {
  return `${formatSignedNumber(value, 2)}%`;
}

export function formatIndexNumber(value: number): string {
  return value.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
}

export function parseNumberInput(value: string, fallback = 0): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

// ────────────────────────────────────────────────────────────────
// Math helpers (pure, no financial semantics)
// ────────────────────────────────────────────────────────────────

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ────────────────────────────────────────────────────────────────
// Horizon
// ────────────────────────────────────────────────────────────────

export function toHorizonMonths(
  horizon: DashboardHorizon,
  customYears: number,
): number {
  if (horizon === "1y") {
    return 12;
  }

  if (horizon === "2y") {
    return 24;
  }

  if (horizon === "3y") {
    return 36;
  }

  return Math.max(1, Math.round(customYears)) * 12;
}

export function toHorizonLabel(
  horizon: DashboardHorizon,
  customYears: number,
): string {
  if (horizon === "1y") {
    return "1 year";
  }

  if (horizon === "2y") {
    return "2 years";
  }

  if (horizon === "3y") {
    return "3 years";
  }

  const normalizedYears = Math.max(1, Math.round(customYears));
  return `${normalizedYears} year${normalizedYears === 1 ? "" : "s"} (custom)`;
}

// ────────────────────────────────────────────────────────────────
// Tone / style mapping
// ────────────────────────────────────────────────────────────────

export function toneToClassName(tone: KpiDeltaTone): string {
  if (tone === "positive") {
    return "text-finance-green";
  }

  if (tone === "negative") {
    return "text-finance-red";
  }

  return "text-finance-muted";
}

export function insightToneToBadgeTone(
  tone: InsightTone,
): "neutral" | "success" | "warning" | "critical" | "info" {
  if (tone === "positive") {
    return "success";
  }

  if (tone === "warning") {
    return "warning";
  }

  if (tone === "critical") {
    return "critical";
  }

  return "neutral";
}
