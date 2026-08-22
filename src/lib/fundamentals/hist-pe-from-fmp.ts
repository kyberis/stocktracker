import { averageAnnualPe } from "@/lib/screening/data/fmp-fundamentals";

const FMP_STABLE_BASE = "https://financialmodelingprep.com/stable";

const FETCH_TIMEOUT_MS = 8_000;

/**
 * Mean annual P/E from FMP `ratios` (annual). Used by Warren valuation when overview
 * alone cannot supply a multi-year average.
 */
export async function fetchFmpHistoricalPeAverage(
  symbol: string,
): Promise<{ histPeAvg: number | null; histPeYears: number }> {
  const apiKey = process.env.FMP_API_KEY?.trim();
  if (!apiKey) return { histPeAvg: null, histPeYears: 0 };

  try {
    const url = new URL(`${FMP_STABLE_BASE}/ratios`);
    url.searchParams.set("symbol", symbol.trim().toUpperCase());
    url.searchParams.set("period", "annual");
    url.searchParams.set("limit", "10");
    url.searchParams.set("apikey", apiKey);

    const res = await fetch(url.toString(), {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return { histPeAvg: null, histPeYears: 0 };

    const data = (await res.json()) as unknown;
    const rows = Array.isArray(data) ? data : [];
    return averageAnnualPe(rows);
  } catch {
    return { histPeAvg: null, histPeYears: 0 };
  }
}
