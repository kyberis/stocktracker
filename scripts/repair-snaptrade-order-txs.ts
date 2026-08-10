#!/usr/bin/env npx tsx
/**
 * Repair missing SnapTrade order transactions for suarez84@gmail.com using the
 * latest fetchAllHoldings:raw log (EXECUTED orders already returned by SnapTrade).
 *
 *   npx tsx scripts/repair-snaptrade-order-txs.ts
 *   npx tsx scripts/repair-snaptrade-order-txs.ts --apply
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@libsql/client";
import { randomUUID } from "crypto";

for (const envFile of [".env.production.local", ".env.local"]) {
  try {
    const envContent = readFileSync(resolve(__dirname, "..", envFile), "utf-8");
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
  } catch {
    /* optional */
  }
}

const apply = process.argv.includes("--apply");
const EMAIL = "suarez84@gmail.com";
const PORTFOLIO_ID = "8a0d7248-9318-49f7-8d1c-3dfd34950943";
const LOG_ID = "aeba231a-5002-4961-870c-4544853a1d1b"; // latest holdings raw with orders

const url = process.env.stocktracker_TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL!;
const token = process.env.stocktracker_TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN!;
const client = createClient({ url, authToken: token });

function fingerprint(date: string, type: string, ticker: string, shares: number) {
  return `${date}|${type}|${ticker.toUpperCase()}|${Math.round(Math.abs(shares) * 1000)}`;
}

function parseNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

