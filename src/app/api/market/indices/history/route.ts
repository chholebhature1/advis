import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const CACHE_WINDOW_MS = 60 * 1000;
const CACHE_CONTROL_VALUE = "public, s-maxage=60, stale-while-revalidate=30";
const NIFTY_CHART_BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI";

type DashboardHorizon = "6m" | "12m" | "24m" | "36m";
type MarketTrendPoint = { label: string; close: number };
type MarketTrendResponse = {
  ok: true;
  generatedAt: string;
  source: "live" | "fallback";
  symbol: "NIFTY50";
  horizon: DashboardHorizon;
  points: MarketTrendPoint[];
};

type YahooChartPayload = {
  chart?: {
    result?: Array<{
      timestamp?: Array<number | null>;
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>;
        }>;
      };
    }>;
  };
};

type CachedTrend = {
  payload: MarketTrendResponse;
  expiresAt: number;
};

const horizonToRange: Record<DashboardHorizon, string> = {
  "6m": "6mo",
  "12m": "1y",
  "24m": "2y",
  "36m": "3y",
};

const horizonToInterval: Record<DashboardHorizon, string> = {
  "6m": "1d",
  "12m": "1d",
  "24m": "1wk",
  "36m": "1wk",
};

const cacheByHorizon = new Map<DashboardHorizon, CachedTrend>();
const inFlightByHorizon = new Map<DashboardHorizon, Promise<MarketTrendResponse>>();

function isHorizon(value: string | null): value is DashboardHorizon {
  return value === "6m" || value === "12m" || value === "24m" || value === "36m";
}

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

function toDateLabel(date: Date, horizon: DashboardHorizon): string {
  if (horizon === "24m" || horizon === "36m") {
    return new Intl.DateTimeFormat("en-IN", {
      month: "short",
      year: "2-digit",
      timeZone: "UTC",
    }).format(date);
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

function buildFallbackPoints(horizon: DashboardHorizon): MarketTrendPoint[] {
  const now = new Date();
  const pointsCount = horizon === "6m" ? 28 : horizon === "12m" ? 40 : 52;
  const dayStep = horizon === "6m" ? 6 : horizon === "12m" ? 8 : 14;
  const baseline = 22300;

  return Array.from({ length: pointsCount }, (_, index) => {
    const date = new Date(now);
    const reverseIndex = pointsCount - index - 1;
    date.setUTCDate(date.getUTCDate() - reverseIndex * dayStep);

    const trend = index * 11;
    const seasonalWave = Math.sin(index / 3.2) * 82;
    const close = round(baseline + trend + seasonalWave, 2);

    return {
      label: toDateLabel(date, horizon),
      close,
    };
  });
}

function samplePoints(points: MarketTrendPoint[], maxPoints: number): MarketTrendPoint[] {
  if (points.length <= maxPoints) {
    return points;
  }

  const step = Math.ceil(points.length / maxPoints);
  const sampled: MarketTrendPoint[] = [];

  for (let index = 0; index < points.length; index += step) {
    sampled.push(points[index]);
  }

  const last = points[points.length - 1];
  if (sampled[sampled.length - 1] !== last) {
    sampled.push(last);
  }

  return sampled;
}

async function fetchLivePoints(horizon: DashboardHorizon): Promise<MarketTrendPoint[] | null> {
  const range = horizonToRange[horizon];
  const interval = horizonToInterval[horizon];
  const response = await fetch(`${NIFTY_CHART_BASE_URL}?range=${range}&interval=${interval}`, {
    method: "GET",
    cache: "no-store",
    headers: {
      accept: "application/json",
      "user-agent": "Mozilla/5.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Yahoo chart API failed: ${response.status}`);
  }

  const payload = (await response.json()) as YahooChartPayload;
  const result = payload.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const closes = result?.indicators?.quote?.[0]?.close ?? [];

  const points: MarketTrendPoint[] = [];

  for (let index = 0; index < Math.min(timestamps.length, closes.length); index += 1) {
    const timestamp = toFiniteNumber(timestamps[index]);
    const close = toFiniteNumber(closes[index]);

    if (timestamp === null || close === null) {
      continue;
    }

    points.push({
      label: toDateLabel(new Date(timestamp * 1000), horizon),
      close: round(close, 2),
    });
  }

  if (points.length < 2) {
    return null;
  }

  const maxPoints = horizon === "6m" ? 90 : horizon === "12m" ? 120 : 150;
  return samplePoints(points, maxPoints);
}

async function buildMarketTrendResponse(horizon: DashboardHorizon): Promise<MarketTrendResponse> {
  let source: "live" | "fallback" = "fallback";
  let points = buildFallbackPoints(horizon);

  try {
    const livePoints = await fetchLivePoints(horizon);
    if (livePoints && livePoints.length > 0) {
      points = livePoints;
      source = "live";
    }
  } catch {
    source = "fallback";
  }

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    source,
    symbol: "NIFTY50",
    horizon,
    points,
  };
}

export async function GET(request: NextRequest) {
  const horizonParam = request.nextUrl.searchParams.get("horizon");
  const horizon: DashboardHorizon = isHorizon(horizonParam) ? horizonParam : "12m";
  const now = Date.now();

  const cached = cacheByHorizon.get(horizon);
  if (cached && cached.expiresAt > now) {
    return NextResponse.json(cached.payload, {
      status: 200,
      headers: {
        "Cache-Control": CACHE_CONTROL_VALUE,
      },
    });
  }

  if (!inFlightByHorizon.has(horizon)) {
    inFlightByHorizon.set(
      horizon,
      buildMarketTrendResponse(horizon).finally(() => {
        inFlightByHorizon.delete(horizon);
      }),
    );
  }

  const payload = await inFlightByHorizon.get(horizon)!;

  cacheByHorizon.set(horizon, {
    payload,
    expiresAt: Date.now() + CACHE_WINDOW_MS,
  });

  return NextResponse.json(payload, {
    status: 200,
    headers: {
      "Cache-Control": CACHE_CONTROL_VALUE,
    },
  });
}
