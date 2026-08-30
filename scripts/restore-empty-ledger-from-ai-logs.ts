/**
 * Restore empty-ledger users (0 holdings + 0 txs, but snapshot history) from
 * the richest recoverable AI import log. Supports truncated JSON by salvaging
 * complete objects from the holdings / transactions arrays.
 *
 *   set -a && source .env.production.local && set +a
 *   npx tsx scripts/restore-empty-ledger-from-ai-logs.ts [--dry-run] [--user=email]
 */
import { randomUUID } from "node:crypto";
import { ensureInitialized } from "../src/lib/db/client";
import { holdingAssetType } from "../src/lib/db/helpers";
import { deriveHoldingsFromTransactions } from "../src/lib/derive-holdings";
import { sqlExcludeTestAccountEmail } from "../src/lib/test-accounts";
import type { Transaction } from "../src/lib/types";

const USD_EUR = 0.92;
const MIN_SNAP_EUR = 100;
const EXCLUDE_TEST_USERS = sqlExcludeTestAccountEmail("u.email");

type HoldingRow = Record<string, unknown>;
type TxRow = Record<string, unknown>;

type ParsedImport = {
  holdings: HoldingRow[];
  transactions: TxRow[];
  parseMode: "full" | "salvaged";
};

function extractJsonObjectsFromArray(raw: string, arrayKey: string): HoldingRow[] {
  const keyIdx = raw.search(new RegExp(`"${arrayKey}"\\s*:\\s*\\[`));
  if (keyIdx < 0) return [];
  const start = raw.indexOf("[", keyIdx);
  if (start < 0) return [];

  const out: HoldingRow[] = [];
  let i = start + 1;
  while (i < raw.length) {
    while (i < raw.length && /\s|,/.test(raw[i]!)) i++;
    if (i >= raw.length || raw[i] === "]") break;
    if (raw[i] !== "{") break;

    let depth = 0;
    let inStr = false;
    let esc = false;
    const objStart = i;
    for (; i < raw.length; i++) {
      const ch = raw[i]!;
      if (inStr) {
        if (esc) esc = false;
        else if (ch === "\\") esc = true;
        else if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') {
        inStr = true;
        continue;
      }
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          i++;
          const slice = raw.slice(objStart, i);
          try {
            out.push(JSON.parse(slice) as HoldingRow);
          } catch {
            // incomplete object — stop
            return out;
          }
          break;
        }
      }
    }
    if (depth !== 0) break;
  }
  return out;
}

function parseImportResponse(raw: string): ParsedImport | null {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const parsed = JSON.parse(m[0]) as { holdings?: HoldingRow[]; transactions?: TxRow[] };
    return {
      holdings: Array.isArray(parsed.holdings) ? parsed.holdings : [],
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      parseMode: "full",
    };
  } catch {
    const holdings = extractJsonObjectsFromArray(raw, "holdings");
    const transactions = extractJsonObjectsFromArray(raw, "transactions");
    if (holdings.length === 0 && transactions.length === 0) return null;
    return { holdings, transactions, parseMode: "salvaged" };
  }
}

function brokerGuess(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("interactive") || lower.includes("ibkr")) return "interactive_brokers";
  if (lower.includes("degiro")) return "degiro";
  if (lower.includes("trading212")) return "trading212";
  if (lower.includes("schwab")) return "schwab";
  return "csv_import";
}

