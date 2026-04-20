import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const CACHE_WINDOW_MS = 60 * 1000;
const CACHE_CONTROL_VALUE = "public, s-maxage=60, stale-while-revalidate=30";
const NIFTY_CHART_BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI";

type DashboardHorizon = "1y" | "2y" | "3y";
type TrendHorizon = DashboardHorizon | "custom";
type MarketTrendPoint = { label: string; close: number };
type MarketTrendResponse = {
  ok: true;
  generatedAt: string;
  source: "live" | "fallback";
  symbol: "NIFTY50";
  horizon: TrendHorizon;
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

const horizonToYears: Record<DashboardHorizon, number> = {
  "1y": 1,
  "2y": 2,
  "3y": 3,
};

function isHorizon(value: string | null): value is DashboardHorizon {
  return value === "1y" || value === "2y" || value === "3y";
}

function isTrendHorizon(value: string | null): value is TrendHorizon {
  return isHorizon(value) || value === "custom";
}

function toCustomYears(value: string | null): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 1;
  }

  return Math.max(1, Math.min(10, Math.round(parsed)));
}

function getHorizonYears(horizon: TrendHorizon, customYears: number): number {
  if (horizon === "custom") {
    return customYears;
  }

  return horizonToYears[horizon];
}

function horizonCacheKey(horizon: TrendHorizon, years: number): string {
  return `${horizon}:${years}`;
}

const cacheByHorizon = new Map<string, CachedTrend>();
const inFlightByHorizon = new Map<string, Promise<MarketTrendResponse>>();

function toDateLabel(date: Date, years: number): string {
  if (years > 1) {
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

function buildFallbackPoints(years: number): MarketTrendPoint[] {
  const now = new Date();
  const pointsCount = years <= 1 ? 28 : years === 2 ? 52 : Math.max(64, years * 24);
  const dayStep = Math.max(2, Math.round((years * 365) / Math.max(pointsCount - 1, 1)));
  const baseline = 22300;

  return Array.from({ length: pointsCount }, (_, index) => {
    const date = new Date(now);
    const reverseIndex = pointsCount - index - 1;
    date.setUTCDate(date.getUTCDate() - reverseIndex * dayStep);

    const trend = index * 11;
    const seasonalWave = Math.sin(index / 3.2) * 82;
    const close = round(baseline + trend + seasonalWave, 2);

    return {
      label: toDateLabel(date, years),
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

async function fetchLivePoints(horizon: TrendHorizon, years: number): Promise<MarketTrendPoint[] | null> {
  const range = `${years}y`;
  const interval = years <= 1 ? "1d" : "1wk";
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
      label: toDateLabel(new Date(timestamp * 1000), years),
      close: round(close, 2),
    });
  }

  if (points.length < 2) {
    return null;
  }

  const maxPoints = years <= 1 ? 90 : years === 2 ? 120 : 150;
  return samplePoints(points, maxPoints);
}

async function buildMarketTrendResponse(horizon: TrendHorizon, years: number): Promise<MarketTrendResponse> {
  let source: "live" | "fallback" = "fallback";
  let points = buildFallbackPoints(years);

  try {
    const livePoints = await fetchLivePoints(horizon, years);
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
  const customYears = toCustomYears(request.nextUrl.searchParams.get("years"));
  const horizon: TrendHorizon = isTrendHorizon(horizonParam) ? horizonParam : "1y";
  const years = getHorizonYears(horizon, customYears);
  const now = Date.now();
  const cacheKey = horizonCacheKey(horizon, years);

  const cached = cacheByHorizon.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return NextResponse.json(cached.payload, {
      status: 200,
      headers: {
        "Cache-Control": CACHE_CONTROL_VALUE,
      },
    });
  }

  if (!inFlightByHorizon.has(cacheKey)) {
    inFlightByHorizon.set(
      cacheKey,
      buildMarketTrendResponse(horizon, years).finally(() => {
        inFlightByHorizon.delete(cacheKey);
      }),
    );
  }

  const payload = await inFlightByHorizon.get(cacheKey)!;

  cacheByHorizon.set(cacheKey, {
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
