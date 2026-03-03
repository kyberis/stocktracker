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
