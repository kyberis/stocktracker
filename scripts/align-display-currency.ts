#!/usr/bin/env npx tsx
/**
 * P3 — Align holding display_currency to quote currency when purchase≈quote units.
 * Also marks open portfolio_anomalies that only contain non-actionable currency_mismatch
 * noise as fixed (after the auditor policy change).
 *
 * Usage:
 *   npx tsx scripts/align-display-currency.ts           # dry-run
 *   npx tsx scripts/align-display-currency.ts --apply   # write
 *
 * Reads Turso from `.env.production.local` (stocktracker_TURSO_*).
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@libsql/client";
import YahooFinance from "yahoo-finance2";

function loadDotEnv(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const raw = readFileSync(resolve(path), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([A-Za-z][A-Za-z0-9_]*)=(.*)$/);
      if (!m) continue;
      let val = m[2];
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      out[m[1]] = val;
    }
  } catch {
    // ignore
  }
  return out;
}

function normalizeCurrency(c: string): string {
  const u = c.trim().toUpperCase();
  if (u === "GBP") return "GBP";
  if (u === "GBp" || u === "GBX") return "GBX";
  return u;
}

function sleep(ms: number) {
  return Promise.resolve().then(() => new Promise((r) => setTimeout(r, ms)));
}

async function main() {
  const apply = process.argv.includes("--apply");
  const env = {
    ...loadDotEnv(".env.production.local"),
    ...loadDotEnv(".env.local"),
  };
  const url =
    process.env.stocktracker_TURSO_DATABASE_URL ||
    env.stocktracker_TURSO_DATABASE_URL ||
    env.TREFOLIO_TURSO_DATABASE_URL;
  const token =
    process.env.stocktracker_TURSO_AUTH_TOKEN ||
    env.stocktracker_TURSO_AUTH_TOKEN ||
    env.TREFOLIO_TURSO_AUTH_TOKEN;
  if (!url || !token) {
    console.error("Missing Turso credentials");
    process.exit(1);
  }

  const client = createClient({ url, authToken: token });
  const yahoo = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

  console.log(`mode=${apply ? "APPLY" : "DRY-RUN"}`);

  const holdings = await client.execute({
    sql: `SELECT h.id, h.user_id, u.username, h.ticker, h.display_currency, h.purchase_price, h.exchange, h.shares
          FROM holdings h
          JOIN users u ON u.id = h.user_id
          WHERE h.shares > 0 AND TRIM(h.ticker) != ''
          ORDER BY u.username, h.ticker`,
    args: [],
  });

  const quoteCache = new Map<string, { price: number; currency: string } | null>();
  async function getQuote(symbol: string) {
    if (quoteCache.has(symbol)) return quoteCache.get(symbol)!;
    try {
      const q = (await yahoo.quote(symbol)) as {
        regularMarketPrice?: number;
        currency?: string;
      };
      const price = Number(q.regularMarketPrice || 0);
      if (!(price > 0)) {
        quoteCache.set(symbol, null);
        return null;
      }
      const currency = normalizeCurrency(String(q.currency || "USD"));
      const result = { price, currency };
      quoteCache.set(symbol, result);
      return result;
    } catch {
      quoteCache.set(symbol, null);
      return null;
    }
  }

  type Align = {
    id: string;
    username: string;
    ticker: string;
    from: string;
    to: string;
    purchase: number;
    quote: number;
  };
  const aligns: Align[] = [];

  for (const row of holdings.rows) {
    const ticker = String(row.ticker || "");
    const display = normalizeCurrency(String(row.display_currency || "EUR"));
    const purchase = Number(row.purchase_price) || 0;
    const quote = await getQuote(ticker);
    await sleep(40);
    if (!quote) continue;

    let quoteCur = quote.currency;
    let quotePrice = quote.price;
    // LSE pence often mislabeled GBP
    if (/\.L$/i.test(ticker) && quoteCur === "GBP" && quotePrice >= 50) {
      quoteCur = "GBX";
    }

    if (
      display === quoteCur ||
      (display === "GBP" && quoteCur === "GBX") ||
      (display === "GBX" && quoteCur === "GBP")
    ) {
      continue;
    }

    if (!(purchase > 0 && Math.abs(purchase - quotePrice) / quotePrice < 0.1)) {
      continue;
    }

    let to = quoteCur;
    // Crypto pairs: trust quote currency encoded in the ticker.
    const cryptoPair = ticker.match(/^[A-Z0-9]+-(EUR|USD|GBP|INR|BTC)$/i);
    if (cryptoPair) {
      to = cryptoPair[1].toUpperCase();
    }
    // Do not reinterpret £-priced LSE quotes as GBX here — Yahoo already labels GBp/GBX when pence.

    if (display === to) continue;
    aligns.push({
      id: String(row.id),
      username: String(row.username),
      ticker,
      from: display,
      to,
      purchase,
      quote: quotePrice,
    });
  }

  console.log(`\n=== ALIGN display_currency (${aligns.length}) ===`);
  for (const a of aligns) {
    console.log(
      JSON.stringify({
        user: a.username,
        ticker: a.ticker,
        from: a.from,
        to: a.to,
        purchase: a.purchase,
        quote: a.quote,
      }),
    );
  }

  if (apply) {
    for (const a of aligns) {
      await client.execute({
        sql: `UPDATE holdings SET display_currency = ? WHERE id = ?`,
        args: [a.to, a.id],
      });
      console.log(JSON.stringify({ applied: true, id: a.id, ticker: a.ticker, to: a.to }));
    }
  }

  // Mark currency_mismatch-only noise anomalies as fixed
  const anomalies = await client.execute({
    sql: `SELECT id, user_id, codes_json, status
          FROM portfolio_anomalies
          WHERE status IN ('open', 'acked')`,
    args: [],
  });

  type Noise = { id: string; codes: string[] };
  const noise: Noise[] = [];
  for (const row of anomalies.rows) {
    let codes: string[] = [];
    try {
      codes = JSON.parse(String(row.codes_json || "[]")) as string[];
    } catch {
      codes = [];
    }
    if (!Array.isArray(codes) || codes.length === 0) continue;
    const onlyCurrency = codes.every((c) => c === "currency_mismatch");
    if (!onlyCurrency) continue;

    // After P3 policy, currency-only anomaly rows are noise (or already aligned).
    // Next scan will recreate if a true auto-align case remains.
    noise.push({ id: String(row.id), codes });
  }

  console.log(`\n=== CLEAR currency-only anomalies (${noise.length}) ===`);
  for (const n of noise.slice(0, 50)) {
    console.log(JSON.stringify({ anomalyId: n.id, codes: n.codes }));
  }
  if (noise.length > 50) console.log(`... and ${noise.length - 50} more`);

  if (apply) {
    for (const n of noise) {
      await client.execute({
        sql: `UPDATE portfolio_anomalies
              SET status = 'fixed',
                  resolved_at = datetime('now'),
                  resolved_by = 'script:p3-currency',
                  updated_at = datetime('now')
              WHERE id = ?`,
        args: [n.id],
      });
    }
  }

  console.log("\n=== SUMMARY ===");
  console.log(
    JSON.stringify({
      aligns: aligns.length,
      anomaliesCleared: noise.length,
      apply,
    }),
  );
  client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
