import { NextResponse } from "next/server";

export const runtime = "nodejs";

const CACHE_WINDOW_MS = 5 * 60 * 1000;

type LiveChartPoint = {
  label: string;
  value: number;
  avg: number;
};

type LiveFxPoint = {
  label: string;
  rate: number;
  rolling: number;
};

type FearGreedPayload = {
  data?: Array<{
    value?: string;
    timestamp?: string;
  }>;
};

type FrankfurterPayload = {
  rates?: Record<string, { INR?: number }>;
};

type HomepageMarketResponse = {
  ok: true;
  generatedAt: string;
  sentimentSource: "live" | "fallback";
  fxSource: "live" | "fallback";
  fearGreedTrend: LiveChartPoint[];
  usdInrTrend: LiveFxPoint[];
};

type CachedHomepageMarketResponse = {
  payload: HomepageMarketResponse;
  expiresAt: number;
};

let cachedHomepageMarket: CachedHomepageMarketResponse | null = null;
let inFlightRefresh: Promise<HomepageMarketResponse> | null = null;

const fallbackSentimentTrend: LiveChartPoint[] = [
  { label: "Apr 01", value: 41, avg: 40 },
  { label: "Apr 02", value: 43, avg: 41 },
  { label: "Apr 03", value: 44, avg: 43 },
  { label: "Apr 04", value: 46, avg: 44 },
  { label: "Apr 05", value: 45, avg: 45 },
  { label: "Apr 06", value: 47, avg: 46 },
  { label: "Apr 07", value: 49, avg: 47 },
  { label: "Apr 08", value: 50, avg: 49 },
];

const fallbackFxTrend: LiveFxPoint[] = [
  { label: "Apr 01", rate: 83.09, rolling: 83.05 },
  { label: "Apr 02", rate: 83.18, rolling: 83.11 },
  { label: "Apr 03", rate: 83.24, rolling: 83.17 },
  { label: "Apr 04", rate: 83.21, rolling: 83.21 },
  { label: "Apr 05", rate: 83.31, rolling: 83.25 },
  { label: "Apr 06", rate: 83.35, rolling: 83.29 },
  { label: "Apr 07", rate: 83.27, rolling: 83.31 },
  { label: "Apr 08", rate: 83.42, rolling: 83.35 },
];

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

function toDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

function toIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function rollingAverage(values: number[], index: number, windowSize = 3): number {
  const start = Math.max(0, index - (windowSize - 1));
  const subset = values.slice(start, index + 1);
  const sum = subset.reduce((accumulator, value) => accumulator + value, 0);
  return round(sum / subset.length, 2);
}

async function fetchFearGreedTrend(): Promise<LiveChartPoint[]> {
  const response = await fetch("https://api.alternative.me/fng/?limit=12&format=json", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Fear & Greed API failed: ${response.status}`);
  }

  const payload = (await response.json()) as FearGreedPayload;
  const normalized = (payload.data ?? [])
    .map((item) => {
      const value = toFiniteNumber(item.value);
      const timestampSeconds = toFiniteNumber(item.timestamp);

      if (value === null || timestampSeconds === null) {
        return null;
      }

      return {
        value,
        timestamp: timestampSeconds,
      };
    })
    .filter((item): item is { value: number; timestamp: number } => item !== null)
    .sort((left, right) => left.timestamp - right.timestamp)
    .slice(-8);

  const values = normalized.map((item) => item.value);

  return normalized.map((item, index) => ({
    label: toDateLabel(new Date(item.timestamp * 1000)),
    value: round(item.value, 2),
    avg: rollingAverage(values, index),
  }));
}

async function fetchUsdInrTrend(): Promise<LiveFxPoint[]> {
  const end = new Date();
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() - 14));

  const rangeUrl = `https://api.frankfurter.app/${toIsoDate(start)}..${toIsoDate(end)}?from=USD&to=INR`;

  const response = await fetch(rangeUrl, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Frankfurter API failed: ${response.status}`);
  }

  const payload = (await response.json()) as FrankfurterPayload;
  const normalized = Object.entries(payload.rates ?? {})
    .map(([date, rates]) => {
      const rate = toFiniteNumber(rates?.INR);
      if (rate === null) {
        return null;
      }

      return {
        date,
        rate,
      };
    })
    .filter((item): item is { date: string; rate: number } => item !== null)
    .sort((left, right) => Date.parse(left.date) - Date.parse(right.date))
    .slice(-8);

  const values = normalized.map((item) => item.rate);

  return normalized.map((item, index) => ({
    label: toDateLabel(new Date(`${item.date}T00:00:00Z`)),
    rate: round(item.rate, 3),
    rolling: round(rollingAverage(values, index), 3),
  }));
}

async function buildHomepageMarketResponse(): Promise<HomepageMarketResponse> {
  let sentimentSource: "live" | "fallback" = "fallback";
  let fxSource: "live" | "fallback" = "fallback";

  let fearGreedTrend = fallbackSentimentTrend;
  let usdInrTrend = fallbackFxTrend;

  try {
    const liveSentiment = await fetchFearGreedTrend();
    if (liveSentiment.length > 0) {
      fearGreedTrend = liveSentiment;
      sentimentSource = "live";
    }
  } catch {
    sentimentSource = "fallback";
  }

  try {
    const liveFx = await fetchUsdInrTrend();
    if (liveFx.length > 0) {
      usdInrTrend = liveFx;
      fxSource = "live";
    }
  } catch {
    fxSource = "fallback";
  }

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    sentimentSource,
    fxSource,
    fearGreedTrend,
    usdInrTrend,
  };
}

export async function GET() {
  const now = Date.now();

  if (cachedHomepageMarket && cachedHomepageMarket.expiresAt > now) {
    return NextResponse.json(cachedHomepageMarket.payload, {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=300",
      },
    });
  }

  if (!inFlightRefresh) {
    inFlightRefresh = buildHomepageMarketResponse().finally(() => {
      inFlightRefresh = null;
    });
  }

  const payload = await inFlightRefresh;

  cachedHomepageMarket = {
    payload,
    expiresAt: Date.now() + CACHE_WINDOW_MS,
  };

  return NextResponse.json(payload, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=300",
    },
  });
}
