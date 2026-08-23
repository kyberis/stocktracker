import { NextRequest } from "next/server";
import { withCronLogging, verifyCronAuth } from "@/lib/cron-logging";
import screenerUniverse from "@/../data/screener-universe.json";
import { resolveScreenerSyncTargets, syncScreenerTickers } from "@/lib/screener-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function createSync(offset = 0, limit = 0) {
  return withCronLogging("screener-sync", async () => {
    const allTickers: string[] = screenerUniverse.tickers;
    if (limit > 0) {
      const tickers = allTickers.slice(offset, offset + limit);
      const result = await syncScreenerTickers(tickers);
      return { ...result, mode: "manual_slice" };
    }

    const targets = await resolveScreenerSyncTargets();
    const result = await syncScreenerTickers(targets.tickers);
    return { ...result, mode: "holdings_hot", holdings: targets.holdings, hot: targets.hot };
  });
}

export async function GET(request: NextRequest) {
  const denied = verifyCronAuth("screener-sync", request);
  if (denied) return denied;

  const url = new URL(request.url);
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);
  const limit = parseInt(url.searchParams.get("limit") || "0", 10);

  const runSync = createSync(offset, limit);
  return runSync();
}
