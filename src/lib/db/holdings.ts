import { randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import {
  str,
  num,
  holdingAssetType,
  normalizeTickerForExchange,
  parseHoldingTagsJson,
  serializeHoldingTags,
  mergeHoldingTags,
  canonicalExchangeCode,
  exchangeCodeAliases,
} from "./helpers";
import type { Holding, HoldingAssetType, ExchangeRates } from "@/lib/types";
import { deriveHoldingsFromTransactions } from "@/lib/derive-holdings";
import { seedHoldingsForUser, seedCashForUser, seedTransactionsForUser } from "./seed";
import { listTransactions } from "./transactions";
import { findOrCreateBrokerAccount } from "./accounts";
import { resolvePortfolioId, healEmptyPortfolioIds, getDefaultPortfolio } from "./portfolios";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { resolveIsinToTicker } from "@/lib/api-providers/isin-resolver";
import { marketDataSymbolForHolding, normalizeHkYahooSymbol } from "@/lib/market-symbol";
import { buildNeededFxPairs } from "@/lib/fx-pairs";
import { convertToEUR, hasExchangeRate, resolveQuoteCurrency } from "@/lib/utils";

async function fetchExchangeRatesForPairs(
  yahoo: YahooProvider,
  pairs: string[],
): Promise<ExchangeRates> {
  const exchangeRates: ExchangeRates = {};
  if (pairs.length === 0) return exchangeRates;
  const rateResults = await Promise.allSettled(
    pairs.map(async (pair) => {
      const from = pair.substring(0, 3);
      const to = pair.substring(3);
      const rate = await yahoo.getExchangeRate(from, to);
      return { pair, rate };
    }),
  );
  for (const r of rateResults) {
    if (r.status === "fulfilled" && r.value.rate > 0) {
      exchangeRates[r.value.pair] = r.value.rate;
    }
  }
  return exchangeRates;
}

async function enrichValueInEUR(derived: Holding[]): Promise<void> {
  if (derived.length === 0) return;

  const yahoo = new YahooProvider();

  // Map each original ticker to the Yahoo-compatible version
  const tickerToYahoo = new Map<string, string>();
  const yahooToOriginal = new Map<string, string>();
  for (const h of derived) {
    if (tickerToYahoo.has(h.ticker)) continue;
    const yt = marketDataSymbolForHolding(h);
    tickerToYahoo.set(h.ticker, yt);
    yahooToOriginal.set(yt, h.ticker);
  }

  const yahooTickers = [...new Set(tickerToYahoo.values())];

  const quotes: Record<string, { price: number; currency: string }> = {};
  const BATCH = 10;
  for (let i = 0; i < yahooTickers.length; i += BATCH) {
    const chunk = yahooTickers.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      chunk.map(async (t) => {
        const resolved = await resolveIsinToTicker(yahoo, t);
        const q = await yahoo.getQuote(resolved);
        return { ticker: t, price: q.regularMarketPrice, currency: q.currency };
      })
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.price > 0) {
        const origTicker = yahooToOriginal.get(r.value.ticker) || r.value.ticker;
        quotes[origTicker] = { price: r.value.price, currency: r.value.currency };
      }
    }
  }

  const fxCurrencies = [
    ...derived.map((h) => h.displayCurrency),
    ...Object.values(quotes).map((q) => q.currency),
  ];
  const exchangeRates = await fetchExchangeRatesForPairs(
    yahoo,
    buildNeededFxPairs(fxCurrencies),
  );

  for (const h of derived) {
    const q = quotes[h.ticker];
    if (q) {
      const quoteCurrency = resolveQuoteCurrency(h.displayCurrency, q.currency);
      if (!hasExchangeRate(quoteCurrency, exchangeRates) && quoteCurrency !== "EUR") {
        // Missing FX — leave valueInEUR unset rather than storing raw foreign as EUR
      } else {
        const valueInQuoteCurrency = h.shares * q.price;
        const valueEUR = convertToEUR(valueInQuoteCurrency, quoteCurrency, exchangeRates);
        if (Number.isFinite(valueEUR) && valueEUR > 0) {
          h.valueInEUR = valueEUR;
          continue;
        }
      }
    }

    // Cost-basis fallback: shares * purchasePrice converted to EUR (only with a real rate)
    if (h.valueInEUR <= 0 && h.shares > 0 && h.purchasePrice > 0) {
      if (h.displayCurrency === "EUR" || hasExchangeRate(h.displayCurrency, exchangeRates)) {
        const costValue = h.shares * h.purchasePrice;
        const costEUR = convertToEUR(costValue, h.displayCurrency, exchangeRates);
        if (Number.isFinite(costEUR) && costEUR > 0) {
          h.valueInEUR = costEUR;
        }
      }
    }
  }
}

const SOURCE_REF_BROKER_MAP: Record<string, { id: string; label: string }> = {
  degiro: { id: "degiro", label: "DEGIRO" },
  ibkr: { id: "interactive_brokers", label: "Interactive Brokers" },
  trading212: { id: "trading_212", label: "Trading 212" },
  revolut: { id: "revolut", label: "Revolut" },
  simple: { id: "simple", label: "Simple CSV" },
};

