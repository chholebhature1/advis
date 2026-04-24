import type {
  AgentContext,
  DashboardIntelligenceSnapshot,
  DashboardModuleKey,
  FocusConfidence,
  MarketIntelligenceSnapshot,
  ModulePriority,
} from "@/lib/agent/types";

const FEAR_GREED_ENDPOINT = "https://api.alternative.me/fng/?limit=1&format=json";
const FX_LATEST_ENDPOINT = "https://api.frankfurter.app/latest?from=USD&to=INR";

type FearGreedApiResponse = {
  data?: Array<{
    value?: string;
    value_classification?: string;
    timestamp?: string;
  }>;
};

type FrankfurterResponse = {
  date?: string;
  rates?: {
    INR?: number;
  };
};

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeFearGreedLabel(label: string | null): string {
  if (!label) {
    return "Neutral";
  }

  const trimmed = label.trim();
  if (!trimmed) {
    return "Neutral";
  }

  return trimmed
    .split(/\s+/)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
    .join(" ");
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 4500): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return (await response.json()) as unknown;
  } finally {
    clearTimeout(timeout);
  }
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getPreviousFxDate(): string {
  const now = new Date();
  const previous = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  return toIsoDate(previous);
}

async function fetchFearGreedSnapshot(): Promise<{
  value: number | null;
  label: string;
  updatedAt: string | null;
  sourceStatus: "live" | "fallback";
}> {
  try {
    const raw = (await fetchJsonWithTimeout(FEAR_GREED_ENDPOINT)) as FearGreedApiResponse;
    const latest = raw.data?.[0];
    const value = toFiniteNumber(latest?.value);
    const timestampSeconds = toFiniteNumber(latest?.timestamp);

    const updatedAt =
      timestampSeconds !== null
        ? new Date(timestampSeconds * 1000).toISOString()
        : null;

    return {
      value,
      label: normalizeFearGreedLabel(latest?.value_classification ?? null),
      updatedAt,
      sourceStatus: "live",
    };
  } catch {
    return {
      value: null,
      label: "Neutral",
      updatedAt: null,
      sourceStatus: "fallback",
    };
  }
}

async function fetchFxSnapshot(): Promise<{
  usdInr: number | null;
  usdInrPrevClose: number | null;
  usdInrChangePct: number | null;
  sourceStatus: "live" | "fallback";
}> {
  try {
    const previousDate = getPreviousFxDate();
    const [latestRaw, previousRaw] = await Promise.all([
      fetchJsonWithTimeout(FX_LATEST_ENDPOINT),
      fetchJsonWithTimeout(`https://api.frankfurter.app/${previousDate}?from=USD&to=INR`),
    ]);

    const latest = latestRaw as FrankfurterResponse;
    const previous = previousRaw as FrankfurterResponse;

    const currentRate = toFiniteNumber(latest.rates?.INR);
    const previousRate = toFiniteNumber(previous.rates?.INR);

    const usdInrChangePct =
      currentRate !== null && previousRate !== null && previousRate > 0
        ? round(((currentRate - previousRate) / previousRate) * 100, 3)
        : null;

    return {
      usdInr: currentRate,
      usdInrPrevClose: previousRate,
      usdInrChangePct,
      sourceStatus: "live",
    };
  } catch {
    return {
      usdInr: null,
      usdInrPrevClose: null,
      usdInrChangePct: null,
      sourceStatus: "fallback",
    };
  }
}

function buildMarketSnapshot(input: {
  fearGreed: {
    value: number | null;
    label: string;
    updatedAt: string | null;
    sourceStatus: "live" | "fallback";
  };
  fx: {
    usdInr: number | null;
    usdInrPrevClose: number | null;
    usdInrChangePct: number | null;
    sourceStatus: "live" | "fallback";
  };
}): MarketIntelligenceSnapshot {
  return {
    fearGreedIndex: input.fearGreed.value,
    fearGreedLabel: input.fearGreed.label,
    fearGreedUpdatedAt: input.fearGreed.updatedAt,
    usdInr: input.fx.usdInr,
    usdInrPrevClose: input.fx.usdInrPrevClose,
    usdInrChangePct: input.fx.usdInrChangePct,
    sentimentSourceStatus: input.fearGreed.sourceStatus,
    fxSourceStatus: input.fx.sourceStatus,
  };
}

function computeHoldingsStats(context: AgentContext): {
  holdingsCount: number;
  topHoldingPct: number;
  pnlPct: number | null;
} {
  const rows = context.holdings.map((holding) => {
    const marketValue = holding.quantity * holding.current_price_inr;
    const costValue = holding.quantity * holding.average_buy_price_inr;

    return {
      marketValue,
      costValue,
    };
  });

  const totalMarketValue = rows.reduce((sum, row) => sum + row.marketValue, 0);
  const totalCostValue = rows.reduce((sum, row) => sum + row.costValue, 0);
  const topHoldingValue = rows.reduce((max, row) => Math.max(max, row.marketValue), 0);

  const topHoldingPct = totalMarketValue > 0 ? round((topHoldingValue / totalMarketValue) * 100, 2) : 0;
  const pnlPct = totalCostValue > 0 ? round(((totalMarketValue - totalCostValue) / totalCostValue) * 100, 2) : null;

  return {
    holdingsCount: context.holdings.length,
    topHoldingPct,
    pnlPct,
  };
}

