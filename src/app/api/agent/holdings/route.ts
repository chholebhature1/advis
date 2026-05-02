import { NextResponse } from "next/server";
import { createAuthedSupabaseClient, getBearerToken, resolveAuthedUser } from "@/lib/agent/server";
import { invalidateAgentContext } from "@/lib/agent/context";

export const runtime = "nodejs";

type HoldingsPostBody = {
  mode?: unknown;
  holding?: unknown;
  holdings?: unknown;
};

type HoldingInput = {
  instrumentSymbol: string;
  instrumentName: string;
  assetClass: string;
  sector: string | null;
  quantity: number;
  averageBuyPriceInr: number;
  currentPriceInr: number;
};

type HoldingDbRow = {
  id: string;
  instrument_symbol: string;
  instrument_name: string;
  asset_class: string;
  sector: string | null;
  quantity: number | string;
  average_buy_price_inr: number | string;
  current_price_inr: number | string;
  updated_at: string;
};

type HoldingView = {
  id: string;
  instrumentSymbol: string;
  instrumentName: string;
  assetClass: string;
  sector: string | null;
  quantity: number;
  averageBuyPriceInr: number;
  currentPriceInr: number;
  marketValueInr: number;
  costValueInr: number;
  unrealizedPnlInr: number;
  unrealizedPnlPct: number | null;
};

type ExposureItem = {
  name: string;
  value: number;
  marketValueInr: number;
};

type ConcentrationWarning = {
  id: string;
  severity: "low" | "medium" | "high";
  title: string;
  message: string;
  metricPct: number | null;
};

type HoldingsSnapshot = {
  holdings: HoldingView[];
  analytics: {
    totalMarketValueInr: number;
    totalCostValueInr: number;
    totalUnrealizedPnlInr: number;
    totalUnrealizedPnlPct: number | null;
    allocationByAssetClass: ExposureItem[];
    sectorExposure: ExposureItem[];
    concentrationWarnings: ConcentrationWarning[];
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function firstDefined(record: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (key in record) {
      return record[key];
    }
  }

  return undefined;
}

function parseText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/,/g, "").trim();
    if (normalized.length === 0) {
      return null;
    }

    const parsed = Number(normalized);
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

function normalizeSymbol(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase();
}

function normalizeAssetClass(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function parseHoldingInput(raw: unknown, rowLabel: string): { value: HoldingInput | null; error: string | null } {
  if (!isRecord(raw)) {
    return { value: null, error: `${rowLabel}: holding row must be an object.` };
  }

  const symbolValue = parseText(firstDefined(raw, ["instrumentSymbol", "instrument_symbol", "symbol", "ticker"]));
  if (!symbolValue) {
    return { value: null, error: `${rowLabel}: instrumentSymbol is required.` };
  }

  const assetClassValue = parseText(firstDefined(raw, ["assetClass", "asset_class"]));
  if (!assetClassValue) {
    return { value: null, error: `${rowLabel}: assetClass is required.` };
  }

  const quantityValue = parseNumber(firstDefined(raw, ["quantity", "qty", "units"]));
  if (quantityValue === null || quantityValue <= 0) {
    return { value: null, error: `${rowLabel}: quantity must be greater than 0.` };
  }

  const avgPriceValue = parseNumber(
    firstDefined(raw, [
      "averageBuyPriceInr",
      "average_buy_price_inr",
      "avgPrice",
      "avg_price",
      "average_price",
      "buy_price",
    ]),
  );
  if (avgPriceValue === null || avgPriceValue < 0) {
    return { value: null, error: `${rowLabel}: averageBuyPriceInr must be 0 or greater.` };
  }

  const currentPriceValue = parseNumber(
    firstDefined(raw, ["currentPriceInr", "current_price_inr", "current_price", "price", "ltp"]),
  );
  if (currentPriceValue === null || currentPriceValue < 0) {
    return { value: null, error: `${rowLabel}: currentPriceInr must be 0 or greater.` };
  }

  const optionalName = parseText(firstDefined(raw, ["instrumentName", "instrument_name", "name"]));
  const optionalSector = parseText(firstDefined(raw, ["sector", "industry"]));

  const instrumentSymbol = normalizeSymbol(symbolValue);

  return {
    value: {
      instrumentSymbol,
      instrumentName: optionalName ?? instrumentSymbol,
      assetClass: normalizeAssetClass(assetClassValue),
      sector: optionalSector ?? null,
      quantity: round(quantityValue, 6),
      averageBuyPriceInr: round(avgPriceValue, 2),
      currentPriceInr: round(currentPriceValue, 2),
    },
    error: null,
  };
}

function dedupeHoldings(rows: HoldingInput[]): HoldingInput[] {
  const bySymbol = new Map<string, HoldingInput>();

  for (const row of rows) {
    bySymbol.set(row.instrumentSymbol, row);
  }

  return Array.from(bySymbol.values());
}

async function ensureManualImportAccount(
  supabase: ReturnType<typeof createAuthedSupabaseClient>,
  userId: string,
): Promise<string> {
  const existingAccount = await supabase
    .from("portfolio_accounts")
    .select("id")
    .eq("user_id", userId)
    .eq("provider", "manual_import")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingAccount.error) {
    throw existingAccount.error;
  }

  if (existingAccount.data?.id) {
    return existingAccount.data.id;
  }

  const insertedAccount = await supabase
    .from("portfolio_accounts")
    .insert({
      user_id: userId,
      provider: "manual_import",
      account_type: "other",
      masked_account_ref: "manual",
      base_currency: "INR",
      is_active: true,
    })
    .select("id")
    .single();

  if (insertedAccount.error || !insertedAccount.data?.id) {
    throw insertedAccount.error ?? new Error("Could not create portfolio account.");
  }

  return insertedAccount.data.id;
}

