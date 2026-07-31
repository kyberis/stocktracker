import { normalizeHkYahooSymbol } from "@/lib/market-symbol";

const OPENFIGI_URL = "https://api.openfigi.com/v3/mapping";

// Without API key: max 10 jobs per request, 25 requests/minute.
// With API key: max 100 jobs per request, 25 requests/6 seconds.
const MAX_JOBS_PER_REQUEST = process.env.OPENFIGI_API_KEY ? 100 : 10;

// Bloomberg exchCode → Yahoo Finance suffix
const EXCHCODE_TO_YAHOO_SUFFIX: Record<string, string> = {
  US: "", UA: "", UW: "", UN: "", UP: "", UF: "",
  GR: ".DE", GF: ".F",
  LN: ".L",
  NA: ".AS",
  BB: ".BR",
  FP: ".PA",
  SM: ".MC",
  IM: ".MI",
  DC: ".CO",
  FH: ".HE",
  SS: ".ST",
  NO: ".OL",
  SW: ".SW",
  AV: ".VI",
  CT: ".TO",
  AU: ".AX",
  HK: ".HK",
  SP: ".SI",
  JP: ".T",
};

export interface FigiResolution {
  figiShareClass: string;
  ticker: string;
  exchCode: string;
  name: string;
}

/**
 * Resolve FIGI share classes to current tickers via the OpenFIGI API.
 * Batches requests to stay within rate limits and returns one resolution
 * per input FIGI (picking the best matching venue for the target exchange).
 *
 * @param items - Array of { figiShareClass, preferredYahooSuffix } to resolve.
 *   preferredYahooSuffix (e.g. ".DE") is used to pick the best venue match.
 * @returns Map of figiShareClass → resolved Yahoo-compatible ticker
 */
export async function batchResolveFigi(
  items: { figiShareClass: string; preferredYahooSuffix: string }[],
): Promise<Map<string, FigiResolution>> {
  if (items.length === 0) return new Map();

  const results = new Map<string, FigiResolution>();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.OPENFIGI_API_KEY) {
    headers["X-OPENFIGI-APIKEY"] = process.env.OPENFIGI_API_KEY;
  }

  for (let i = 0; i < items.length; i += MAX_JOBS_PER_REQUEST) {
    const batch = items.slice(i, i + MAX_JOBS_PER_REQUEST);
    const jobs = batch.map((item) => ({
      idType: "SHARE_CLASS_FIGI",
      idValue: item.figiShareClass,
      marketSecDes: "Equity",
    }));

    let responseData: Array<{ data?: Array<Record<string, string>>; error?: string }>;
    try {
      const res = await fetch(OPENFIGI_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(jobs),
      });
      if (!res.ok) {
        console.warn(`[OpenFIGI] HTTP ${res.status}: ${await res.text().catch(() => "")}`);
        continue;
      }
      responseData = await res.json();
    } catch (err) {
      console.warn("[OpenFIGI] Request failed:", err instanceof Error ? err.message : err);
      continue;
    }

    for (let j = 0; j < batch.length; j++) {
      const item = batch[j];
      const result = responseData[j];
      if (!result?.data?.length) continue;

      const equityResults = result.data.filter(
        (d) => d.marketSector === "Equity" && d.ticker,
      );
      if (equityResults.length === 0) continue;

      // Try to match the preferred exchange first
      const preferred = item.preferredYahooSuffix;
      let best = equityResults[0];
      for (const entry of equityResults) {
        const suffix = EXCHCODE_TO_YAHOO_SUFFIX[entry.exchCode] ?? null;
        if (suffix === preferred) {
          best = entry;
          break;
        }
      }

      const suffix = EXCHCODE_TO_YAHOO_SUFFIX[best.exchCode] ?? "";
      const yahooTicker = normalizeHkYahooSymbol(
        suffix ? `${best.ticker}${suffix}` : best.ticker,
      );

      results.set(item.figiShareClass, {
        figiShareClass: item.figiShareClass,
        ticker: yahooTicker,
        exchCode: best.exchCode,
        name: best.name || yahooTicker,
      });
    }
  }

  return results;
}
