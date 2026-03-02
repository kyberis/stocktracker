import { randomUUID } from "crypto";
import { readFileSync } from "fs";
import path from "path";
import type { Client } from "@libsql/client";

interface SeedHolding {
  name: string;
  ticker: string;
  isin: string;
  shares: number;
  purchasePrice: number;
  displayCurrency: string;
  exchange: string;
  valueInEUR: number;
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
      id, user_id, name, ticker, isin, shares, purchase_price, display_currency, exchange, value_in_eur
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      randomUUID(),
      userId,
      row.name,
      row.ticker,
      row.isin,
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