async function fetchHoldingRows(
  supabase: ReturnType<typeof createAuthedSupabaseClient>,
  userId: string,
): Promise<HoldingDbRow[]> {
  const query = await supabase
    .from("portfolio_holdings")
    .select(
      "id,instrument_symbol,instrument_name,asset_class,sector,quantity,average_buy_price_inr,current_price_inr,updated_at",
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (query.error) {
    throw query.error;
  }

  return (query.data ?? []) as HoldingDbRow[];
}

function buildExposure(items: HoldingView[], totalMarketValueInr: number, kind: "asset" | "sector"): ExposureItem[] {
  const bucket = new Map<string, number>();

  for (const item of items) {
    const key = kind === "asset" ? item.assetClass : item.sector ?? "Unclassified";
    bucket.set(key, (bucket.get(key) ?? 0) + item.marketValueInr);
  }

  return Array.from(bucket.entries())
    .map(([name, marketValueInr]) => ({
      name,
      marketValueInr: round(marketValueInr, 2),
      value: totalMarketValueInr > 0 ? round((marketValueInr / totalMarketValueInr) * 100, 2) : 0,
    }))
    .sort((a, b) => b.marketValueInr - a.marketValueInr);
}

function buildSnapshot(rows: HoldingDbRow[]): HoldingsSnapshot {
  const holdings = rows
    .map((row) => {
      const quantity = parseNumber(row.quantity) ?? 0;
      const averageBuyPriceInr = parseNumber(row.average_buy_price_inr) ?? 0;
      const currentPriceInr = parseNumber(row.current_price_inr) ?? 0;

      const marketValueInr = quantity * currentPriceInr;
      const costValueInr = quantity * averageBuyPriceInr;
      const unrealizedPnlInr = marketValueInr - costValueInr;
      const unrealizedPnlPct = costValueInr > 0 ? (unrealizedPnlInr / costValueInr) * 100 : null;

      return {
        id: row.id,
        instrumentSymbol: row.instrument_symbol,
        instrumentName: row.instrument_name,
        assetClass: row.asset_class,
        sector: row.sector,
        quantity: round(quantity, 6),
        averageBuyPriceInr: round(averageBuyPriceInr, 2),
        currentPriceInr: round(currentPriceInr, 2),
        marketValueInr: round(marketValueInr, 2),
        costValueInr: round(costValueInr, 2),
        unrealizedPnlInr: round(unrealizedPnlInr, 2),
        unrealizedPnlPct: unrealizedPnlPct === null ? null : round(unrealizedPnlPct, 2),
      };
    })
    .sort((a, b) => b.marketValueInr - a.marketValueInr);

  const totalMarketValueRaw = holdings.reduce((sum, row) => sum + row.marketValueInr, 0);
  const totalCostValueRaw = holdings.reduce((sum, row) => sum + row.costValueInr, 0);

  const totalMarketValueInr = round(totalMarketValueRaw, 2);
  const totalCostValueInr = round(totalCostValueRaw, 2);
  const totalUnrealizedPnlInr = round(totalMarketValueInr - totalCostValueInr, 2);
  const totalUnrealizedPnlPct = totalCostValueInr > 0 ? round((totalUnrealizedPnlInr / totalCostValueInr) * 100, 2) : null;

  const allocationByAssetClass = buildExposure(holdings, totalMarketValueInr, "asset");
  const sectorExposure = buildExposure(holdings, totalMarketValueInr, "sector");

  const concentrationWarnings: ConcentrationWarning[] = [];

  if (holdings.length === 1 && totalMarketValueInr > 0) {
    concentrationWarnings.push({
      id: "single-holding",
      severity: "high",
      title: "Single holding concentration",
      message: "Your portfolio currently has only one holding. Add more instruments to reduce idiosyncratic risk.",
      metricPct: 100,
    });
  }

  if (holdings.length > 0 && totalMarketValueInr > 0) {
    const largest = holdings[0];
    const largestPct = round((largest.marketValueInr / totalMarketValueInr) * 100, 2);

    if (largestPct >= 25) {
      concentrationWarnings.push({
        id: `largest-holding-${largest.instrumentSymbol}`,
        severity: largestPct >= 35 ? "high" : "medium",
        title: "High single-stock concentration",
        message:
          `${largest.instrumentSymbol} contributes ${largestPct}% of portfolio value. ` +
          "Consider trimming if this exceeds your risk tolerance.",
        metricPct: largestPct,
      });
    }

    const topThreeValue = holdings.slice(0, 3).reduce((sum, row) => sum + row.marketValueInr, 0);
    const topThreePct = round((topThreeValue / totalMarketValueInr) * 100, 2);

    if (topThreePct >= 60) {
      concentrationWarnings.push({
        id: "top-three",
        severity: topThreePct >= 75 ? "high" : "medium",
        title: "Top 3 holdings dominate portfolio",
        message: `Top 3 holdings form ${topThreePct}% of your portfolio. Add diversification across more assets.`,
        metricPct: topThreePct,
      });
    }

    const leadingSector = sectorExposure[0];
    if (leadingSector && leadingSector.name !== "Unclassified" && leadingSector.value >= 35) {
      concentrationWarnings.push({
        id: `sector-${leadingSector.name.toLowerCase().replace(/\s+/g, "-")}`,
        severity: leadingSector.value >= 45 ? "high" : "medium",
        title: "Sector concentration risk",
        message: `${leadingSector.name} exposure is ${leadingSector.value}%. Consider balancing with other sectors.`,
        metricPct: leadingSector.value,
      });
    }
  }

  return {
    holdings,
    analytics: {
      totalMarketValueInr,
      totalCostValueInr,
      totalUnrealizedPnlInr,
      totalUnrealizedPnlPct,
      allocationByAssetClass,
      sectorExposure,
      concentrationWarnings,
    },
  };
}

export async function GET(request: Request) {
  try {
    const accessToken = getBearerToken(request);
    if (!accessToken) {
      return NextResponse.json({ error: "Missing bearer token." }, { status: 401 });
    }

    const supabase = createAuthedSupabaseClient(accessToken);
    const user = await resolveAuthedUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized request." }, { status: 401 });
    }

    const rows = await fetchHoldingRows(supabase, user.id);
    const snapshot = buildSnapshot(rows);

    return NextResponse.json({ ok: true, ...snapshot }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected holdings read error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const accessToken = getBearerToken(request);
    if (!accessToken) {
      return NextResponse.json({ error: "Missing bearer token." }, { status: 401 });
    }

    const supabase = createAuthedSupabaseClient(accessToken);
    const user = await resolveAuthedUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized request." }, { status: 401 });
    }

    const body = (await request.json()) as HoldingsPostBody;

    let rawRows: unknown[] = [];

    if (body.mode === "manual") {
      rawRows = body.holding !== undefined ? [body.holding] : [];
    } else if (body.mode === "csv") {
      rawRows = Array.isArray(body.holdings) ? body.holdings : [];
    } else if (Array.isArray(body.holdings)) {
      rawRows = body.holdings;
    } else if (body.holding !== undefined) {
      rawRows = [body.holding];
    }

    if (rawRows.length === 0) {
      return NextResponse.json(
        { error: "No holdings provided. Send holding for manual mode or holdings array for csv mode." },
        { status: 400 },
      );
    }

    if (rawRows.length > 500) {
      return NextResponse.json({ error: "Too many holdings in one request. Maximum is 500." }, { status: 400 });
    }

    const parsedRows: HoldingInput[] = [];
    const parseErrors: string[] = [];

    rawRows.forEach((raw, index) => {
      const parsed = parseHoldingInput(raw, `Row ${index + 1}`);
      if (parsed.error) {
        parseErrors.push(parsed.error);
        return;
      }

      if (parsed.value) {
        parsedRows.push(parsed.value);
      }
    });

    if (parseErrors.length > 0) {
      return NextResponse.json(
        {
          error: "Holdings payload validation failed.",
          details: parseErrors.slice(0, 12),
        },
        { status: 400 },
      );
    }

    const dedupedRows = dedupeHoldings(parsedRows);
    const accountId = await ensureManualImportAccount(supabase, user.id);
    const syncedAtIso = new Date().toISOString();

    const upsertRows = dedupedRows.map((row) => ({
      user_id: user.id,
      account_id: accountId,
      instrument_symbol: row.instrumentSymbol,
      instrument_name: row.instrumentName,
      asset_class: row.assetClass,
      sector: row.sector,
      quantity: row.quantity,
      average_buy_price_inr: row.averageBuyPriceInr,
      current_price_inr: row.currentPriceInr,
      last_synced_at: syncedAtIso,
    }));

    const upsertResult = await supabase.from("portfolio_holdings").upsert(upsertRows, {
      onConflict: "account_id,instrument_symbol",
    });

    if (upsertResult.error) {
      return NextResponse.json({ error: upsertResult.error.message }, { status: 400 });
    }

    // Invalidate agent context cache after holdings update
    invalidateAgentContext(user.id);

    const rows = await fetchHoldingRows(supabase, user.id);
    const snapshot = buildSnapshot(rows);

    return NextResponse.json(
      {
        ok: true,
        importedCount: dedupedRows.length,
        ...snapshot,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected holdings write error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}