function getDaysToFinancialYearEnd(now = new Date()): number {
  const year = now.getUTCMonth() >= 3 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
  const fyEnd = Date.UTC(year, 2, 31, 23, 59, 59, 999);
  return Math.max(0, Math.ceil((fyEnd - now.getTime()) / (1000 * 60 * 60 * 24)));
}

function buildPriority(
  module: DashboardModuleKey,
  score: number,
  title: string,
  rationale: string,
  suggestedAction: string,
): ModulePriority {
  return {
    module,
    score: clamp(Math.round(score), 0, 100),
    title,
    rationale,
    suggestedAction,
  };
}

function buildModulePriorities(context: AgentContext, market: MarketIntelligenceSnapshot): ModulePriority[] {
  const holdingsStats = computeHoldingsStats(context);
  const daysToFyEnd = getDaysToFinancialYearEnd();

  const fearGreed = market.fearGreedIndex;
  const fxMove = market.usdInrChangePct;

  const profileScore = 34 + 
    ([context.profile?.monthly_income_inr, context.profile?.monthly_investable_surplus_inr, context.profile?.risk_appetite, context.profile?.emergency_fund_months].filter(v => v == null).length * 10) +
    (!context.profile?.onboarding_completed_at ? 14 : 0);

  const profilePriority = buildPriority(
    "profile",
    profileScore,
    "Profile confidence",
    "Core profile fields are present and aligned for planning workflows.",
    "Review your profile metadata and refresh income, surplus, and emergency-fund details."
  );

  let holdingsScore = 36;
  if (holdingsStats.holdingsCount > 0) {
    holdingsScore += 16 + (holdingsStats.topHoldingPct >= 45 ? 26 : holdingsStats.topHoldingPct >= 30 ? 14 : 0) + (holdingsStats.holdingsCount < 5 ? 8 : 0);
  }

  const holdingsPriority = buildPriority(
    "holdings",
    holdingsScore,
    "Portfolio concentration risk",
    `Top position concentration is ${holdingsStats.topHoldingPct}% across ${holdingsStats.holdingsCount} holdings.`,
    "Review allocation and trim concentration if one position exceeds your risk policy."
  );

  const advisorPriority = buildPriority(
    "advisor",
    40 + (context.goals.length >= 3 ? 10 : 0),
    "Cross-module decision synthesis",
    "Your dashboard has multi-domain signals that benefit from one integrated AI action sequence.",
    "Use Pravix Copilot to convert today’s priorities into a step-by-step monthly execution plan."
  );

  return [holdingsPriority, profilePriority, advisorPriority].sort((a, b) => b.score - a.score);
}

function deriveFocusConfidence(priorities: ModulePriority[]): FocusConfidence {
  const top = priorities[0]?.score ?? 0;
  const second = priorities[1]?.score ?? 0;
  const gap = top - second;

  if (top >= 75 && gap >= 12) {
    return "high";
  }

  if (top >= 55 && gap >= 6) {
    return "medium";
  }

  return "low";
}

function formatFxMove(usdInrChangePct: number | null): string {
  if (usdInrChangePct === null) {
    return "flat";
  }

  if (usdInrChangePct > 0) {
    return `up ${usdInrChangePct.toFixed(3)}%`;
  }

  if (usdInrChangePct < 0) {
    return `down ${Math.abs(usdInrChangePct).toFixed(3)}%`;
  }

  return "flat";
}

function buildExecutiveSummary(
  market: MarketIntelligenceSnapshot,
  priorities: ModulePriority[],
): string {
  const top = priorities[0];
  const next = priorities[1];

  const fearGreedPhrase =
    market.fearGreedIndex !== null
      ? `Fear and Greed is ${market.fearGreedIndex} (${market.fearGreedLabel.toLowerCase()}).`
      : "Fear and Greed is currently unavailable, so sentiment is treated as neutral.";

  const fxPhrase =
    market.usdInr !== null
      ? `USD/INR is ${market.usdInr.toFixed(3)} and ${formatFxMove(market.usdInrChangePct)} versus previous close.`
      : "USD/INR feed is currently unavailable, so FX pressure is estimated from user context only.";

  const priorityPhrase = top && next
    ? `Primary focus is ${top.title.toLowerCase()} (${top.score}/100), followed by ${next.title.toLowerCase()} (${next.score}/100).`
    : "Priority ranking is being calibrated from available signals.";

  return [fearGreedPhrase, fxPhrase, priorityPhrase].join(" ");
}

export async function buildDashboardIntelligence(context: AgentContext): Promise<DashboardIntelligenceSnapshot> {
  const [fearGreed, fx] = await Promise.all([fetchFearGreedSnapshot(), fetchFxSnapshot()]);
  const market = buildMarketSnapshot({ fearGreed, fx });

  const priorities = buildModulePriorities(context, market);
  const recommendedFocus = priorities[0]?.module ?? "profile";
  const focusConfidence = deriveFocusConfidence(priorities);

  return {
    generatedAt: new Date().toISOString(),
    executiveSummary: buildExecutiveSummary(market, priorities),
    market,
    priorities,
    recommendedFocus,
    focusConfidence,
    disclaimer:
      "Market pulse uses free public APIs and may be delayed. Use this as execution guidance, not as guaranteed investment advice.",
  };
}
