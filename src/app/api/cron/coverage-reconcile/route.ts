import { NextResponse } from "next/server";
import { listDistinctHoldingTickers } from "@/lib/db";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { resolveIsinToTicker } from "@/lib/api-providers/isin-resolver";
import { withCronLogging } from "@/lib/cron-logging";
import { yahooSymbolAliases } from "@/lib/market-symbol";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const BATCH = 12;

/**
 * TRF-104 — Overnight quote coverage reconciliation.
 * Flags holdings whose Yahoo (and alias) quotes fail so ops can act before users see empty analysis.
 */
const runCoverageReconcile = withCronLogging("coverage-reconcile", async () => {
  const distinct = await listDistinctHoldingTickers();
  const unique = [...new Set(distinct.map((h) => h.ticker))];
  if (unique.length === 0) {
    return { checked: 0, missing: 0, missingTickers: [] as string[] };
  }

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
      } else if (r.status === "rejected") {
        /* batch item threw — count as missing unknown */
      }
    }
  }

  if (missing.length > 0) {
    console.warn(
      `[coverage-reconcile] ${missing.length} holdings without quote coverage: ${missing.slice(0, 40).join(", ")}${missing.length > 40 ? "…" : ""}`,
    );
  }

  return { checked: unique.length, missing: missing.length, missingTickers: missing.slice(0, 100) };
});

export async function GET() {
  const result = await runCoverageReconcile();
  return NextResponse.json(result);
}
