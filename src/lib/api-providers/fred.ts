import type { EconIndicatorResult } from "./types";

const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";

interface FredSeries {
  id: string;
  name: string;
  unit: string;
}

const SERIES: Record<string, FredSeries> = {
  REAL_GDP: { id: "GDPC1", name: "Real GDP", unit: "billions of chained dollars" },
  REAL_GDP_PER_CAPITA: {
    id: "A939RX0Q048SBEA",
    name: "Real GDP per capita",
    unit: "chained dollars",
  },
  FEDERAL_FUNDS_RATE: { id: "FEDFUNDS", name: "Federal funds rate", unit: "percent" },
  CPI: { id: "CPIAUCSL", name: "CPI", unit: "index" },
  INFLATION: { id: "FPCPITOTLZGUSA", name: "Inflation", unit: "percent" },
  RETAIL_SALES: { id: "RSXFS", name: "Retail sales", unit: "millions of dollars" },
  DURABLES: { id: "DGORDER", name: "Durable goods orders", unit: "millions of dollars" },
  UNEMPLOYMENT: { id: "UNRATE", name: "Unemployment rate", unit: "percent" },
  NONFARM_PAYROLL: { id: "PAYEMS", name: "Nonfarm payrolls", unit: "thousands of persons" },
};

const TREASURY: Record<string, FredSeries> = {
  "3month": { id: "DGS3MO", name: "Treasury 3month", unit: "percent" },
  "2year": { id: "DGS2", name: "Treasury 2year", unit: "percent" },
  "5year": { id: "DGS5", name: "Treasury 5year", unit: "percent" },
  "7year": { id: "DGS7", name: "Treasury 7year", unit: "percent" },
  "10year": { id: "DGS10", name: "Treasury 10year", unit: "percent" },
  "30year": { id: "DGS30", name: "Treasury 30year", unit: "percent" },
};

export function fredSeriesFor(func: string, maturity?: string): FredSeries | null {
  if (func === "TREASURY_YIELD") return TREASURY[maturity || "10year"] ?? TREASURY["10year"]!;
  return SERIES[func] ?? null;
}

export function getFredApiKey(): string {
  return process.env.FRED_API_KEY?.trim() || "";
}

interface FredObservation {
  date?: string;
  value?: string;
}

/** Latest observations for one FRED series. No account or portfolio data is sent. */
export async function fetchFredIndicator(
  func: string,
  maturity?: string,
): Promise<EconIndicatorResult | null> {
  const series = fredSeriesFor(func, maturity);
  const apiKey = getFredApiKey();
  if (!series || !apiKey) return null;

  const url = new URL(FRED_BASE);
  url.searchParams.set("series_id", series.id);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("sort_order", "desc");
  url.searchParams.set("limit", "120");

  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) {
    throw new Error(`FRED ${series.id}: ${res.status}`);
  }
  const json = (await res.json()) as { observations?: FredObservation[] };
  const data = (json.observations ?? [])
    .map((row) => {
      const raw = row.value;
      const value = raw == null || raw === "." ? null : Number(raw);
      return {
        date: String(row.date ?? ""),
        value: value != null && Number.isFinite(value) ? value : null,
      };
    })
    .filter((row) => row.date)
    .reverse();

  if (data.length === 0) return null;
  return { name: series.name, interval: "", unit: series.unit, data };
}