function toTransactions(
  parsed: ParsedImport,
  note: string,
  brokerName: string,
): Transaction[] {
  const meta = new Map<string, { exchange: string; assetType: string; isin: string; name: string }>();
  for (const h of parsed.holdings) {
    const ticker = String(h.ticker || "").toUpperCase();
    if (!ticker) continue;
    meta.set(ticker, {
      exchange: String(h.exchange || "").toUpperCase(),
      assetType: holdingAssetType(h.assetType),
      isin: String(h.isin || ""),
      name: String(h.name || ticker),
    });
  }

  if (parsed.transactions.length > 0) {
    return parsed.transactions
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
          exchange: info?.exchange || String(t.exchange || "").toUpperCase(),
          isin: info?.isin || String(t.isin || ""),
          assetType: holdingAssetType(info?.assetType || t.assetType || "stock"),
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
          notes: note,
          sourceRef: "",
          brokerName,
          createdAt: new Date().toISOString(),
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // Holdings-only salvage: synthesize one buy per open position.
  return parsed.holdings
    .filter((h) => h.ticker && Number(h.shares) > 0)
    .map((h) => {
      const ticker = String(h.ticker).toUpperCase();
      const shares = Math.abs(Number(h.shares) || 0);
      const pricePerShare = Math.abs(Number(h.purchasePrice ?? h.avgCost ?? h.price) || 0);
      const currency = String(h.displayCurrency || h.currency || "USD").toUpperCase();
      const date = String(h.purchaseDate || h.date || "2024-01-01");
      return {
        id: randomUUID(),
        holdingId: "",
        ticker,
        name: String(h.name || ticker),
        exchange: String(h.exchange || "").toUpperCase(),
        isin: String(h.isin || ""),
        assetType: holdingAssetType(h.assetType),
        accountId: "",
        type: "buy" as const,
        date,
        shares,
        pricePerShare,
        totalAmount: shares * pricePerShare,
        fees: 0,
        taxes: 0,
        currency,
        displayCurrency: currency,
        notes: `${note} (holdings-only)`,
        sourceRef: "",
        brokerName,
        createdAt: new Date().toISOString(),
      };
    });
}

async function listCandidates(emailFilter?: string) {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT u.id AS user_id, u.email, u.username,
                 COALESCE(MAX(s.total_value_eur), 0) AS max_snap,
                 COUNT(DISTINCT s.date) AS snap_days
          FROM users u
          JOIN portfolio_snapshots s ON s.user_id = u.id
          WHERE NOT EXISTS (SELECT 1 FROM holdings h WHERE h.user_id = u.id AND h.shares > 0)
            AND NOT EXISTS (SELECT 1 FROM transactions t WHERE t.user_id = u.id)
            AND ${EXCLUDE_TEST_USERS}
            AND lower(u.email) NOT LIKE 'suarez84+%'
            AND (? IS NULL OR lower(u.email) = lower(?) OR lower(u.username) = lower(?))
          GROUP BY u.id
          HAVING max_snap >= ?
          ORDER BY max_snap DESC`,
    args: [emailFilter ?? null, emailFilter ?? null, emailFilter ?? null, MIN_SNAP_EUR],
  });
  return result.rows.map((r) => ({
    userId: String(r.user_id),
    email: String(r.email || ""),
    username: String(r.username || ""),
    maxSnap: Number(r.max_snap) || 0,
    snapDays: Number(r.snap_days) || 0,
  }));
}

async function pickBestImport(userId: string): Promise<{
  createdAt: string;
  parsed: ParsedImport;
  rawLen: number;
  brokerName: string;
} | null> {
  const client = await ensureInitialized();
  const logs = await client.execute({
    sql: `SELECT created_at, response FROM ai_logs
          WHERE user_id = ? AND source = 'import'
          ORDER BY created_at DESC LIMIT 12`,
    args: [userId],
  });

  let best: {
    createdAt: string;
    parsed: ParsedImport;
    rawLen: number;
    brokerName: string;
    score: number;
  } | null = null;

  for (const row of logs.rows) {
    const raw = String(row.response || "");
    const parsed = parseImportResponse(raw);
    if (!parsed) continue;
    const score = parsed.transactions.length * 3 + parsed.holdings.length;
    if (!best || score > best.score) {
      best = {
        createdAt: String(row.created_at),
        parsed,
        rawLen: raw.length,
        brokerName: brokerGuess(raw),
        score,
      };
    }
  }
  return best;
}

async function restoreUser(
  userId: string,
  portfolioId: string,
  parsed: ParsedImport,
  meta: { createdAt: string; brokerName: string },
  dryRun: boolean,
) {
  const client = await ensureInitialized();
  const note = `Support restore from AI import log ${meta.createdAt}`;
  const txs = toTransactions(parsed, note, meta.brokerName);
  if (txs.length === 0) {
    return { ok: false as const, reason: "no txs/holdings in log" };
  }

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
  let derived = deriveHoldingsFromTransactions(txs, metadataByKey).filter(
    (h) => h.shares > 1e-6,
  );

  // Truncated transaction logs often net to zero while the holdings[] snapshot is intact.
  if (derived.length === 0 && parsed.holdings.length > 0) {
    derived = parsed.holdings
      .map((h) => {
        const ticker = String(h.ticker || "").toUpperCase();
        const shares = Math.abs(Number(h.shares) || 0);
        if (!ticker || shares <= 1e-6) return null;
        const currency = String(h.displayCurrency || h.currency || "USD").toUpperCase();
        return {
          ticker,
          name: String(h.name || ticker),
          exchange: String(h.exchange || "").toUpperCase(),
          isin: String(h.isin || ""),
          assetType: holdingAssetType(h.assetType),
          shares,
          purchasePrice: Math.abs(Number(h.purchasePrice ?? h.avgCost ?? h.price) || 0),
          displayCurrency: currency,
        };
      })
      .filter((h): h is NonNullable<typeof h> => h != null);
  }

  if (derived.length === 0) {
    return { ok: false as const, reason: "no open holdings after derive/salvage" };
  }

  if (dryRun) {
    return {
      ok: true as const,
      dryRun: true as const,
      txs: txs.length,
      holdings: derived.length,
      tickers: derived.map((h) => `${h.ticker}:${h.shares}`).join(", "),
      parseMode: parsed.parseMode,
    };
  }

  const txStmts = txs.map((tx) => ({
    sql: `INSERT INTO transactions (
            id, user_id, holding_id, ticker, name, exchange, isin, asset_type, account_id,
            type, date, shares, price_per_share, total_amount, fees, taxes, currency, display_currency,
            notes, source_ref, broker_name, portfolio_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      tx.id,
      userId,
      "",
      tx.ticker,
      tx.name,
      tx.exchange,
      tx.isin,
      tx.assetType,
      "",
      tx.type,
      tx.date,
      tx.shares,
      tx.pricePerShare,
      tx.totalAmount,
      tx.fees,
      0,
      tx.currency,
      tx.displayCurrency,
      tx.notes,
      "",
      tx.brokerName,
      portfolioId,
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
        id,
        userId,
        h.name,
        h.ticker,
        h.isin || "",
        h.assetType || "stock",
        h.shares,
        h.purchasePrice,
        h.displayCurrency,
        h.exchange,
        valueEur,
        portfolioId,
      ],
    };
  });

  await client.batch([...txStmts, ...hStmts], "write");
  return {
    ok: true as const,
    dryRun: false as const,
    txs: txs.length,
    holdings: derived.length,
    tickers: derived.map((h) => `${h.ticker}:${h.shares}`).join(", "),
    parseMode: parsed.parseMode,
  };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const userArg = process.argv.find((a) => a.startsWith("--user="))?.slice("--user=".length);
  const client = await ensureInitialized();

  const candidates = await listCandidates(userArg);
  console.log(`candidates=${candidates.length} dryRun=${dryRun}`);

  for (const c of candidates) {
    const pidRes = await client.execute({
      sql: `SELECT id FROM portfolios WHERE user_id = ? AND is_default = 1 LIMIT 1`,
      args: [c.userId],
    });
    const portfolioId = String(pidRes.rows[0]?.id || "");
    if (!portfolioId) {
      console.log(`SKIP ${c.email}: no default portfolio`);
      continue;
    }

    const best = await pickBestImport(c.userId);
    if (!best) {
      console.log(`SKIP ${c.email} maxSnap=€${c.maxSnap.toFixed(0)}: no recoverable import log`);
      continue;
    }

    const result = await restoreUser(c.userId, portfolioId, best.parsed, best, dryRun);
    if (!result.ok) {
      console.log(`SKIP ${c.email}: ${result.reason}`);
      continue;
    }
    console.log(
      `${dryRun ? "DRY" : "OK"} ${c.email} snap=€${c.maxSnap.toFixed(0)} log=${best.createdAt} mode=${result.parseMode} txs=${result.txs} holdings=${result.holdings} :: ${result.tickers}`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
