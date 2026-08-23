import { listDistinctHoldingTickers } from "@/lib/db";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { resolveIsinToTicker } from "@/lib/api-providers/isin-resolver";
import { yahooSymbolAliases } from "@/lib/market-symbol";
import { listCoverageGaps, recordCoverageGaps } from "@/lib/coverage-gaps";

const BATCH = 12;

export async function probeQuoteCoverage(tickers: string[]): Promise<string[]> {
  const unique = [...new Set(tickers.map((t) => t.trim()).filter(Boolean))];
  if (unique.length === 0) return [];

  const yahoo = new YahooProvider();
  const missing: string[] = [];

  for (let i = 0; i < unique.length; i += BATCH) {
    const batch = unique.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(async (ticker) => {
        const candidates = [ticker, ...yahooSymbolAliases(ticker)];
        for (const candidate of candidates) {
          try {
            let resolved = await resolveIsinToTicker(yahoo, candidate);
            if (resolved.includes(" ")) resolved = resolved.replace(/\s+/g, "-");
            const q = await yahoo.getQuote(resolved);
            if (q?.regularMarketPrice && q.regularMarketPrice > 0) {
              return { ticker, ok: true as const };
            }
          } catch {
            /* try next alias */
          }
        }
        return { ticker, ok: false as const };
      }),
    );

    for (const r of results) {
      if (r.status === "fulfilled" && !r.value.ok) {
        missing.push(r.value.ticker);
      }
    }
  }

  return missing;
}

export async function runCoverageReconcileJob(): Promise<Record<string, unknown>> {
  const recorded = await listCoverageGaps();
  let source: "refresh_holdings" | "all_holdings";
  let candidates: string[];

  if (recorded && recorded.length > 0) {
    source = "refresh_holdings";
    candidates = recorded;
  } else if (recorded && recorded.length === 0) {
    return { checked: 0, missing: 0, missingTickers: [], source: "refresh_holdings", skippedNoGaps: true };
  } else {
    source = "all_holdings";
    const distinct = await listDistinctHoldingTickers();
    candidates = [...new Set(distinct.map((h) => h.ticker))];
  }

  if (candidates.length === 0) {
    return { checked: 0, missing: 0, missingTickers: [] as string[], source };
  }

  const missing = await probeQuoteCoverage(candidates);
  await recordCoverageGaps(missing);

  if (missing.length > 0) {
    console.warn(
      `[coverage-reconcile] ${missing.length} holdings without quote coverage: ${missing.slice(0, 40).join(", ")}${missing.length > 40 ? "…" : ""}`,
    );
  }

  return {
    checked: candidates.length,
    missing: missing.length,
    missingTickers: missing.slice(0, 100),
    source,
  };
}
