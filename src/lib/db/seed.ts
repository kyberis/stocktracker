import { randomUUID } from "crypto";
import { readFileSync } from "fs";
import path from "path";
import type { Client } from "@libsql/client";

interface SeedHolding {
  name: string;
  ticker: string;
  isin: string;
  assetType?: "stock" | "etf";
  shares: number;
  purchasePrice: number;
  displayCurrency: string;
  exchange: string;
  valueInEUR: number;
}

interface SeedCash {
  name: string;
  amountEUR: number;
}

function inferAssetType(row: SeedHolding): "stock" | "etf" {
  if (row.assetType === "etf") return "etf";
  if (row.assetType === "stock") return "stock";
  return row.name.toUpperCase().includes("ETF") ? "etf" : "stock";
}

function getSeedHoldings(): SeedHolding[] {
  const filePath = path.join(process.cwd(), "data", "seed-holdings.json");
  const raw = readFileSync(filePath, "utf8");
  return JSON.parse(raw) as SeedHolding[];
}

function getSeedCash(): SeedCash[] {
  try {
    const filePath = path.join(process.cwd(), "data", "seed-cash.json");
    const raw = readFileSync(filePath, "utf8");
    return JSON.parse(raw) as SeedCash[];
  } catch {
    return [];
  }
}

export async function seedHoldingsForUser(client: Client, userId: string): Promise<number> {
  const holdings = getSeedHoldings();
  const stmts = holdings.map((row) => ({
    sql: `INSERT INTO holdings (
      id, user_id, name, ticker, isin, asset_type, shares, purchase_price, display_currency, exchange, value_in_eur
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      randomUUID(),
      userId,
      row.name,
      row.ticker,
      row.isin,
      inferAssetType(row),
      row.shares,
      row.purchasePrice,
      row.displayCurrency,
      row.exchange,
      row.valueInEUR,
    ],
  }));

  await client.batch(stmts, "write");
  return holdings.length;
}

export async function seedCashForUser(client: Client, userId: string): Promise<number> {
  const cash = getSeedCash();
  if (cash.length === 0) return 0;

  const stmts = cash.map((row) => ({
    sql: `INSERT OR IGNORE INTO cash_entries (id, user_id, name, amount_eur)
          VALUES (?, ?, ?, ?)`,
    args: [randomUUID(), userId, row.name, row.amountEUR],
  }));

  await client.batch(stmts, "write");
  return cash.length;
}
