"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, RefreshCcw, TriangleAlert, Upload } from "lucide-react";
import AllocationChart from "@/components/AllocationChart";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

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

type HoldingItem = {
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

type HoldingsAnalytics = {
  totalMarketValueInr: number;
  totalCostValueInr: number;
  totalUnrealizedPnlInr: number;
  totalUnrealizedPnlPct: number | null;
  allocationByAssetClass: ExposureItem[];
  sectorExposure: ExposureItem[];
  concentrationWarnings: ConcentrationWarning[];
};

type HoldingsApiResponse = {
  ok?: boolean;
  importedCount?: number;
  holdings?: HoldingItem[];
  analytics?: HoldingsAnalytics;
  error?: string;
  details?: string[];
};

type HoldingsAnalyzerPanelProps = {
  refreshKey: number;
  onHoldingsChanged?: () => void;
};

type ManualFormState = {
  symbol: string;
  name: string;
  assetClass: string;
  sector: string;
  quantity: string;
  averageBuyPriceInr: string;
  currentPriceInr: string;
};

type CsvField = "symbol" | "name" | "assetClass" | "sector" | "quantity" | "averageBuyPriceInr" | "currentPriceInr";

type CsvParseResult = {
  holdings: Array<{
    instrumentSymbol: string;
    instrumentName: string;
    assetClass: string;
    sector: string;
    quantity: number;
    averageBuyPriceInr: number;
    currentPriceInr: number;
  }>;
  errors: string[];
};

const EMPTY_ANALYTICS: HoldingsAnalytics = {
  totalMarketValueInr: 0,
  totalCostValueInr: 0,
  totalUnrealizedPnlInr: 0,
  totalUnrealizedPnlPct: null,
  allocationByAssetClass: [],
  sectorExposure: [],
  concentrationWarnings: [],
};

const CSV_HEADER_ALIASES: Record<CsvField, string[]> = {
  symbol: ["symbol", "instrumentsymbol", "ticker"],
  name: ["name", "instrumentname", "securityname"],
  assetClass: ["assetclass", "asset_class", "class"],
  sector: ["sector", "industry"],
  quantity: ["quantity", "qty", "units"],
  averageBuyPriceInr: ["averagebuypriceinr", "averagebuyprice", "avgprice", "buyprice", "average_price"],
  currentPriceInr: ["currentpriceinr", "currentprice", "ltp", "price", "marketprice"],
};

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function canonicalHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function resolveCsvField(header: string): CsvField | null {
  const canonical = canonicalHeader(header);

  for (const [field, aliases] of Object.entries(CSV_HEADER_ALIASES)) {
    if (aliases.includes(canonical)) {
      return field as CsvField;
    }
  }

  return null;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      const nextChar = line[index + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseLooseNumber(raw: string): number | null {
  const normalized = raw.replace(/,/g, "").trim();
  if (normalized.length === 0) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseCsvText(csvText: string): CsvParseResult {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    return { holdings: [], errors: ["CSV must include a header row and at least one data row."] };
  }

  const headerCells = parseCsvLine(lines[0]);
  const fieldIndexes: Partial<Record<CsvField, number>> = {};

  headerCells.forEach((header, index) => {
    const field = resolveCsvField(header);
    if (field && fieldIndexes[field] === undefined) {
      fieldIndexes[field] = index;
    }
  });

  const requiredFields: CsvField[] = ["symbol", "assetClass", "quantity", "averageBuyPriceInr", "currentPriceInr"];
  const missingRequired = requiredFields.filter((field) => fieldIndexes[field] === undefined);

  if (missingRequired.length > 0) {
    return {
      holdings: [],
      errors: [
        "Missing required CSV headers: " +
          missingRequired.join(", ") +
          ". Example: symbol,name,asset_class,sector,quantity,average_buy_price_inr,current_price_inr",
      ],
    };
  }

  const errors: string[] = [];
  const holdings: CsvParseResult["holdings"] = [];

  for (let rowIndex = 1; rowIndex < lines.length; rowIndex += 1) {
    const rowNumber = rowIndex + 1;
    const cells = parseCsvLine(lines[rowIndex]);

    const get = (field: CsvField): string => {
      const idx = fieldIndexes[field];
      if (idx === undefined) {
        return "";
      }

      return (cells[idx] ?? "").trim();
    };

    const symbol = get("symbol").replace(/\s+/g, "").toUpperCase();
    const name = get("name");
    const assetClass = get("assetClass");
    const sector = get("sector");

    const quantity = parseLooseNumber(get("quantity"));
    const averageBuyPriceInr = parseLooseNumber(get("averageBuyPriceInr"));
    const currentPriceInr = parseLooseNumber(get("currentPriceInr"));

    if (!symbol) {
      errors.push(`Row ${rowNumber}: symbol is required.`);
      continue;
    }

    if (!assetClass) {
      errors.push(`Row ${rowNumber}: assetClass is required.`);
      continue;
    }

    if (quantity === null || quantity <= 0) {
      errors.push(`Row ${rowNumber}: quantity must be greater than 0.`);
      continue;
    }

    if (averageBuyPriceInr === null || averageBuyPriceInr < 0) {
      errors.push(`Row ${rowNumber}: average buy price must be 0 or greater.`);
      continue;
    }

    if (currentPriceInr === null || currentPriceInr < 0) {
      errors.push(`Row ${rowNumber}: current price must be 0 or greater.`);
      continue;
    }

    holdings.push({
      instrumentSymbol: symbol,
      instrumentName: name || symbol,
      assetClass,
      sector,
      quantity,
      averageBuyPriceInr,
      currentPriceInr,
    });

    if (errors.length >= 20) {
      break;
    }
  }

  return { holdings, errors };
}

function formatCurrency(value: number): string {
  return inrFormatter.format(value);
}

function formatPercent(value: number): string {
  return `${percentFormatter.format(value)}%`;
}

function getWarningClassName(severity: "low" | "medium" | "high"): string {
  if (severity === "high") {
    return "border-finance-red/35 bg-finance-red/10 text-finance-red";
  }

  if (severity === "medium") {
    return "border-amber-300/40 bg-amber-100/60 text-amber-800";
  }

  return "border-finance-border bg-finance-surface text-finance-text";
}

export default function HoldingsAnalyzerPanel({ refreshKey, onHoldingsChanged }: HoldingsAnalyzerPanelProps) {
  const [snapshot, setSnapshot] = useState<{ holdings: HoldingItem[]; analytics: HoldingsAnalytics }>({
    holdings: [],
    analytics: EMPTY_ANALYTICS,
  });

  const [manual, setManual] = useState<ManualFormState>({
    symbol: "",
    name: "",
    assetClass: "Equity",
    sector: "",
    quantity: "",
    averageBuyPriceInr: "",
    currentPriceInr: "",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  const callHoldingsEndpoint = useCallback(
    async (method: "GET" | "POST", body?: unknown): Promise<HoldingsApiResponse> => {
      const token = await getAccessToken();

      const response = await fetch("/api/agent/holdings", {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
      });

      const payload = (await response.json().catch(() => ({}))) as HoldingsApiResponse;

      if (!response.ok) {
        const details = Array.isArray(payload.details) && payload.details.length > 0 ? ` ${payload.details.join(" ")}` : "";
        throw new Error((payload.error ?? "Holdings request failed.") + details);
      }

      return payload;
    },
    [getAccessToken],
  );

  const applySnapshot = useCallback((payload: HoldingsApiResponse) => {
    setSnapshot({
      holdings: payload.holdings ?? [],
      analytics: payload.analytics ?? EMPTY_ANALYTICS,
    });
  }, []);

  const loadSnapshot = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const payload = await callHoldingsEndpoint("GET");
      applySnapshot(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load holdings data.");
    } finally {
      setIsLoading(false);
    }
  }, [applySnapshot, callHoldingsEndpoint]);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot, refreshKey]);

  const chartData = useMemo(
    () => snapshot.analytics.allocationByAssetClass.map((item) => ({ name: item.name, value: item.value })),
    [snapshot.analytics.allocationByAssetClass],
  );

  function updateManualField(field: keyof ManualFormState, value: string) {
    setManual((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleManualSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const symbol = manual.symbol.trim().replace(/\s+/g, "").toUpperCase();
    const assetClass = manual.assetClass.trim();
    const quantity = Number(manual.quantity);
    const averageBuyPriceInr = Number(manual.averageBuyPriceInr);
    const currentPriceInr = Number(manual.currentPriceInr);

    if (!symbol || !assetClass) {
      setError("Symbol and asset class are required.");
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError("Quantity must be greater than 0.");
      return;
    }

    if (!Number.isFinite(averageBuyPriceInr) || averageBuyPriceInr < 0) {
      setError("Average buy price must be 0 or greater.");
      return;
    }

    if (!Number.isFinite(currentPriceInr) || currentPriceInr < 0) {
      setError("Current price must be 0 or greater.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = await callHoldingsEndpoint("POST", {
        mode: "manual",
        holding: {
          instrumentSymbol: symbol,
          instrumentName: manual.name.trim() || symbol,
          assetClass,
          sector: manual.sector.trim(),
          quantity,
          averageBuyPriceInr,
          currentPriceInr,
        },
      });

      applySnapshot(payload);
      setSuccess("Holding saved and analytics refreshed.");

      setManual((previous) => ({
        ...previous,
        symbol: "",
        name: "",
        quantity: "",
        averageBuyPriceInr: "",
        currentPriceInr: "",
      }));

      onHoldingsChanged?.();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not save holding.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCsvUpload(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    input.value = "";

    if (!file) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const csvText = await file.text();
      const parsed = parseCsvText(csvText);

      if (parsed.errors.length > 0) {
        throw new Error(parsed.errors.slice(0, 6).join(" "));
      }

      if (parsed.holdings.length === 0) {
        throw new Error("CSV contains no valid rows.");
      }

      const payload = await callHoldingsEndpoint("POST", {
        mode: "csv",
        holdings: parsed.holdings,
      });

      applySnapshot(payload);

      const importedCount = payload.importedCount ?? parsed.holdings.length;
      setSuccess(`${importedCount} holdings imported from CSV.`);

      onHoldingsChanged?.();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not import CSV.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const pnlClassName = snapshot.analytics.totalUnrealizedPnlInr >= 0 ? "text-finance-green" : "text-finance-red";

  return (
    <section className="rounded-2xl border border-finance-border bg-finance-panel p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-finance-muted">Portfolio Tracking</p>
          <h2 className="mt-1 text-2xl font-semibold text-finance-text">Holdings Analyzer</h2>
          <p className="mt-1 text-sm text-finance-muted">
            Add holdings manually or via CSV and monitor allocation, sector exposure, and concentration risk.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadSnapshot()}
          disabled={isLoading || isSubmitting}
          className="inline-flex items-center gap-2 rounded-full border border-finance-border px-4 py-2 text-sm font-semibold text-finance-text hover:bg-finance-surface disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          Refresh holdings
        </button>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-finance-red/25 bg-finance-red/10 p-3 text-sm text-finance-red">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="mt-4 rounded-lg border border-finance-green/25 bg-finance-green/10 p-3 text-sm text-finance-green">
          {success}
        </div>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <form onSubmit={handleManualSubmit} className="rounded-xl border border-finance-border bg-finance-surface/70 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-finance-muted">Manual Entry</p>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input
              value={manual.symbol}
              onChange={(event) => updateManualField("symbol", event.target.value)}
              placeholder="Symbol (RELIANCE)"
              className="h-10 rounded-lg border border-finance-border bg-white px-3 text-sm text-finance-text focus:outline-none focus:ring-2 focus:ring-finance-accent/25"
            />
            <input
              value={manual.name}
              onChange={(event) => updateManualField("name", event.target.value)}
              placeholder="Name (optional)"
              className="h-10 rounded-lg border border-finance-border bg-white px-3 text-sm text-finance-text focus:outline-none focus:ring-2 focus:ring-finance-accent/25"
            />
            <input
              value={manual.assetClass}
              onChange={(event) => updateManualField("assetClass", event.target.value)}
              placeholder="Asset Class (Equity)"
              className="h-10 rounded-lg border border-finance-border bg-white px-3 text-sm text-finance-text focus:outline-none focus:ring-2 focus:ring-finance-accent/25"
            />
            <input
              value={manual.sector}
              onChange={(event) => updateManualField("sector", event.target.value)}
              placeholder="Sector (optional)"
              className="h-10 rounded-lg border border-finance-border bg-white px-3 text-sm text-finance-text focus:outline-none focus:ring-2 focus:ring-finance-accent/25"
            />
            <input
              type="number"
              step="0.000001"
              value={manual.quantity}
              onChange={(event) => updateManualField("quantity", event.target.value)}
              placeholder="Quantity"
              className="h-10 rounded-lg border border-finance-border bg-white px-3 text-sm text-finance-text focus:outline-none focus:ring-2 focus:ring-finance-accent/25"
            />
            <input
              type="number"
              step="0.01"
              value={manual.averageBuyPriceInr}
              onChange={(event) => updateManualField("averageBuyPriceInr", event.target.value)}
              placeholder="Avg Buy Price (INR)"
              className="h-10 rounded-lg border border-finance-border bg-white px-3 text-sm text-finance-text focus:outline-none focus:ring-2 focus:ring-finance-accent/25"
            />
            <input
              type="number"
              step="0.01"
              value={manual.currentPriceInr}
              onChange={(event) => updateManualField("currentPriceInr", event.target.value)}
              placeholder="Current Price (INR)"
              className="h-10 rounded-lg border border-finance-border bg-white px-3 text-sm text-finance-text focus:outline-none focus:ring-2 focus:ring-finance-accent/25 md:col-span-2"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-finance-accent px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save Holding
          </button>
        </form>

        <div className="rounded-xl border border-finance-border bg-finance-surface/70 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-finance-muted">CSV Upload</p>
          <p className="mt-2 text-sm text-finance-muted">
            Expected columns: symbol,name,asset_class,sector,quantity,average_buy_price_inr,current_price_inr
          </p>

          <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full border border-finance-border bg-white px-4 py-2 text-sm font-semibold text-finance-text hover:bg-finance-surface">
            <Upload className="h-4 w-4" />
            Upload CSV
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvUpload} disabled={isSubmitting} />
          </label>

          <p className="mt-3 text-xs text-finance-muted">
            Duplicate symbols in the same upload are automatically merged using the latest row.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-finance-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading holdings analytics...
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-xl border border-finance-border bg-finance-panel p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-finance-muted">Total Market Value</p>
              <p className="mt-2 text-xl font-semibold text-finance-text">{formatCurrency(snapshot.analytics.totalMarketValueInr)}</p>
            </article>

            <article className="rounded-xl border border-finance-border bg-finance-panel p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-finance-muted">Total Cost</p>
              <p className="mt-2 text-xl font-semibold text-finance-text">{formatCurrency(snapshot.analytics.totalCostValueInr)}</p>
            </article>

            <article className="rounded-xl border border-finance-border bg-finance-panel p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-finance-muted">Unrealized P/L</p>
              <p className={`mt-2 text-xl font-semibold ${pnlClassName}`}>{formatCurrency(snapshot.analytics.totalUnrealizedPnlInr)}</p>
            </article>

            <article className="rounded-xl border border-finance-border bg-finance-panel p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-finance-muted">Holdings</p>
              <p className="mt-2 text-xl font-semibold text-finance-text">{snapshot.holdings.length}</p>
            </article>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-xl border border-finance-border bg-finance-panel p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-finance-muted">Allocation by Asset Class</p>
              {chartData.length > 0 ? (
                <AllocationChart data={chartData} />
              ) : (
                <p className="mt-3 text-sm text-finance-muted">No holdings yet to render allocation chart.</p>
              )}

              <div className="mt-3 grid gap-2">
                {snapshot.analytics.allocationByAssetClass.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm text-finance-text">
                    <span>{item.name}</span>
                    <span>{formatPercent(item.value)}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-xl border border-finance-border bg-finance-panel p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-finance-muted">Sector Exposure</p>
              {snapshot.analytics.sectorExposure.length === 0 ? (
                <p className="mt-3 text-sm text-finance-muted">No sector data available yet.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {snapshot.analytics.sectorExposure.map((item) => (
                    <div key={item.name} className="rounded-lg border border-finance-border bg-finance-surface p-2">
                      <div className="flex items-center justify-between text-sm text-finance-text">
                        <span>{item.name}</span>
                        <span>{formatPercent(item.value)}</span>
                      </div>
                      <p className="mt-1 text-xs text-finance-muted">{formatCurrency(item.marketValueInr)}</p>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>

          <section className="rounded-xl border border-finance-border bg-finance-panel p-4">
            <div className="flex items-center gap-2">
              <TriangleAlert className="h-4 w-4 text-finance-muted" />
              <p className="text-xs uppercase tracking-[0.14em] text-finance-muted">Concentration Warnings</p>
            </div>

            {snapshot.analytics.concentrationWarnings.length === 0 ? (
              <p className="mt-3 text-sm text-finance-muted">
                No major concentration flags detected based on current holdings.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {snapshot.analytics.concentrationWarnings.map((warning) => (
                  <div key={warning.id} className={`rounded-lg border p-3 text-sm ${getWarningClassName(warning.severity)}`}>
                    <p className="font-semibold">{warning.title}</p>
                    <p className="mt-1">{warning.message}</p>
                    {warning.metricPct !== null ? (
                      <p className="mt-1 text-xs opacity-80">Metric: {formatPercent(warning.metricPct)}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-finance-border bg-finance-panel p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-finance-muted">Holdings Table</p>

            {snapshot.holdings.length === 0 ? (
              <p className="mt-3 text-sm text-finance-muted">No holdings saved yet.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="text-finance-muted">
                      <th className="px-2 py-2 font-medium">Symbol</th>
                      <th className="px-2 py-2 font-medium">Asset</th>
                      <th className="px-2 py-2 font-medium">Sector</th>
                      <th className="px-2 py-2 font-medium">Qty</th>
                      <th className="px-2 py-2 font-medium">Avg</th>
                      <th className="px-2 py-2 font-medium">Current</th>
                      <th className="px-2 py-2 font-medium">Value</th>
                      <th className="px-2 py-2 font-medium">P/L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.holdings.map((holding) => (
                      <tr key={`${holding.id}-${holding.instrumentSymbol}`} className="border-t border-finance-border">
                        <td className="px-2 py-2 font-semibold text-finance-text">{holding.instrumentSymbol}</td>
                        <td className="px-2 py-2 text-finance-text">{holding.assetClass}</td>
                        <td className="px-2 py-2 text-finance-muted">{holding.sector ?? "Unclassified"}</td>
                        <td className="px-2 py-2 text-finance-text">{holding.quantity}</td>
                        <td className="px-2 py-2 text-finance-text">{formatCurrency(holding.averageBuyPriceInr)}</td>
                        <td className="px-2 py-2 text-finance-text">{formatCurrency(holding.currentPriceInr)}</td>
                        <td className="px-2 py-2 text-finance-text">{formatCurrency(holding.marketValueInr)}</td>
                        <td
                          className={`px-2 py-2 font-semibold ${
                            holding.unrealizedPnlInr >= 0 ? "text-finance-green" : "text-finance-red"
                          }`}
                        >
                          {formatCurrency(holding.unrealizedPnlInr)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  );
}