export async function listHoldings(userId: string, portfolioId?: string): Promise<Holding[]> {
  const client = await ensureInitialized();
  // Blank portfolio_id rows are invisible when the UI filters by the default
  // portfolio UUID — reattach them before listing.
  if (portfolioId) {
    const emptyH = await client.execute({
      sql: `SELECT 1 AS x FROM holdings WHERE user_id = ? AND (portfolio_id = '' OR portfolio_id IS NULL) LIMIT 1`,
      args: [userId],
    });
    const emptyT =
      emptyH.rows.length > 0
        ? { rows: [] as unknown[] }
        : await client.execute({
            sql: `SELECT 1 AS x FROM transactions WHERE user_id = ? AND (portfolio_id = '' OR portfolio_id IS NULL) LIMIT 1`,
            args: [userId],
          });
    if (emptyH.rows.length > 0 || emptyT.rows.length > 0) {
      await healEmptyPortfolioIds(userId);
    }
  }
  const portfolioFilter = portfolioId ? " AND portfolio_id = ?" : "";
  const portfolioArgs = portfolioId ? [portfolioId] : [];
  const holdingsResult = await client.execute({
    sql: `SELECT id, name, ticker, isin, asset_type, shares, purchase_price, display_currency, exchange, value_in_eur, sector, region, asset_class, account_id, tags
          FROM holdings WHERE user_id = ?${portfolioFilter} ORDER BY name ASC`,
    args: [userId, ...portfolioArgs],
  });

  if (holdingsResult.rows.length > 0) {
    const rows = holdingsResult.rows.map((row) => ({
      id: str(row.id),
      name: str(row.name),
      ticker: normalizeHkYahooSymbol(str(row.ticker)),
      isin: str(row.isin),
      assetType: holdingAssetType(row.asset_type),
      shares: num(row.shares),
      purchasePrice: num(row.purchase_price),
      displayCurrency: str(row.display_currency),
      exchange: canonicalExchangeCode(str(row.exchange)) || str(row.exchange),
      valueInEUR: num(row.value_in_eur),
      sector: str(row.sector),
      region: str(row.region),
      assetClass: str(row.asset_class),
      accountId: str(row.account_id),
      tags: parseHoldingTagsJson(row.tags),
    }));
    // Collapse venue aliases (CPH/OMK) and HK padding (215.HK/0215.HK) first.
    // Identical lots (same shares + cost) are duplicates — keep one. Distinct
    // lots on the same venue still sum.
    const byVenue = new Map<string, Holding>();
    for (const h of rows) {
      const venueKey = `${h.ticker.toUpperCase()}|${canonicalExchangeCode(h.exchange)}`;
      const prev = byVenue.get(venueKey);
      if (prev) {
        const sameLot =
          Math.abs(prev.shares - h.shares) < 1e-6 &&
          Math.abs(prev.purchasePrice - h.purchasePrice) < 1e-4;
        if (sameLot) {
          prev.tags = mergeHoldingTags(prev.tags, h.tags);
          if (h.valueInEUR > prev.valueInEUR) prev.valueInEUR = h.valueInEUR;
          continue;
        }
        const oldCost = prev.shares * prev.purchasePrice;
        const addCost = h.shares * h.purchasePrice;
        prev.shares += h.shares;
        prev.purchasePrice = prev.shares > 0 ? (oldCost + addCost) / prev.shares : 0;
        prev.valueInEUR += h.valueInEUR;
        prev.tags = mergeHoldingTags(prev.tags, h.tags);
        continue;
      }
      byVenue.set(venueKey, { ...h });
    }
    // Then merge remaining same-ticker rows across truly different venues
    // (rare; e.g. dual listing under identical Yahoo ticker).
    const byTicker = new Map<string, Holding>();
    for (const h of byVenue.values()) {
      const key = h.ticker.toUpperCase();
      const prev = byTicker.get(key);
      if (prev) {
        // Duplicate-looking rows (same shares + cost) from residual aliases: keep one.
        const sameLot =
          Math.abs(prev.shares - h.shares) < 1e-6 &&
          Math.abs(prev.purchasePrice - h.purchasePrice) < 1e-4;
        if (sameLot) {
          prev.tags = mergeHoldingTags(prev.tags, h.tags);
          continue;
        }
        const oldCost = prev.shares * prev.purchasePrice;
        const addCost = h.shares * h.purchasePrice;
        prev.shares += h.shares;
        prev.purchasePrice = prev.shares > 0 ? (oldCost + addCost) / prev.shares : 0;
        prev.valueInEUR += h.valueInEUR;
        prev.tags = mergeHoldingTags(prev.tags, h.tags);
      } else {
        byTicker.set(key, { ...h });
      }
    }
    return Array.from(byTicker.values())
      .filter((h) => h.shares > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  const txSql = portfolioId
    ? `SELECT COUNT(*) as cnt FROM transactions WHERE user_id = ?
       AND (portfolio_id = ? OR id IN (SELECT transaction_id FROM transaction_portfolio_map WHERE user_id = ? AND portfolio_id = ?))`
    : `SELECT COUNT(*) as cnt FROM transactions WHERE user_id = ?`;
  const txArgs = portfolioId ? [userId, portfolioId, userId, portfolioId] : [userId];
  const txCount = await client.execute({ sql: txSql, args: txArgs });
  if (num(txCount.rows[0]?.cnt) > 0) {
    return rebuildHoldings(userId, portfolioId);
  }

  return [];
}

export async function countHoldings(userId: string, portfolioId?: string): Promise<number> {
  const client = await ensureInitialized();
  const portfolioFilter = portfolioId ? " AND portfolio_id = ?" : "";
  const portfolioArgs = portfolioId ? [portfolioId] : [];
  const result = await client.execute({
    sql: `SELECT COUNT(*) as cnt FROM holdings WHERE user_id = ?${portfolioFilter}`,
    args: [userId, ...portfolioArgs],
  });
  return Number(result.rows[0]?.cnt ?? 0);
}

export async function addHolding(
  userId: string,
  holding: Omit<Holding, "id">,
  portfolioId?: string
): Promise<Holding> {
  const client = await ensureInitialized();
  const resolved = await resolvePortfolioId(userId, portfolioId);
  const exchange = canonicalExchangeCode(holding.exchange) || (holding.exchange || "").toUpperCase();
  const ticker = normalizeHkYahooSymbol(normalizeTickerForExchange(holding.ticker, exchange));
  const aliases = exchangeCodeAliases(exchange).map((a) => a.toUpperCase()).filter(Boolean);
  const aliasPlaceholders = aliases.length > 0 ? aliases.map(() => "?").join(",") : "?";
  const aliasArgs = aliases.length > 0 ? aliases : [""];

  const existing = await client.execute({
    sql: `SELECT id, shares, purchase_price FROM holdings
          WHERE user_id = ? AND UPPER(ticker) = UPPER(?) AND UPPER(exchange) IN (${aliasPlaceholders}) AND portfolio_id = ?`,
    args: [userId, ticker, ...aliasArgs, resolved],
  });

  if (existing.rows.length > 0) {
    const row = existing.rows[0];
    const oldShares = Number(row.shares) || 0;
    const oldPrice = Number(row.purchase_price) || 0;
    const newShares = holding.shares;
    const newPrice = holding.purchasePrice;
    const totalShares = oldShares + newShares;

    const avgPrice =
      newShares > 0 && totalShares > 0
        ? (oldShares * oldPrice + newShares * newPrice) / totalShares
        : oldPrice;

    const finalShares = Math.max(totalShares, 0);
    const existingId = str(row.id);
    await client.execute({
      sql: `UPDATE holdings SET shares = ?, purchase_price = ?, exchange = ?, ticker = ? WHERE id = ? AND user_id = ?`,
      args: [finalShares, avgPrice, exchange, ticker, existingId, userId],
    });
    return { ...holding, id: existingId, ticker, exchange, shares: finalShares, purchasePrice: avgPrice };
  }

  const id = randomUUID();
  await client.execute({
    sql: `INSERT INTO holdings (
            id, user_id, name, ticker, isin, asset_type, shares, purchase_price, display_currency, exchange, value_in_eur, portfolio_id, tags
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id, userId, holding.name, ticker, holding.isin,
      holding.assetType ?? "stock",
      holding.shares, holding.purchasePrice, holding.displayCurrency,
      exchange, holding.valueInEUR,
      resolved,
      serializeHoldingTags(holding.tags),
    ],
  });
  return { ...holding, id, ticker, exchange };
}

export async function updateHolding(
  userId: string,
  holdingId: string,
  updates: Partial<Omit<Holding, "id">>
): Promise<Holding | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT id, name, ticker, isin, asset_type, shares, purchase_price, display_currency, exchange, value_in_eur, sector, region, asset_class, account_id, tags
          FROM holdings WHERE id = ? AND user_id = ?`,
    args: [holdingId, userId],
  });

  if (result.rows.length === 0) return null;
  const current = result.rows[0];

  const exchangeRaw = updates.exchange ?? str(current.exchange);
  const exchange = canonicalExchangeCode(exchangeRaw) || (exchangeRaw || "").toUpperCase();
  const rawTicker = updates.ticker ?? str(current.ticker);
  const next = {
    name: updates.name ?? str(current.name),
    ticker: normalizeHkYahooSymbol(normalizeTickerForExchange(rawTicker, exchange)),
    isin: updates.isin ?? str(current.isin),
    assetType: updates.assetType ?? holdingAssetType(current.asset_type),
    shares: updates.shares ?? num(current.shares),
    purchasePrice: updates.purchasePrice ?? num(current.purchase_price),
    displayCurrency: updates.displayCurrency ?? str(current.display_currency),
    exchange,
    valueInEUR: updates.valueInEUR ?? num(current.value_in_eur),
    sector: updates.sector ?? str(current.sector),
    region: updates.region ?? str(current.region),
    assetClass: updates.assetClass ?? str(current.asset_class),
    accountId: updates.accountId ?? str(current.account_id),
    tags:
      updates.tags !== undefined
        ? mergeHoldingTags(updates.tags, [])
        : parseHoldingTagsJson(current.tags),
  };

  await client.execute({
    sql: `UPDATE holdings
          SET name = ?, ticker = ?, isin = ?, asset_type = ?, shares = ?, purchase_price = ?,
              display_currency = ?, exchange = ?, value_in_eur = ?,
              sector = ?, region = ?, asset_class = ?, account_id = ?, tags = ?
          WHERE id = ? AND user_id = ?`,
    args: [
      next.name, next.ticker, next.isin, next.assetType, next.shares, next.purchasePrice,
      next.displayCurrency, next.exchange, next.valueInEUR,
      next.sector, next.region, next.assetClass, next.accountId, serializeHoldingTags(next.tags),
      holdingId, userId,
    ],
  });

  return { id: holdingId, ...next };
}

export async function removeHolding(userId: string, holdingId: string): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "DELETE FROM holdings WHERE id = ? AND user_id = ?",
    args: [holdingId, userId],
  });
  return (result.rowsAffected ?? 0) > 0;
}

