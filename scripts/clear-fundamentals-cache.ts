/**
 * Purge fundamentals_cache rows (permanent cache for income/balance/cashflow/earnings).
 *
 * Usage:
 *   npx tsx scripts/clear-fundamentals-cache.ts --symbol AAPL
 *   npx tsx scripts/clear-fundamentals-cache.ts --symbol AAPL --type income
 *   npx tsx scripts/clear-fundamentals-cache.ts --all
 */
import { deleteFundamentalsCache, type FundamentalsCacheType } from "../src/lib/db/fundamentals-cache";
import { ensureInitialized } from "../src/lib/db/client";

async function main() {
  await ensureInitialized();
  const args = process.argv.slice(2);
  const all = args.includes("--all");
  const symbolIdx = args.indexOf("--symbol");
  const typeIdx = args.indexOf("--type");

  if (all) {
    const n = await deleteFundamentalsCache();
    console.log(`Deleted ${n} fundamentals_cache row(s).`);
    return;
  }

  const symbol = symbolIdx >= 0 ? args[symbolIdx + 1] : undefined;
  if (!symbol) {
    console.error("Provide --symbol TICKER or --all");
    process.exit(1);
  }

  const rawType = typeIdx >= 0 ? args[typeIdx + 1] : undefined;
  const type = rawType as FundamentalsCacheType | undefined;
  if (
    type &&
    type !== "income" &&
    type !== "balance" &&
    type !== "cashflow" &&
    type !== "earnings"
  ) {
    console.error("type must be income|balance|cashflow|earnings");
    process.exit(1);
  }

  const n = await deleteFundamentalsCache(symbol, type);
  console.log(`Deleted ${n} row(s) for ${symbol}${type ? `/${type}` : ""}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
