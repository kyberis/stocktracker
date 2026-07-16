import type { EconDataPoint, EconIndicatorResult } from "./types";

const FRED_BASE = "https://api.stlouisfed.org/fred";

/** Map Alpha Vantage / FMP function names to FRED series IDs. */
const FUNC_TO_SERIES: Record<string, string> = {
  REAL_GDP: "GDPC1",
  REAL_GDP_PER_CAPITA: "A939RX0Q048SBEA",
  FEDERAL_FUNDS_RATE: "FEDFUNDS",
  CPI: "CPIAUCSL",
  INFLATION: "FPCPITOTLZGUSA",
  RETAIL_SALES: "RSAFS",
  DURABLES: "DGORDER",
  UNEMPLOYMENT: "UNRATE",
  NONFARM_PAYROLL: "PAYEMS",
};

const TREASURY_MATURITY_TO_SERIES: Record<string, string> = {
  "3month": "DGS3MO",
  "2year": "DGS2",
  "5year": "DGS5",
  "7year": "DGS7",
  "10year": "DGS10",
  "30year": "DGS30",
};

export function getFredApiKey(): string {
  return process.env.FRED_API_KEY?.trim() || "";
}

function parseFloatOrNull(val: unknown): number | null {
  if (val === undefined || val === null || val === "." || val === "") return null;
  const n = parseFloat(String(val));
  return Number.isNaN(n) ? null : n;
}

interface FredObservation {
  date: string;
  value: string;
}

export async function fetchFredSeries(
  seriesId: string,
  apiKey: string,
): Promise<EconDataPoint[]> {
  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: apiKey,
    file_type: "json",
    sort_order: "desc",
    limit: "500",
  });
  const res = await fetch(`${FRED_BASE}/series/observations?${params}`);
  if (!res.ok) {
    throw new Error(`FRED ${seriesId}: ${res.status}`);
  }
  const json = (await res.json()) as { observations?: FredObservation[] };
  const rows = json.observations ?? [];
  return rows.map((r) => ({
    date: r.date,
    value: parseFloatOrNull(r.value),
  }));
}

export async function getFredEconomicIndicator(
  func: string,
  interval?: string,
  maturity?: string,
  apiKey = getFredApiKey(),
): Promise<EconIndicatorResult | null> {
  if (!apiKey) return null;

  if (func === "TREASURY_YIELD") {
    const mat = maturity || "10year";
    const seriesId = TREASURY_MATURITY_TO_SERIES[mat] || "DGS10";
    const data = await fetchFredSeries(seriesId, apiKey);
    return {
      name: `Treasury ${mat}`,
      interval: interval || "daily",
      unit: "percent",
      data,
    };
  }

  const seriesId = FUNC_TO_SERIES[func];
  if (!seriesId) return null;

  const data = await fetchFredSeries(seriesId, apiKey);
  return {
    name: func,
    interval: interval || "",
    unit: "",
    data,
  };
}