export async function resetUserHoldings(
  userId: string,
  useSeedData: boolean,
  portfolioId?: string
): Promise<number> {
  const client = await ensureInitialized();
  const resolved = await resolvePortfolioId(userId, portfolioId);
  const portfolioFilter = " AND portfolio_id = ?";
  const portfolioArgs = [resolved];
  // When resetting the default portfolio, also wipe blank-id orphans that
  // belong conceptually to the default (otherwise Reset leaves invisible rows).
  const defaultPortfolio = await getDefaultPortfolio(userId);
  const includeEmpty = resolved === defaultPortfolio.id;

  // Archive before wipe so support can recover accidental resets.
  try {
    const { archivePortfolioLedgerBeforeReset } = await import("./portfolio-reset-archives");
    await archivePortfolioLedgerBeforeReset(userId, resolved, {
      includeEmptyPortfolioId: includeEmpty,
      source: "reset_portfolio",
    });
  } catch (err) {
    console.warn("[resetUserHoldings] archive failed (continuing with reset):", err);
  }

  await client.execute({
    sql: includeEmpty
      ? `DELETE FROM holdings WHERE user_id = ? AND (portfolio_id = ? OR portfolio_id = '' OR portfolio_id IS NULL)`
      : `DELETE FROM holdings WHERE user_id = ?${portfolioFilter}`,
    args: [userId, ...portfolioArgs],
  });
  await client.execute({
    sql: includeEmpty
      ? `DELETE FROM cash_entries WHERE user_id = ? AND (portfolio_id = ? OR portfolio_id = '' OR portfolio_id IS NULL)`
      : `DELETE FROM cash_entries WHERE user_id = ?${portfolioFilter}`,
    args: [userId, ...portfolioArgs],
  });

  // Remove mapping entries for this portfolio, then delete orphaned transaction rows
  await client.execute({
    sql: "DELETE FROM transaction_portfolio_map WHERE user_id = ? AND portfolio_id = ?",
    args: [userId, resolved],
  });
  await client.execute({
    sql: includeEmpty
      ? `DELETE FROM transactions WHERE user_id = ? AND (portfolio_id = ? OR portfolio_id = '' OR portfolio_id IS NULL)
            AND id NOT IN (SELECT transaction_id FROM transaction_portfolio_map WHERE user_id = ?)`
      : `DELETE FROM transactions WHERE user_id = ? AND portfolio_id = ?
            AND id NOT IN (SELECT transaction_id FROM transaction_portfolio_map WHERE user_id = ?)`,
    args: [userId, resolved, userId],
  });

  if (useSeedData) {
    const holdingsCount = await seedHoldingsForUser(client, userId, resolved);
    const cashCount = await seedCashForUser(client, userId, resolved);
    const txCount = await seedTransactionsForUser(client, userId, resolved);
    return holdingsCount + cashCount + txCount;
  }
  return 0;
}