async function main() {
  const userRes = await client.execute({ sql: "SELECT id FROM users WHERE email = ?", args: [EMAIL] });
  const userId = String(userRes.rows[0]?.id || "");
  if (!userId) throw new Error("user not found");

  const logRes = await client.execute({
    sql: "SELECT response_body FROM snaptrade_api_logs WHERE id = ?",
    args: [LOG_ID],
  });
  const accounts = JSON.parse(String(logRes.rows[0]?.response_body || "[]"));
  const orders = accounts[0]?.orders || [];
  const institution = String(accounts[0]?.account?.institution_name || "DEGIRO");

  const existingFp = new Set<string>();
  const existingRefs = new Set<string>();
  const txRes = await client.execute({
    sql: `SELECT date, type, ticker, shares, source_ref FROM transactions WHERE user_id = ?`,
    args: [userId],
  });
  for (const r of txRes.rows) {
    if (["buy", "sell"].includes(String(r.type))) {
      existingFp.add(fingerprint(String(r.date), String(r.type), String(r.ticker), Number(r.shares)));
    }
    if (r.source_ref) existingRefs.add(String(r.source_ref));
  }

  type NewTx = {
    date: string;
    type: "buy" | "sell";
    ticker: string;
    name: string;
    shares: number;
    price: number;
    currency: string;
    sourceRef: string;
  };
  const toInsert: NewTx[] = [];

  for (const o of orders) {
    const status = String(o.status || "").toUpperCase();
    if (status !== "EXECUTED" && status !== "PARTIAL") continue;
    const action = String(o.action || "").toUpperCase();
    let type: "buy" | "sell" | null = null;
    if (action === "BUY" || action === "BUY_OPEN" || action === "BUY_COVER") type = "buy";
    else if (action === "SELL" || action === "SELL_CLOSE" || action === "SELL_SHORT") type = "sell";
    if (!type) continue;

    const sym = o.universal_symbol;
    const ticker = String(sym?.symbol || sym?.raw_symbol || "");
    if (!ticker) continue;
    const filled = parseNum(o.filled_quantity);
    const total = parseNum(o.total_quantity);
    const shares = Math.abs(filled > 0 ? filled : total);
    if (shares <= 0) continue;
    const price = Math.abs(parseNum(o.execution_price) || parseNum(o.limit_price));
    const date = String(o.time_executed || o.time_placed || "").slice(0, 10);
    if (!date) continue;
    const sourceRef = o.brokerage_order_id ? `snaptrade-order:${o.brokerage_order_id}` : "";
    if (sourceRef && existingRefs.has(sourceRef)) continue;
    const fp = fingerprint(date, type, ticker, shares);
    if (existingFp.has(fp)) continue;

    // One-off repair scope: trades missing after the Aug reconnect / activity lag.
    if (!["ZTS", "ICGA.DE"].includes(ticker)) continue;
    if (date < "2026-08-09") continue;

    toInsert.push({
      date,
      type,
      ticker,
      name: String(sym?.description || ticker),
      shares,
      price,
      currency: String(sym?.currency?.code || "USD"),
      sourceRef,
    });
    existingFp.add(fp);
  }

  console.log(`Found ${toInsert.length} missing EXECUTED orders from SnapTrade log ${LOG_ID}:`);
  for (const tx of toInsert) {
    console.log(`  ${tx.date} ${tx.type} ${tx.ticker} x${tx.shares} @ ${tx.price} ${tx.currency} ${tx.sourceRef}`);
  }

  if (!apply) {
    console.log("\nDry-run. Re-run with --apply to insert + clear watermark + remove ghost ICGA if sold.");
    return;
  }

  await client.execute({
    sql: "UPDATE snaptrade_broker_syncs SET last_imported_at = '' WHERE user_id = ? AND brokerage_name = 'DEGIRO'",
    args: [userId],
  });
  console.log("Cleared DEGIRO last_imported_at");

  for (const tx of toInsert) {
    const id = randomUUID();
    const total = +(tx.shares * tx.price).toFixed(2);
    await client.execute({
      sql: `INSERT INTO transactions (
        id, user_id, holding_id, ticker, name, exchange, isin, asset_type, account_id,
        type, date, shares, price_per_share, total_amount, fees, taxes, currency, display_currency,
        notes, source_ref, broker_name, portfolio_id
      ) VALUES (?, ?, '', ?, ?, '', '', 'stock', '', ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        userId,
        tx.ticker,
        tx.name,
        tx.type,
        tx.date,
        tx.shares,
        tx.price,
        total,
        tx.currency,
        tx.currency,
        `SnapTrade · ${institution}`,
        tx.sourceRef,
        institution,
        PORTFOLIO_ID,
      ],
    });
  }
  console.log(`Inserted ${toInsert.length} transactions`);

  // Remove ICGA ghost holding if sell fully covers buys (positions already show 0)
  const icgaSell = toInsert.find((t) => t.ticker === "ICGA.DE" && t.type === "sell");
  if (icgaSell) {
    await client.execute({
      sql: `DELETE FROM holdings WHERE user_id = ? AND portfolio_id = ? AND ticker = 'ICGA.DE' AND source = 'transaction'`,
      args: [userId, PORTFOLIO_ID],
    });
    console.log("Removed ghost ICGA.DE transaction holding");
  }

  // NA9 full exit
  const na9Sell = toInsert.find((t) => t.ticker === "NA9.DE" && t.type === "sell");
  if (na9Sell) {
    await client.execute({
      sql: `DELETE FROM holdings WHERE user_id = ? AND portfolio_id = ? AND ticker = 'NA9.DE' AND source != 'snaptrade'`,
      args: [userId, PORTFOLIO_ID],
    });
    console.log("Removed ghost NA9.DE holding if present");
  }

  const check = await client.execute({
    sql: `SELECT type, ticker, shares, date, source_ref FROM transactions
          WHERE user_id = ? AND (ticker IN ('ZTS','ICGA.DE','NA9.DE') OR source_ref LIKE 'snaptrade-order:%')
          ORDER BY date DESC LIMIT 20`,
    args: [userId],
  });
  console.log("Recent relevant txs:", check.rows);

  const holds = await client.execute({
    sql: `SELECT ticker, shares, source FROM holdings WHERE user_id = ? AND ticker IN ('ZTS','ICGA.DE','NA9.DE')`,
    args: [userId],
  });
  console.log("Holdings:", holds.rows);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
