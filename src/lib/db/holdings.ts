import { randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import { str, num, holdingAssetType, normalizeTickerForExchange } from "./helpers";
import type { Holding, HoldingAssetType, ExchangeRates } from "@/lib/types";
import { deriveHoldingsFromTransactions } from "@/lib/derive-holdings";
import { seedHoldingsForUser, seedCashForUser, seedTransactionsForUser } from "./seed";
import { listTransactions } from "./transactions";
import { findOrCreateBrokerAccount } from "./accounts";
import { resolvePortfolioId } from "./portfolios";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { convertToEUR, resolveQuoteCurrency } from "@/lib/utils";

const FX_PAIRS = ["EURUSD", "EURGBP", "EURDKK", "EURCAD"];

async function enrichValueInEUR(derived: Holding[]): Promise<void> {
  if (derived.length === 0) return;

  const yahoo = new YahooProvider();
  const tickers = [...new Set(derived.map((h) => h.ticker))];

  const quotes: Record<string, { price: number; currency: string }> = {};
  const BATCH = 10;
  for (let i = 0; i < tickers.length; i += BATCH) {
    const chunk = tickers.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      chunk.map(async (t) => {
        const q = await yahoo.getQuote(t);
        return { ticker: t, price: q.regularMarketPrice, currency: q.currency };
      })
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.price > 0) {
        quotes[r.value.ticker] = { price: r.value.price, currency: r.value.currency };
      }
    }
  }

  const exchangeRates: ExchangeRates = {};
  const rateResults = await Promise.allSettled(
    FX_PAIRS.map(async (pair) => {
      const from = pair.substring(0, 3);
      const to = pair.substring(3);
      const rate = await yahoo.getExchangeRate(from, to);
      return { pair, rate };
    })
  );
  for (const r of rateResults) {
    if (r.status === "fulfilled" && r.value.rate > 0) {
      exchangeRates[r.value.pair] = r.value.rate;
    }
  }

  for (const h of derived) {
    const q = quotes[h.ticker];
    if (!q) continue;
    const quoteCurrency = resolveQuoteCurrency(h.displayCurrency, q.currency);
    const valueInQuoteCurrency = h.shares * q.price;
    const valueEUR = convertToEUR(valueInQuoteCurrency, quoteCurrency, exchangeRates);
    if (Number.isFinite(valueEUR) && valueEUR > 0) {
      h.valueInEUR = valueEUR;
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
  const portfolioFilter = portfolioId ? " AND portfolio_id = ?" : "";
  const portfolioArgs = portfolioId ? [portfolioId] : [];
  const holdingsResult = await client.execute({
    sql: `SELECT id, name, ticker, isin, asset_type, shares, purchase_price, display_currency, exchange, value_in_eur, sector, region, asset_class, account_id
          FROM holdings WHERE user_id = ?${portfolioFilter} ORDER BY name ASC`,
    args: [userId, ...portfolioArgs],
  });

  if (holdingsResult.rows.length > 0) {
    const rows = holdingsResult.rows.map((row) => ({
      id: str(row.id),
      name: str(row.name),
      ticker: str(row.ticker),
      isin: str(row.isin),
      assetType: holdingAssetType(row.asset_type),
      shares: num(row.shares),
      purchasePrice: num(row.purchase_price),
      displayCurrency: str(row.display_currency),
      exchange: str(row.exchange),
      valueInEUR: num(row.value_in_eur),
      sector: str(row.sector),
      region: str(row.region),
      assetClass: str(row.asset_class),
      accountId: str(row.account_id),
    }));

    const byTicker = new Map<string, Holding>();
    for (const h of rows) {
      const key = h.ticker.toUpperCase();
      const prev = byTicker.get(key);
      if (prev) {
        const oldCost = prev.shares * prev.purchasePrice;
        const addCost = h.shares * h.purchasePrice;
        prev.shares += h.shares;
        prev.purchasePrice = prev.shares > 0 ? (oldCost + addCost) / prev.shares : 0;
      } else {
        byTicker.set(key, { ...h });
      }
    }
    return Array.from(byTicker.values())
      .filter((h) => h.shares > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  const txCount = await client.execute({
    sql: `SELECT COUNT(*) as cnt FROM transactions WHERE user_id = ?${portfolioFilter}`,
    args: [userId, ...portfolioArgs],
  });
  if (num(txCount.rows[0]?.cnt) > 0) {
    return rebuildHoldings(userId, portfolioId);
  }

  return [];
}

export async function addHolding(
  userId: string,
  holding: Omit<Holding, "id">,
  portfolioId?: string
): Promise<Holding> {
  const client = await ensureInitialized();
  const resolved = await resolvePortfolioId(userId, portfolioId);
  const ticker = normalizeTickerForExchange(holding.ticker, holding.exchange);

  const existing = await client.execute({
    sql: `SELECT id, shares, purchase_price FROM holdings
          WHERE user_id = ? AND UPPER(ticker) = UPPER(?) AND UPPER(exchange) = UPPER(?) AND portfolio_id = ?`,
    args: [userId, ticker, holding.exchange, resolved],
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
      sql: `UPDATE holdings SET shares = ?, purchase_price = ? WHERE id = ? AND user_id = ?`,
      args: [finalShares, avgPrice, existingId, userId],
    });
    return { ...holding, id: existingId, ticker, shares: finalShares, purchasePrice: avgPrice };
  }

  const id = randomUUID();
  await client.execute({
    sql: `INSERT INTO holdings (
            id, user_id, name, ticker, isin, asset_type, shares, purchase_price, display_currency, exchange, value_in_eur, portfolio_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id, userId, holding.name, ticker, holding.isin,
      holding.assetType ?? "stock",
      holding.shares, holding.purchasePrice, holding.displayCurrency,
      holding.exchange, holding.valueInEUR,
      resolved,
    ],
  });
  return { ...holding, id, ticker };
}

export async function updateHolding(
  userId: string,
  holdingId: string,
  updates: Partial<Omit<Holding, "id">>
): Promise<Holding | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT id, name, ticker, isin, asset_type, shares, purchase_price, display_currency, exchange, value_in_eur, sector, region, asset_class, account_id
          FROM holdings WHERE id = ? AND user_id = ?`,
    args: [holdingId, userId],
  });

  if (result.rows.length === 0) return null;
  const current = result.rows[0];

  const exchange = updates.exchange ?? str(current.exchange);
  const rawTicker = updates.ticker ?? str(current.ticker);
  const next = {
    name: updates.name ?? str(current.name),
    ticker: normalizeTickerForExchange(rawTicker, exchange),
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
  };

  await client.execute({
    sql: `UPDATE holdings
          SET name = ?, ticker = ?, isin = ?, asset_type = ?, shares = ?, purchase_price = ?,
              display_currency = ?, exchange = ?, value_in_eur = ?,
              sector = ?, region = ?, asset_class = ?, account_id = ?
          WHERE id = ? AND user_id = ?`,
    args: [
      next.name, next.ticker, next.isin, next.assetType, next.shares, next.purchasePrice,
      next.displayCurrency, next.exchange, next.valueInEUR,
      next.sector, next.region, next.assetClass, next.accountId,
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
  const portfolioFilter = portfolioId ? " AND portfolio_id = ?" : "";
  const portfolioArgs = portfolioId ? [portfolioId] : [];
  await client.execute({ sql: `DELETE FROM holdings WHERE user_id = ?${portfolioFilter}`, args: [userId, ...portfolioArgs] });
  await client.execute({ sql: `DELETE FROM cash_entries WHERE user_id = ?${portfolioFilter}`, args: [userId, ...portfolioArgs] });
  await client.execute({ sql: `DELETE FROM transactions WHERE user_id = ?${portfolioFilter}`, args: [userId, ...portfolioArgs] });
  if (useSeedData) {
    const holdingsCount = await seedHoldingsForUser(client, userId);
    const cashCount = await seedCashForUser(client, userId);
    const txCount = await seedTransactionsForUser(client, userId);
    return holdingsCount + cashCount + txCount;
  }
  return 0;
}

export async function rebuildHoldings(userId: string, portfolioId?: string): Promise<Holding[]> {
  const client = await ensureInitialized();
  const resolved = await resolvePortfolioId(userId, portfolioId);
  const portfolioFilter = " AND portfolio_id = ?";
  const portfolioArgs = [resolved];

  const metadataRows = await client.execute({
    sql: `SELECT id, name, ticker, isin, asset_type, display_currency, exchange, sector, region, asset_class, account_id
          FROM holdings WHERE user_id = ?${portfolioFilter}`,
    args: [userId, ...portfolioArgs],
  });

  const metadataByKey = new Map<string, {
    id: string; name: string; isin: string; assetType: HoldingAssetType;
    displayCurrency: string; sector: string; region: string; assetClass: string; accountId: string;
  }>();
  for (const row of metadataRows.rows) {
    const key = `${str(row.ticker).toUpperCase()}|${str(row.exchange).toUpperCase()}`;
    if (!metadataByKey.has(key)) {
      metadataByKey.set(key, {
        id: str(row.id), name: str(row.name), isin: str(row.isin),
        assetType: holdingAssetType(row.asset_type), displayCurrency: str(row.display_currency),
        sector: str(row.sector), region: str(row.region), assetClass: str(row.asset_class),
        accountId: str(row.account_id),
      });
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

  const derived = deriveHoldingsFromTransactions(transactions, metadataByKey);

  await enrichValueInEUR(derived).catch((err) =>
    console.warn("[rebuildHoldings] quote enrichment failed, using valueInEUR=0:", err)
  );

  await client.execute({ sql: `DELETE FROM holdings WHERE user_id = ?${portfolioFilter}`, args: [userId, ...portfolioArgs] });

  for (const h of derived) {
    const key = `${h.ticker.toUpperCase()}|${h.exchange.toUpperCase()}`;
    const existingId = metadataByKey.get(key)?.id;
    const id = existingId || randomUUID();
    await client.execute({
      sql: `INSERT INTO holdings (id, user_id, name, ticker, isin, asset_type, shares, purchase_price, display_currency, exchange, value_in_eur, sector, region, asset_class, account_id, portfolio_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, userId, h.name, h.ticker, h.isin || "", h.assetType || "stock", h.shares, h.purchasePrice, h.displayCurrency, h.exchange, h.valueInEUR || 0, h.sector || "", h.region || "", h.assetClass || "", h.accountId || "", resolved],
    });
  }

  return derived;
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