/**
 * Upsert holdings directly from SnapTrade position data.
 * Updates shares/price for existing holdings, inserts new ones, and removes
 * stale `source='snaptrade'` holdings that are no longer in the broker's positions.
 * Preserves enrichment metadata (sector, region, assetClass) on existing rows.
 *
 * Uses FIGI share class as a stable identifier to detect ticker renames:
 * when a position's FIGI matches an existing holding but the ticker differs,
 * the holding is updated in-place and transactions are re-linked to the new ticker.
 */
export async function upsertHoldingsFromPositions(
  userId: string,
  positions: { name: string; ticker: string; shares: number; purchasePrice: number; displayCurrency: string; exchange: string; assetType: string; figiShareClass?: string }[],
  portfolioId?: string,
  options?: { skipStaleCleanup?: boolean },
): Promise<Holding[]> {
  const client = await ensureInitialized();
  const resolved = await resolvePortfolioId(userId, portfolioId);

  const existingRows = await client.execute({
    sql: `SELECT id, ticker, exchange, name, isin, asset_type, sector, region, asset_class, account_id, source, value_in_eur, figi_share_class, tags
          FROM holdings WHERE user_id = ? AND portfolio_id = ?`,
    args: [userId, resolved],
  });

  interface ExistingMeta {
    id: string; name: string; isin: string; sector: string; region: string;
    assetClass: string; accountId: string; source: string; valueInEUR: number;
    ticker: string; exchange: string; figiShareClass: string; tags: string[];
  }

  const existingByKey = new Map<string, ExistingMeta>();
  const existingByFigi = new Map<string, ExistingMeta>();
  for (const row of existingRows.rows) {
    const meta: ExistingMeta = {
      id: str(row.id), name: str(row.name), isin: str(row.isin),
      sector: str(row.sector), region: str(row.region),
      assetClass: str(row.asset_class), accountId: str(row.account_id),
      source: str(row.source) || "transaction",
      valueInEUR: num(row.value_in_eur),
      ticker: normalizeHkYahooSymbol(str(row.ticker)), exchange: canonicalExchangeCode(str(row.exchange)) || str(row.exchange),
      figiShareClass: str(row.figi_share_class),
      tags: parseHoldingTagsJson(row.tags),
    };
    const key = `${meta.ticker.toUpperCase()}|${canonicalExchangeCode(meta.exchange)}`;
    existingByKey.set(key, meta);
    if (meta.figiShareClass) {
      existingByFigi.set(meta.figiShareClass, meta);
    }
  }
  const upserted: Holding[] = [];
  const touchedKeys = new Set<string>();

  for (const pos of positions) {
    if (pos.shares <= 0) continue;
    const ticker = normalizeHkYahooSymbol(normalizeTickerForExchange(pos.ticker, pos.exchange));
    const exchange = canonicalExchangeCode(pos.exchange) || pos.exchange;
    const key = `${ticker.toUpperCase()}|${canonicalExchangeCode(exchange)}`;
    touchedKeys.add(key);

    let existing = existingByKey.get(key);

    // FIGI-based ticker rename detection: if no direct match but the FIGI
    // matches an existing holding, the security was renamed (e.g. VG → VGn).
    // Update the holding's ticker in-place and propagate to transactions.
    if (!existing && pos.figiShareClass) {
      const figiMatch = existingByFigi.get(pos.figiShareClass);
      if (figiMatch) {
        const oldTicker = figiMatch.ticker;
        const oldExchange = figiMatch.exchange;
        console.log(`[upsertHoldingsFromPositions] Ticker rename detected via FIGI ${pos.figiShareClass}: ${oldTicker} → ${ticker} (user ${userId})`);

        await client.execute({
          sql: `UPDATE holdings SET ticker = ?, exchange = ? WHERE id = ? AND user_id = ?`,
          args: [ticker, exchange, figiMatch.id, userId],
        });
        await client.execute({
          sql: `UPDATE transactions SET ticker = ?, exchange = ?, name = CASE WHEN name = ? THEN ? ELSE name END
                WHERE user_id = ? AND UPPER(ticker) = UPPER(?) AND portfolio_id = ?`,
          args: [ticker, exchange, oldTicker, pos.name, userId, oldTicker, resolved],
        });

        // Update maps so stale cleanup sees the new key
        const oldKey = `${oldTicker.toUpperCase()}|${canonicalExchangeCode(oldExchange)}`;
        existingByKey.delete(oldKey);
        figiMatch.ticker = ticker;
        figiMatch.exchange = exchange;
        existingByKey.set(key, figiMatch);
        touchedKeys.add(key);

        existing = figiMatch;
      }
    }

    if (existing) {
      const figi = pos.figiShareClass || "";
      const updateFigi = figi && figi !== existing.figiShareClass;
      await client.execute({
        sql: updateFigi
          ? `UPDATE holdings SET shares = ?, purchase_price = ?, display_currency = ?, exchange = ?,
              name = CASE WHEN name = ticker THEN ? ELSE name END,
              source = 'snaptrade', figi_share_class = ?
              WHERE id = ? AND user_id = ?`
          : `UPDATE holdings SET shares = ?, purchase_price = ?, display_currency = ?, exchange = ?,
              name = CASE WHEN name = ticker THEN ? ELSE name END,
              source = 'snaptrade'
              WHERE id = ? AND user_id = ?`,
        args: updateFigi
          ? [pos.shares, pos.purchasePrice, pos.displayCurrency, exchange, pos.name, figi, existing.id, userId]
          : [pos.shares, pos.purchasePrice, pos.displayCurrency, exchange, pos.name, existing.id, userId],
      });
      upserted.push({
        id: existing.id, name: existing.name === ticker ? pos.name : existing.name,
        ticker, isin: existing.isin, assetType: holdingAssetType(pos.assetType),
        shares: pos.shares, purchasePrice: pos.purchasePrice,
        displayCurrency: pos.displayCurrency, exchange,
        valueInEUR: 0, sector: existing.sector, region: existing.region,
        assetClass: existing.assetClass, accountId: existing.accountId,
        tags: existing.tags,
      });
    } else {
      const id = randomUUID();
      await client.execute({
        sql: `INSERT INTO holdings (id, user_id, name, ticker, isin, asset_type, shares, purchase_price,
              display_currency, exchange, value_in_eur, portfolio_id, source, figi_share_class)
              VALUES (?, ?, ?, ?, '', ?, ?, ?, ?, ?, 0, ?, 'snaptrade', ?)`,
        args: [id, userId, pos.name, ticker, pos.assetType || "stock",
               pos.shares, pos.purchasePrice, pos.displayCurrency, exchange, resolved,
               pos.figiShareClass || ""],
      });
      upserted.push({
        id, name: pos.name, ticker, isin: "", assetType: holdingAssetType(pos.assetType),
        shares: pos.shares, purchasePrice: pos.purchasePrice,
        displayCurrency: pos.displayCurrency, exchange, valueInEUR: 0,
        tags: [],
      });
    }
  }

  // Remove stale snaptrade holdings that no longer appear in broker positions.
  // Skip when data may be incomplete (e.g. a broker connection is disabled/expired,
  // or the API returned 0 actionable positions — likely an auth expiry returning
  // null units) to avoid deleting legitimate holdings we simply couldn't fetch.
  const snaptradeHoldingCount = [...existingByKey.values()].filter((m) => m.source === "snaptrade").length;
  if (!options?.skipStaleCleanup && touchedKeys.size > 0 && touchedKeys.size >= snaptradeHoldingCount * 0.5) {
    for (const [key, meta] of existingByKey) {
      if (meta.source === "snaptrade" && !touchedKeys.has(key)) {
        await client.execute({
          sql: "DELETE FROM holdings WHERE id = ? AND user_id = ?",
          args: [meta.id, userId],
        });
      }
    }
  }

  await enrichValueInEUR(upserted).catch((err) =>
    console.warn("[upsertHoldingsFromPositions] quote enrichment failed:", err)
  );

  for (const h of upserted) {
    const key = `${h.ticker.toUpperCase()}|${canonicalExchangeCode(h.exchange)}`;
    const prevVal = existingByKey.get(key)?.valueInEUR || 0;
    let finalVal = h.valueInEUR > 0 ? h.valueInEUR : prevVal;
    // Last-resort: only store cost as EUR when the holding itself is EUR
    // (never treat HKD/JPY/etc. amounts as euros).
    if (finalVal <= 0 && h.shares > 0 && h.purchasePrice > 0 && h.displayCurrency === "EUR") {
      finalVal = h.shares * h.purchasePrice;
    }
    if (finalVal > 0) {
      h.valueInEUR = finalVal;
      await client.execute({
        sql: "UPDATE holdings SET value_in_eur = ? WHERE id = ? AND user_id = ?",
        args: [finalVal, h.id, userId],
      });
    }
  }

  return upserted;
}

