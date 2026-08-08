/**
 * Offline spike helper for Tavily Research (P0).
 *
 * Usage:
 *   TAVILY_API_KEY=... npx tsx scripts/spike-tavily-research.ts AAPL MSFT
 *
 * Prints latency, estimated credits, and structured fields for go/no-go.
 */
import { fetchTavilyCompanyResearch } from "../src/lib/screening/data/tavily-research";

async function main() {
  const tickers = process.argv.slice(2).map((t) => t.toUpperCase());
  if (tickers.length === 0) {
    console.error("Usage: npx tsx scripts/spike-tavily-research.ts TICKER [TICKER…]");
    process.exit(1);
  }
  if (!process.env.TAVILY_API_KEY?.trim()) {
    console.error("TAVILY_API_KEY is required");
    process.exit(1);
  }

  for (const ticker of tickers) {
    console.log(`\n=== ${ticker} ===`);
    const result = await fetchTavilyCompanyResearch({
      ticker,
      model: "mini",
      timeoutMs: 120_000,
    });
    console.log(
      JSON.stringify(
        {
          latencyMs: result.latencyMs,
          creditsUsed: result.creditsUsed,
          requestId: result.requestId,
          errors: result.errors,
          businessOneLiner: result.businessOneLiner,
          segments: result.segments,
          catalysts: result.catalysts,
          guidanceSummary: result.guidanceSummary?.slice(0, 200),
          competitors: result.competitors,
          sourceCount: result.sources.length,
        },
        null,
        2,
      ),
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
