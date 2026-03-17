#!/usr/bin/env npx tsx
/**
 * One-off script to backfill missing `exchange` on holdings & transactions.
 *
 * For each holding with an empty exchange, searches Yahoo Finance to resolve
 * the correct exchange, then updates both the holdings and transactions tables.
 *
 * Usage:
 *   npx tsx scripts/fix-missing-exchange.ts                # dry-run (default)
 *   npx tsx scripts/fix-missing-exchange.ts --apply        # apply changes
 *   npx tsx scripts/fix-missing-exchange.ts --user <id>    # limit to one user
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@libsql/client";
import YahooFinance from "yahoo-finance2";

const EXCHANGE_SUFFIX_MAP: Record<string, string> = {
  XET: ".DE", TGD: ".DE", TDG: ".DE", FRA: ".F",
  MAD: ".MC", BME: ".MC", LSE: ".L",
  OMK: ".CO", CPH: ".CO", PAR: ".PA", AMS: ".AS",
  BRU: ".BR", MIL: ".MI", HEL: ".HE", VIE: ".VI",
  SWX: ".SW", TSE: ".TO", TOR: ".TO",
};

const YAHOO_EXCHANGE_MAP: Record<string, string> = {
  NMS: "NASDAQ", NGM: "NASDAQ", NCM: "NASDAQ",
  NYQ: "NYSE", PCX: "NYSE", BTS: "NYSE",
  GER: "XET", MCE: "MAD", EBS: "SWX",
};

function normalizeYahooExchange(raw: string): string {
  const upper = raw.toUpperCase();
  return YAHOO_EXCHANGE_MAP[upper] || upper;
}

function normalizeTickerForExchange(ticker: string, exchange: string): string {
  if (ticker.includes(".")) return ticker;
  const suffix = EXCHANGE_SUFFIX_MAP[exchange.toUpperCase()];
  return suffix ? `${ticker}${suffix}` : ticker;
}

// Load .env.local manually (no dotenv dependency needed)
try {
  const envPath = resolve(__dirname, "..", ".env.local");
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq);
    let val = trimmed.slice(eq + 1);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
} catch {}

const args = process.argv.slice(2);
const dryRun = !args.includes("--apply");
const userIdIdx = args.indexOf("--user");
const filterUserId = userIdIdx >= 0 ? args[userIdIdx + 1] : undefined;
const forceExIdx = args.indexOf("--force-exchange");
const forceExchange = forceExIdx >= 0 ? args[forceExIdx + 1] : undefined;

const tursoUrl =
  process.env.TREFOLIO_TURSO_DATABASE_URL ||
  process.env.STOCKTRACKER_TURSO_DATABASE_URL ||
  process.env.stocktracker_TURSO_DATABASE_URL;
const tursoToken =
  process.env.TREFOLIO_TURSO_AUTH_TOKEN ||
  process.env.STOCKTRACKER_TURSO_AUTH_TOKEN ||
  process.env.stocktracker_TURSO_AUTH_TOKEN;

if (!tursoUrl) {
  console.error("Missing TURSO_DATABASE_URL env var");
  process.exit(1);
}

const client = createClient({ url: tursoUrl, authToken: tursoToken });
const yahoo = new YahooFinance();

function extractExchange(quote: Record<string, unknown>): string | null {
  const raw = String(quote.exchange || quote.fullExchangeName || "");
  if (!raw) return null;
  return normalizeYahooExchange(raw);
}

async function resolveExchange(ticker: string): Promise<string | null> {
  // 1) If the ticker already has a dot suffix, try it directly
  if (ticker.includes(".")) {
    try {
      const quote = await yahoo.quote(ticker) as Record<string, unknown>;
      if (quote && Number(quote.regularMarketPrice) > 0) {
        const ex = extractExchange(quote);
        if (ex) return ex;
      }
    } catch {}
  }

  // 2) Try Yahoo search first — this returns the primary listing
  try {
    const results = await yahoo.search(ticker, { quotesCount: 8 }, { validateResult: false }) as {
      quotes?: Array<Record<string, unknown>>;
    };
    const exact = (results.quotes || []).find(
      (q) => String(q.symbol || "").toUpperCase() === ticker.toUpperCase()
        && (q.quoteType === "EQUITY" || q.quoteType === "ETF")
    );
    if (exact && exact.exchange) {
      return normalizeYahooExchange(String(exact.exchange));
    }
  } catch {}

  // 3) Try bare ticker as a quote (covers US stocks: AAPL, GOOGL, etc.)
  if (!ticker.includes(".")) {
    try {
      const quote = await yahoo.quote(ticker) as Record<string, unknown>;
      if (quote && Number(quote.regularMarketPrice) > 0) {
        const ex = extractExchange(quote);
        if (ex) return ex;
      }
    } catch {}
  }

  // 4) Last resort: try known exchange suffixes
  const suffixes = [...new Set(Object.values(EXCHANGE_SUFFIX_MAP))];
  for (const suffix of suffixes) {
    const candidate = `${ticker}${suffix}`;
    try {
      const quote = await yahoo.quote(candidate) as Record<string, unknown>;
      if (quote && Number(quote.regularMarketPrice) > 0) {
        const ex = extractExchange(quote);
        if (ex) return ex;
      }
    } catch {}
  }

  return null;
}

async function main() {
  console.log(`\n=== Fix Missing Exchange${dryRun ? " (DRY RUN)" : " (APPLYING)"} ===\n`);

  const whereUser = filterUserId ? " AND user_id = ?" : "";
  const userArgs = filterUserId ? [filterUserId] : [];

  const rows = await client.execute({
    sql: `SELECT id, user_id, ticker, name, display_currency, exchange
          FROM holdings
          WHERE (exchange IS NULL OR exchange = '')${whereUser}
          ORDER BY user_id, ticker`,
    args: userArgs,
  });

  console.log(`Found ${rows.rows.length} holdings with missing exchange.\n`);
  if (rows.rows.length === 0) {
    console.log("Nothing to fix!");
    process.exit(0);
  }

  const exchangeCache = new Map<string, string | null>();
  let updated = 0;
  let skipped = 0;

  for (const row of rows.rows) {
    const id = String(row.id);
    const userId = String(row.user_id);
    const ticker = String(row.ticker);
    const name = String(row.name);

    let exchange: string | null | undefined;
    if (forceExchange) {
      exchange = forceExchange;
    } else {
      exchange = exchangeCache.get(ticker.toUpperCase());
      if (exchange === undefined) {
        process.stdout.write(`  Looking up ${ticker}...`);
        exchange = await resolveExchange(ticker);
        exchangeCache.set(ticker.toUpperCase(), exchange);
        console.log(exchange ? ` → ${exchange}` : " → NOT FOUND");
      }
    }

    if (!exchange) {
      console.log(`  SKIP ${ticker} (${name}) — could not resolve exchange`);
      skipped++;
      continue;
    }

    const newTicker = normalizeTickerForExchange(ticker, exchange);
    console.log(`  ${dryRun ? "WOULD UPDATE" : "UPDATING"} holding ${ticker} → ticker=${newTicker}, exchange=${exchange}  [user=${userId}]`);

    if (!dryRun) {
      await client.execute({
        sql: "UPDATE holdings SET exchange = ?, ticker = ? WHERE id = ? AND user_id = ?",
        args: [exchange, newTicker, id, userId],
      });

      await client.execute({
        sql: `UPDATE transactions SET exchange = ?, ticker = ?
              WHERE user_id = ? AND UPPER(ticker) = UPPER(?) AND (exchange IS NULL OR exchange = '')`,
        args: [exchange, newTicker, userId, ticker],
      });
    }
    updated++;
  }

  console.log(`\n=== Summary ===`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
  if (dryRun) {
    console.log(`\n  This was a DRY RUN. Re-run with --apply to commit changes.`);
  }
  console.log();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