export async function rebuildHoldings(userId: string, portfolioId?: string): Promise<Holding[]> {
  const client = await ensureInitialized();
  const resolved = await resolvePortfolioId(userId, portfolioId);
  const portfolioFilter = " AND portfolio_id = ?";
  const portfolioArgs = [resolved];

  const metadataRows = await client.execute({
    sql: `SELECT id, name, ticker, isin, asset_type, display_currency, exchange, sector, region, asset_class, account_id, value_in_eur, source, tags
          FROM holdings WHERE user_id = ?${portfolioFilter}`,
    args: [userId, ...portfolioArgs],
  });

  const metadataByKey = new Map<string, {
    id: string; name: string; isin: string; assetType: HoldingAssetType;
    displayCurrency: string; sector: string; region: string; assetClass: string; accountId: string;
    tags: string[];
  }>();
  const prevValueByKey = new Map<string, number>();
  // Ticker+exchange pairs owned by snaptrade positions — transaction-derived
  // holdings for these exact pairs are redundant and would cause doubled
  // shares in listHoldings. Scoped to ticker+exchange (not ticker alone) so a
  // CSV-imported holding for the same ticker on a different exchange (a
  // genuinely different position, e.g. a separate non-synced account) isn't
  // silently excluded.
  const snapTradeTickers = new Set<string>();
  for (const row of metadataRows.rows) {
    const key = `${normalizeHkYahooSymbol(str(row.ticker)).toUpperCase()}|${canonicalExchangeCode(str(row.exchange))}`;
    if (!metadataByKey.has(key)) {
      metadataByKey.set(key, {
        id: str(row.id), name: str(row.name), isin: str(row.isin),
        assetType: holdingAssetType(row.asset_type), displayCurrency: str(row.display_currency),
        sector: str(row.sector), region: str(row.region), assetClass: str(row.asset_class),
        accountId: str(row.account_id),
        tags: parseHoldingTagsJson(row.tags),
      });
    }
    const val = num(row.value_in_eur);
    if (val > 0 && !prevValueByKey.has(key)) prevValueByKey.set(key, val);
    if (str(row.source) === "snaptrade") {
      snapTradeTickers.add(key);
    }
  }

  const transactions = await listTransactions(userId, undefined, portfolioId);

  const unlinked = transactions.filter((tx) => !tx.accountId && tx.sourceRef);
  if (unlinked.length > 0) {
    const byPrefix = new Map<string, string[]>();
    for (const tx of unlinked) {
      const pipeIdx = tx.sourceRef!.indexOf("|");
      const prefix = pipeIdx > 0 ? tx.sourceRef!.slice(0, pipeIdx) : "";
      if (prefix && SOURCE_REF_BROKER_MAP[prefix]) {
        const ids = byPrefix.get(prefix) || [];
        ids.push(tx.id);
        byPrefix.set(prefix, ids);
      }
    }
    for (const [prefix, txIds] of byPrefix) {
      const broker = SOURCE_REF_BROKER_MAP[prefix];
      const account = await findOrCreateBrokerAccount(userId, broker.id, broker.label);
      const placeholders = txIds.map(() => "?").join(",");
      await client.execute({
        sql: `UPDATE transactions SET account_id = ? WHERE id IN (${placeholders}) AND user_id = ?`,
        args: [account.id, ...txIds, userId],
      });
      for (const tx of transactions) {
        if (txIds.includes(tx.id)) tx.accountId = account.id;
      }
    }
  }

  const allDerived = deriveHoldingsFromTransactions(transactions, metadataByKey);

  // Skip transaction-derived holdings when a snaptrade position already covers
  // that exact ticker+exchange — snaptrade positions are the source of truth
  // and including both would double the shares/value in listHoldings.
  const derived = snapTradeTickers.size > 0
    ? allDerived.filter((h) => !snapTradeTickers.has(`${h.ticker.toUpperCase()}|${canonicalExchangeCode(h.exchange)}`))
    : allDerived;

  await enrichValueInEUR(derived).catch((err) =>
    console.warn("[rebuildHoldings] quote enrichment failed, using valueInEUR=0:", err)
  );

  await client.execute({ sql: `DELETE FROM holdings WHERE user_id = ? AND source != 'snaptrade'${portfolioFilter}`, args: [userId, ...portfolioArgs] });

  for (const h of derived) {
    const key = `${h.ticker.toUpperCase()}|${canonicalExchangeCode(h.exchange)}`;
    const existingId = metadataByKey.get(key)?.id;
    const id = existingId || randomUUID();
    let valueEUR = h.valueInEUR > 0 ? h.valueInEUR : (prevValueByKey.get(key) || 0);
    // Last-resort: only store cost as EUR when the holding itself is EUR
    if (valueEUR <= 0 && h.shares > 0 && h.purchasePrice > 0 && h.displayCurrency === "EUR") {
      valueEUR = h.shares * h.purchasePrice;
    }
    h.valueInEUR = valueEUR;
    const exchange = canonicalExchangeCode(h.exchange) || h.exchange;
    await client.execute({
      sql: `INSERT INTO holdings (id, user_id, name, ticker, isin, asset_type, shares, purchase_price, display_currency, exchange, value_in_eur, sector, region, asset_class, account_id, portfolio_id, source, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'transaction', ?)
            ON CONFLICT(id) DO UPDATE SET shares = excluded.shares, purchase_price = excluded.purchase_price, value_in_eur = excluded.value_in_eur, tags = excluded.tags, exchange = excluded.exchange, ticker = excluded.ticker`,
      args: [id, userId, h.name, h.ticker, h.isin || "", h.assetType || "stock", h.shares, h.purchasePrice, h.displayCurrency, exchange, valueEUR, h.sector || "", h.region || "", h.assetClass || "", h.accountId || "", resolved, serializeHoldingTags(h.tags)],
    });
  }

  return derived;
}

