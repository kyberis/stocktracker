import { randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import { str, num, holdingAssetType, normalizeTickerForExchange } from "./helpers";
import type { Holding, HoldingAssetType } from "@/lib/types";
import { deriveHoldingsFromTransactions } from "@/lib/derive-holdings";
import { seedHoldingsForUser, seedCashForUser, seedTransactionsForUser } from "./seed";
import { listTransactions } from "./transactions";

export async function listHoldings(userId: string): Promise<Holding[]> {
  const client = await ensureInitialized();
  const holdingsResult = await client.execute({
    sql: `SELECT id, name, ticker, isin, asset_type, shares, purchase_price, display_currency, exchange, value_in_eur, sector, region, asset_class, account_id
          FROM holdings WHERE user_id = ? ORDER BY name ASC`,
    args: [userId],
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
    sql: "SELECT COUNT(*) as cnt FROM transactions WHERE user_id = ?",
    args: [userId],
  });
  if (num(txCount.rows[0]?.cnt) > 0) {
    return rebuildHoldings(userId);
  }

  return [];
}

export async function addHolding(
  userId: string,
  holding: Omit<Holding, "id">
): Promise<Holding> {
  const client = await ensureInitialized();
  const ticker = normalizeTickerForExchange(holding.ticker, holding.exchange);

  const existing = await client.execute({
    sql: `SELECT id, shares, purchase_price FROM holdings
          WHERE user_id = ? AND UPPER(ticker) = UPPER(?) AND UPPER(exchange) = UPPER(?)`,
    args: [userId, ticker, holding.exchange],
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
            id, user_id, name, ticker, isin, asset_type, shares, purchase_price, display_currency, exchange, value_in_eur
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id, userId, holding.name, ticker, holding.isin,
      holding.assetType ?? "stock",
      holding.shares, holding.purchasePrice, holding.displayCurrency,
      holding.exchange, holding.valueInEUR,
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
  useSeedData: boolean
): Promise<number> {
  const client = await ensureInitialized();
  await client.execute({ sql: "DELETE FROM holdings WHERE user_id = ?", args: [userId] });
  await client.execute({ sql: "DELETE FROM cash_entries WHERE user_id = ?", args: [userId] });
  await client.execute({ sql: "DELETE FROM transactions WHERE user_id = ?", args: [userId] });
  if (useSeedData) {
    const holdingsCount = await seedHoldingsForUser(client, userId);
    const cashCount = await seedCashForUser(client, userId);
    const txCount = await seedTransactionsForUser(client, userId);
    return holdingsCount + cashCount + txCount;
  }
  return 0;
}

export async function rebuildHoldings(userId: string): Promise<Holding[]> {
  const client = await ensureInitialized();

  const metadataRows = await client.execute({
    sql: `SELECT id, name, ticker, isin, asset_type, display_currency, exchange, sector, region, asset_class, account_id
          FROM holdings WHERE user_id = ?`,
    args: [userId],
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

  const transactions = await listTransactions(userId);
  const derived = deriveHoldingsFromTransactions(transactions, metadataByKey);

  await client.execute({ sql: "DELETE FROM holdings WHERE user_id = ?", args: [userId] });

  for (const h of derived) {
    const id = randomUUID();
    await client.execute({
      sql: `INSERT INTO holdings (id, user_id, name, ticker, isin, asset_type, shares, purchase_price, display_currency, exchange, value_in_eur, sector, region, asset_class, account_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, userId, h.name, h.ticker, h.isin || "", h.assetType || "stock", h.shares, h.purchasePrice, h.displayCurrency, h.exchange, h.valueInEUR || 0, h.sector || "", h.region || "", h.assetClass || "", h.accountId || ""],
    });
  }

  return derived;
}

export async function deleteAllHoldings(userId: string): Promise<number> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "DELETE FROM holdings WHERE user_id = ?",
    args: [userId],
  });
  return Number(result.rowsAffected ?? 0);
}
