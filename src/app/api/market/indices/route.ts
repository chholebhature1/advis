import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const CACHE_WINDOW_MS = 5 * 1000;
const CACHE_CONTROL_VALUE = "public, s-maxage=5, stale-while-revalidate=2";
const YAHOO_QUOTES_URLS = [
  "https://query1.finance.yahoo.com/v7/finance/quote?symbols=%5ENSEI,%5ENSEBANK,%5EBSESN",
  "https://query2.finance.yahoo.com/v7/finance/quote?symbols=%5ENSEI,%5ENSEBANK,%5EBSESN",
];

type MarketIndicatorId = "NIFTY50" | "BANKNIFTY" | "SENSEX";
type MarketTrend = "up" | "down" | "flat";

type MarketIndicator = {
  id: MarketIndicatorId;
  displayName: string;
  value: number;
  changeAbs: number;
  changePct: number;
  trend: MarketTrend;
};

type YahooQuote = {
  symbol?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketPreviousClose?: number;
};

type YahooQuotePayload = {
  quoteResponse?: {
    result?: YahooQuote[];
  };
};

type MarketIndicatorsResponse = {
  ok: true;
  generatedAt: string;
  source: "live" | "fallback";
  indices: MarketIndicator[];
};

type CachedMarketIndicators = {
  payload: MarketIndicatorsResponse;
  expiresAt: number;
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        previousClose?: number;
      };
    }>;
  };
};

const symbolConfig: Array<{ symbol: string; id: MarketIndicatorId; displayName: string }> = [
  { symbol: "^NSEI", id: "NIFTY50", displayName: "NIFTY 50" },
  { symbol: "^NSEBANK", id: "BANKNIFTY", displayName: "BANK NIFTY" },
  { symbol: "^BSESN", id: "SENSEX", displayName: "SENSEX" },
];

const fallbackById: Record<MarketIndicatorId, MarketIndicator> = {
  NIFTY50: {
    id: "NIFTY50",
    displayName: "NIFTY 50",
    value: 22480.15,
    changeAbs: 115.2,
    changePct: 0.51,
    trend: "up",
  },
  BANKNIFTY: {
    id: "BANKNIFTY",
    displayName: "BANK NIFTY",
    value: 47820.7,
    changeAbs: 210.45,
    changePct: 0.44,
    trend: "up",
  },
  SENSEX: {
    id: "SENSEX",
    displayName: "SENSEX",
    value: 73980.4,
    changeAbs: 355.65,
    changePct: 0.48,
    trend: "up",
  },
};

let cachedMarketIndicators: CachedMarketIndicators | null = null;
let inFlightRefresh: Promise<MarketIndicatorsResponse> | null = null;
let lastLiveIndicators: MarketIndicator[] | null = null;

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

function toTrend(changePct: number): MarketTrend {
  if (changePct > 0) {
    return "up";
  }

  if (changePct < 0) {
    return "down";
  }

  return "flat";
}

async function fetchLiveIndicators(): Promise<MarketIndicator[] | null> {
  for (const quotesUrl of YAHOO_QUOTES_URLS) {
    try {
      const response = await fetch(quotesUrl, {
        method: "GET",
        cache: "no-store",
        headers: {
          accept: "application/json",
          "user-agent": "Mozilla/5.0",
        },
      });

      if (!response.ok) {
        continue;
      }

      const payload = (await response.json()) as YahooQuotePayload;
      const quotes = payload.quoteResponse?.result ?? [];
      const quoteMap = new Map<string, YahooQuote>();

      for (const quote of quotes) {
        if (typeof quote.symbol === "string") {
          quoteMap.set(quote.symbol, quote);
        }
      }

      const indicators: MarketIndicator[] = [];

      for (const config of symbolConfig) {
        const quote = quoteMap.get(config.symbol);

        const value = toFiniteNumber(quote?.regularMarketPrice);
        let changeAbs = toFiniteNumber(quote?.regularMarketChange);
        let changePct = toFiniteNumber(quote?.regularMarketChangePercent);

        if ((changeAbs === null || changePct === null) && value !== null) {
          const prevClose = toFiniteNumber(quote?.regularMarketPreviousClose);
          if (prevClose !== null && prevClose !== 0) {
            changeAbs = value - prevClose;
            changePct = (changeAbs / prevClose) * 100;
          }
        }

        if (value === null || changeAbs === null || changePct === null) {
          indicators.length = 0;
          break;
        }

        indicators.push({
          id: config.id,
          displayName: config.displayName,
          value: round(value, 2),
          changeAbs: round(changeAbs, 2),
          changePct: round(changePct, 2),
          trend: toTrend(changePct),
        });
      }

      if (indicators.length === symbolConfig.length) {
        return indicators;
      }
    } catch {
      // Try next source.
    }
  }

  // Last fallback: chart endpoints per index (still live from Yahoo in most cases).
  const chartResults = await Promise.all(
    symbolConfig.map(async (config) => {
      const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(config.symbol)}?range=1d&interval=1m`;

      try {
        const response = await fetch(chartUrl, {
          method: "GET",
          cache: "no-store",
          headers: {
            accept: "application/json",
            "user-agent": "Mozilla/5.0",
          },
        });

        if (!response.ok) {
          return null;
        }

        const payload = (await response.json()) as YahooChartResponse;
        const meta = payload.chart?.result?.[0]?.meta;
        const value = toFiniteNumber(meta?.regularMarketPrice);
        const prevClose = toFiniteNumber(meta?.previousClose);

        if (value === null || prevClose === null || prevClose === 0) {
          return null;
        }

        const changeAbs = value - prevClose;
        const changePct = (changeAbs / prevClose) * 100;

        return {
          id: config.id,
          displayName: config.displayName,
          value: round(value, 2),
          changeAbs: round(changeAbs, 2),
          changePct: round(changePct, 2),
          trend: toTrend(changePct),
        } as MarketIndicator;
      } catch {
        return null;
      }
    })
  );

  const chartIndicators = chartResults.filter((item): item is MarketIndicator => item !== null);
  if (chartIndicators.length === symbolConfig.length) {
    return chartIndicators;
  }

  return null;
}

async function buildMarketIndicatorsResponse(): Promise<MarketIndicatorsResponse> {
  let source: "live" | "fallback" = "fallback";
  let indices: MarketIndicator[] = lastLiveIndicators ?? symbolConfig.map((config) => fallbackById[config.id]);

  try {
    const live = await fetchLiveIndicators();
    if (live && live.length === symbolConfig.length) {
      indices = live;
      source = "live";
      lastLiveIndicators = live;
    }
  } catch {
    source = "fallback";
  }

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    source,
    indices,
  };
}

export async function GET() {
  const now = Date.now();

  if (cachedMarketIndicators && cachedMarketIndicators.expiresAt > now) {
    return NextResponse.json(cachedMarketIndicators.payload, {
      status: 200,
      headers: {
        "Cache-Control": CACHE_CONTROL_VALUE,
      },
    });
  }

  if (!inFlightRefresh) {
    inFlightRefresh = buildMarketIndicatorsResponse().finally(() => {
      inFlightRefresh = null;
    });
  }

  const payload = await inFlightRefresh;

  cachedMarketIndicators = {
    payload,
    expiresAt: Date.now() + CACHE_WINDOW_MS,
  };

  return NextResponse.json(payload, {
    status: 200,
    headers: {
      "Cache-Control": CACHE_CONTROL_VALUE,
    },
  });
}