/**
 * Convert all `source='snaptrade'` holdings to `source='transaction'` so they
 * are preserved after a broker disconnect and won't be deleted by the stale-
 * position cleanup in {@link upsertHoldingsFromPositions}.
 */
export async function detachSnapTradeHoldings(userId: string, portfolioId?: string): Promise<number> {
  const client = await ensureInitialized();
  const portfolioFilter = portfolioId ? " AND portfolio_id = ?" : "";
  const portfolioArgs = portfolioId ? [portfolioId] : [];
  const result = await client.execute({
    sql: `UPDATE holdings SET source = 'transaction' WHERE user_id = ? AND source = 'snaptrade'${portfolioFilter}`,
    args: [userId, ...portfolioArgs],
  });
  return Number(result.rowsAffected ?? 0);
}

export interface DistinctHoldingTicker {
  ticker: string;
  displayCurrency: string;
  exchange: string;
  figiShareClass: string;
  assetType: HoldingAssetType;
}

/**
 * Returns all distinct (ticker, display_currency) pairs across all users' holdings.
 * Used by the refresh-holdings cron to batch-fetch quotes per ticker instead of per user.
 * Includes exchange, asset type, and figi_share_class for market-hours gating and OpenFIGI heal.
 */
export async function listDistinctHoldingTickers(): Promise<DistinctHoldingTicker[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT DISTINCT ticker, display_currency, exchange, figi_share_class, asset_type FROM holdings WHERE shares > 0 AND ticker != ''`,
    args: [],
  });
  return result.rows.map((r) => ({
    ticker: str(r.ticker),
    displayCurrency: str(r.display_currency),
    exchange: str(r.exchange),
    figiShareClass: str(r.figi_share_class),
    assetType: holdingAssetType(r.asset_type),
  }));
}

/** Distinct users that have at least one open holding (for portfolio snapshot cron). */
export async function listUserIdsWithHoldings(): Promise<string[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT DISTINCT user_id FROM holdings WHERE shares > 0 AND ticker != ''`,
    args: [],
  });
  return result.rows.map((r) => str(r.user_id));
}

