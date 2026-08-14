/**
 * Restore vsant1@eclipso.eu from AI import log (no Yahoo / quote enrichment).
 *
 *   set -a && source .env.production.local && set +a
 *   npx tsx scripts/restore-vsant1-holdings.ts [--dry-run]
 */
import { randomUUID } from "node:crypto";
import { ensureInitialized } from "../src/lib/db/client";
import { holdingAssetType } from "../src/lib/db/helpers";
import { deriveHoldingsFromTransactions } from "../src/lib/derive-holdings";
import type { Transaction } from "../src/lib/types";

const USER_ID = "d6ff4e06-7f73-4bff-99c7-1f9916ba87f0";
const PORTFOLIO_ID = "84fed019-e0fc-4306-bf83-48ccb9c25a37";
const SOURCE_LOG_AT = "2026-07-24 14:48:25";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const client = await ensureInitialized();

  const [hCnt, tCnt] = await Promise.all([
    client.execute({ sql: "SELECT COUNT(*) as c FROM holdings WHERE user_id = ?", args: [USER_ID] }),
    client.execute({ sql: "SELECT COUNT(*) as c FROM transactions WHERE user_id = ?", args: [USER_ID] }),
  ]);
  if (Number(hCnt.rows[0]?.c) > 0 || Number(tCnt.rows[0]?.c) > 0) {
    console.error("Abort: user already has holdings/txs");
    process.exit(1);
  }

  const log = await client.execute({
    sql: `SELECT response FROM ai_logs WHERE user_id = ? AND source = 'import' AND created_at = ? LIMIT 1`,
    args: [USER_ID, SOURCE_LOG_AT],
  });
  const raw = String(log.rows[0]?.response || "");
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) {
    console.error("AI JSON missing");
    process.exit(1);
  }
  const parsed = JSON.parse(m[0]) as {
    holdings?: Array<Record<string, unknown>>;
    transactions?: Array<Record<string, unknown>>;
  };

  const meta = new Map<string, { exchange: string; assetType: string; isin: string; name: string }>();
  for (const h of parsed.holdings || []) {
    const ticker = String(h.ticker || "").toUpperCase();
    if (!ticker) continue;
    meta.set(ticker, {
      exchange: String(h.exchange || "").toUpperCase(),
      assetType: holdingAssetType(h.assetType),
      isin: String(h.isin || ""),
      name: String(h.name || ticker),
    });
  }

  const txs: Transaction[] = (parsed.transactions || [])
    .filter((t) => t.ticker && t.date)
    .map((t) => {
      const ticker = String(t.ticker).toUpperCase();
      const info = meta.get(ticker);
      const shares = Math.abs(Number(t.shares) || 0);
      const pricePerShare = Math.abs(Number(t.pricePerShare) || 0);
      const currency = String(t.currency || "USD").toUpperCase();
      return {
        id: randomUUID(),
        holdingId: "",
        ticker,
        name: String(t.name || info?.name || ticker),
        exchange: info?.exchange || "",
        isin: info?.isin || "",
        assetType: holdingAssetType(info?.assetType || "stock"),
        accountId: "",
        type: (["buy", "sell", "dividend", "fee"].includes(String(t.type))
          ? String(t.type)
          : "buy") as Transaction["type"],
        date: String(t.date),
        shares,
        pricePerShare,
        totalAmount: Math.abs(Number(t.totalAmount) || shares * pricePerShare),
        fees: Math.abs(Number(t.fees) || 0),
        taxes: 0,
        currency,
        displayCurrency: currency,
        notes: "Support restore from AI import log 2026-07-24",
        sourceRef: "",
        brokerName: "interactive_brokers",
        createdAt: new Date().toISOString(),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const metadataByKey = new Map<
    string,
    { id: string; name: string; isin: string; assetType: "stock" | "etf" | "crypto" | "fund"; displayCurrency: string }
  >();
  for (const tx of txs) {
    const key = `${tx.ticker.toUpperCase()}|${(tx.exchange || "").toUpperCase()}`;
    if (!metadataByKey.has(key)) {
      metadataByKey.set(key, {
        id: randomUUID(),
        name: tx.name,
        isin: tx.isin || "",
        assetType: holdingAssetType(tx.assetType),
        displayCurrency: tx.displayCurrency || tx.currency || "USD",
      });
    }
  }
  const derived = deriveHoldingsFromTransactions(txs, metadataByKey);
  console.log(`txs=${txs.length} holdings=${derived.length}`);
  console.log(derived.map((h) => `${h.ticker}:${h.shares}`).join(", "));

  if (dryRun) {
    console.log("dry-run ok");
    return;
  }

  // Approx EUR via a fixed USD/EUR for cost display until next quote refresh
  const USD_EUR = 0.92;

  const txStmts = txs.map((tx) => ({
    sql: `INSERT INTO transactions (
            id, user_id, holding_id, ticker, name, exchange, isin, asset_type, account_id,
            type, date, shares, price_per_share, total_amount, fees, taxes, currency, display_currency,
            notes, source_ref, broker_name, portfolio_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      tx.id, USER_ID, "", tx.ticker, tx.name, tx.exchange, tx.isin, tx.assetType, "",
      tx.type, tx.date, tx.shares, tx.pricePerShare, tx.totalAmount, tx.fees, 0,
      tx.currency, tx.displayCurrency, tx.notes, "", "interactive_brokers", PORTFOLIO_ID,
    ],
  }));

  const hStmts = derived.map((h) => {
    const id = randomUUID();
    const valueEur =
      h.displayCurrency === "EUR"
        ? h.shares * h.purchasePrice
        : h.displayCurrency === "USD"
          ? h.shares * h.purchasePrice * USD_EUR
          : 0;
    return {
      sql: `INSERT INTO holdings (
              id, user_id, name, ticker, isin, asset_type, shares, purchase_price, display_currency,
              exchange, value_in_eur, sector, region, asset_class, account_id, portfolio_id, source, tags
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', '', '', ?, 'transaction', '[]')`,
      args: [
        id, USER_ID, h.name, h.ticker, h.isin || "", h.assetType || "stock",
        h.shares, h.purchasePrice, h.displayCurrency, h.exchange, valueEur, PORTFOLIO_ID,
      ],
    };
  });

  console.log("writing batch…");
  await client.batch([...txStmts, ...hStmts], "write");
  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