/**
 * Users with ≥1 holding who are eligible for weekly recommendation cron:
 * active within the last `activeWithinDays` (cron uses 7; Home fills misses).
 */
export async function listRecommendationCronCandidates(
  activeWithinDays = 30,
): Promise<Array<{ userId: string; email: string }>> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT DISTINCT h.user_id AS user_id, u.email AS email
          FROM holdings h
          INNER JOIN users u ON u.id = h.user_id
          WHERE h.shares > 0
            AND h.ticker != ''
            AND u.last_active_at != ''
            AND datetime(u.last_active_at) >= datetime('now', ?)
          ORDER BY h.user_id`,
    args: [`-${activeWithinDays} days`],
  });
  return result.rows.map((r) => ({
    userId: str(r.user_id),
    email: str(r.email),
  }));
}

/** Non-empty portfolio IDs that have holdings for this user. */
export async function listDistinctPortfolioIdsForUser(userId: string): Promise<string[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT DISTINCT portfolio_id FROM holdings WHERE user_id = ? AND shares > 0 AND portfolio_id != ''`,
    args: [userId],
  });
  return result.rows.map((r) => str(r.portfolio_id));
}

/** Distinct (ticker, …) pairs for one user — for targeted quote fetch when materializing snapshots. */
export async function listDistinctHoldingTickersForUser(userId: string): Promise<DistinctHoldingTicker[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT DISTINCT ticker, display_currency, exchange, figi_share_class, asset_type FROM holdings WHERE user_id = ? AND shares > 0 AND ticker != ''`,
    args: [userId],
  });
  return result.rows.map((r) => ({
    ticker: str(r.ticker),
    displayCurrency: str(r.display_currency),
    exchange: str(r.exchange),
    figiShareClass: str(r.figi_share_class),
    assetType: holdingAssetType(r.asset_type),
  }));
}

/**
 * For tickers where Yahoo returned no quote, attempt to resolve the new ticker
 * via OpenFIGI using the stored figi_share_class. Updates holdings and
 * transactions in-place so subsequent cron runs use the correct ticker.
 *
 * @returns Array of { oldTicker, newTicker } for tickers that were resolved.
 */
export async function resolveStaleTickersViaFigi(
  staleTickers: { ticker: string; exchange: string; figiShareClass: string }[],
): Promise<{ oldTicker: string; newTicker: string }[]> {
  const withFigi = staleTickers.filter((t) => t.figiShareClass);
  if (withFigi.length === 0) return [];

  const { batchResolveFigi } = await import("@/lib/api-providers/openfigi");
  const { EXCHANGE_SUFFIX_MAP } = await import("@/lib/db/helpers");

  const items = withFigi.map((t) => {
    const suffix = EXCHANGE_SUFFIX_MAP[t.exchange.toUpperCase()] || "";
    return { figiShareClass: t.figiShareClass, preferredYahooSuffix: suffix };
  });

  const resolved = await batchResolveFigi(items);
  if (resolved.size === 0) return [];

  const client = await ensureInitialized();
  const renames: { oldTicker: string; newTicker: string }[] = [];

  for (const stale of withFigi) {
    const resolution = resolved.get(stale.figiShareClass);
    if (!resolution) continue;

    const newTicker = resolution.ticker;
    if (newTicker.toUpperCase() === stale.ticker.toUpperCase()) continue;

    console.log(`[resolveStaleTickersViaFigi] Renaming ${stale.ticker} → ${newTicker} via FIGI ${stale.figiShareClass}`);

    await client.execute({
      sql: `UPDATE holdings SET ticker = ? WHERE UPPER(ticker) = UPPER(?) AND shares > 0`,
      args: [newTicker, stale.ticker],
    });
    await client.execute({
      sql: `UPDATE transactions SET ticker = ? WHERE UPPER(ticker) = UPPER(?)`,
      args: [newTicker, stale.ticker],
    });

    renames.push({ oldTicker: stale.ticker, newTicker });
  }

  return renames;
}

/**
 * Batch-update value_in_eur for all holdings matching a given ticker.
 * price × shares × EUR conversion is done in the caller; we store the per-share EUR value
 * so the update is: value_in_eur = shares * pricePerShareEur.
 */
export async function batchUpdateValueInEur(
  updates: { ticker: string; pricePerShareEur: Record<string, number> }[],
): Promise<number> {
  const client = await ensureInitialized();
  let totalUpdated = 0;
  for (const { ticker, pricePerShareEur } of updates) {
    for (const [displayCurrency, eurPerShare] of Object.entries(pricePerShareEur)) {
      const result = await client.execute({
        sql: `UPDATE holdings SET value_in_eur = shares * ? WHERE ticker = ? AND display_currency = ? AND shares > 0`,
        args: [eurPerShare, ticker, displayCurrency],
      });
      totalUpdated += Number(result.rowsAffected ?? 0);
    }
  }
  return totalUpdated;
}

export async function deleteAllHoldings(userId: string, portfolioId?: string): Promise<number> {
  const client = await ensureInitialized();
  const portfolioFilter = portfolioId ? " AND portfolio_id = ?" : "";
  const portfolioArgs = portfolioId ? [portfolioId] : [];
  const result = await client.execute({
    sql: `DELETE FROM holdings WHERE user_id = ?${portfolioFilter}`,
    args: [userId, ...portfolioArgs],
  });
  return Number(result.rowsAffected ?? 0);
}
