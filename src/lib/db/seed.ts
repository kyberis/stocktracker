import { randomUUID } from "crypto";
import { readFileSync, existsSync } from "fs";
import path from "path";
import type { Client } from "@libsql/client";
import { parseDegiroCSV, buildIsinMap } from "@/lib/degiro-parser";

import type { HoldingAssetType } from "@/lib/types";
import { inferAssetType } from "@/lib/infer-asset-type";

interface SeedHolding {
  name: string;
  ticker: string;
  isin: string;
  assetType?: "stock" | "etf" | "fund";
  shares: number;
  purchasePrice: number;
  displayCurrency: string;
  exchange: string;
  valueInEUR: number;
}

interface SeedCash {
  name: string;
  amountEUR: number;
  type?: string;
  source?: string;
  displayCurrency?: string;
  displayAmount?: number;
  notes?: string;
  valuationDate?: string;
}

function seedAssetType(row: SeedHolding): HoldingAssetType {
  if (row.assetType) return row.assetType;
  return inferAssetType({ name: row.name });
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

// Additional ISINs for products that were sold and are no longer in current holdings
const EXTRA_ISIN_MAP: Record<string, string> = {
  "CA0641491075": "BNS",       // Bank of Nova Scotia
  "CA1363851017": "CNQ",       // Canadian Natural Resources
  "VGG273581030": "DESP",      // Despegar.com
  "NL0013654783": "PRX.AS",    // Prosus
  "IE00B02KXH56": "IJPA.L",   // iShares MSCI Japan
  "IE0031442068": "IUSA.L",   // iShares Core S&P 500
  "IE00B4X9L533": "HMWO.L",   // HSBC MSCI World
  "IE00B3VVMM84": "VFEM.L",   // Vanguard FTSE Emerging Mkts
  "IE00B1TXK627": "IH2O.L",   // iShares Global Water
  "IE00BQT3WG13": "ICGA.DE",  // iShares MSCI China A (old)
  "IE00BGSF1X88": "IB01.L",   // iShares USD Treasury 0-1yr
  "US1462805086": "SILA",      // Sila Realty
  "US00724F1012": "ADBE",      // Adobe
  "US6701002056": "NVO",       // Novo Nordisk ADR
  "US8740391003": "TSM",       // Taiwan Semiconductor ADR
  "US02079K3059": "GOOGL",     // Alphabet
  "US0231351067": "AMZN",      // Amazon
  "US0846707026": "BRK-B",     // Berkshire Hathaway
  "US1667641005": "CVX",       // Chevron
  "US29670G1022": "WTRG",      // Essential Utilities
  "US5007541064": "KHC",       // Kraft Heinz
  "US56035L1044": "MAIN",      // Main Street Capital
  "US6374171063": "NNN",       // NNN REIT
  "US6745991058": "OXY",       // Occidental Petroleum
  "US7170811035": "PFE",       // Pfizer
  "US7561091049": "O",         // Realty Income
  "US8299331004": "SIRI",      // Sirius XM
  "US92343V1044": "VZ",        // Verizon
  "CA21037X1006": "W9C",       // Constellation Software
  "DE000A3H2200": "NA9.DE",    // Nagarro
  "DK0062498333": "NOVO-B.CO", // Novo Nordisk Class B
  "ES0148396007": "ITX.MC",    // Inditex
  "GB00BG5NDX91": "SRB.L",    // Serabi Gold
  "IE00B6R52036": "IS0E",      // iShares Gold Producers
  "IE00BJ5JPG56": "ICGA",      // iShares MSCI China
};

export async function seedHoldingsForUser(client: Client, userId: string, portfolioId: string): Promise<number> {
  const holdings = getSeedHoldings();
  const stmts = holdings.map((row) => ({
    sql: `INSERT INTO holdings (
      id, user_id, name, ticker, isin, asset_type, shares, purchase_price, display_currency, exchange, value_in_eur, portfolio_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      randomUUID(),
      userId,
      row.name,
      row.ticker,
      row.isin,
      seedAssetType(row),
      row.shares,
      row.purchasePrice,
      row.displayCurrency,
      row.exchange,
      row.valueInEUR,
      portfolioId,
    ],
  }));

  await client.batch(stmts, "write");
  return holdings.length;
}

export async function seedCashForUser(client: Client, userId: string, portfolioId: string): Promise<number> {
  const cash = getSeedCash();
  if (cash.length === 0) return 0;

  const stmts = cash.map((row) => ({
    sql: `INSERT OR IGNORE INTO cash_entries (id, user_id, name, amount_eur, type, source, display_currency, display_amount, notes, valuation_date, portfolio_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      randomUUID(), userId, row.name, row.amountEUR,
      row.type ?? "cash",
      row.source ?? "manual",
      row.displayCurrency ?? "EUR",
      row.displayAmount ?? row.amountEUR,
      row.notes ?? "",
      row.valuationDate ?? "",
      portfolioId,
    ],
  }));

  await client.batch(stmts, "write");
  return cash.length;
}

export async function seedTransactionsForUser(client: Client, userId: string, portfolioId: string): Promise<number> {
  const csvPath = path.join(process.cwd(), "docs", "portfolio_sample_degiro.csv");
  if (!existsSync(csvPath)) return 0;

  const csv = readFileSync(csvPath, "utf8");
  const holdings = getSeedHoldings();
  const isinMap = { ...buildIsinMap(holdings), ...EXTRA_ISIN_MAP };
  const txs = parseDegiroCSV(csv, isinMap);

  if (txs.length === 0) return 0;

  const BATCH_SIZE = 50;
  let total = 0;
  for (let i = 0; i < txs.length; i += BATCH_SIZE) {
    const batch = txs.slice(i, i + BATCH_SIZE);
    const stmts = batch.map((tx) => ({
      sql: `INSERT INTO transactions (id, user_id, holding_id, ticker, type, date, shares, price_per_share, total_amount, fees, taxes, currency, notes, portfolio_id)
            VALUES (?, ?, '', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        randomUUID(),
        userId,
        tx.ticker,
        tx.type,
        tx.date,
        tx.shares,
        tx.pricePerShare,
        tx.totalAmount,
        tx.fees,
        tx.taxes,
        tx.currency,
        tx.name,
        portfolioId,
      ],
    }));
    await client.batch(stmts, "write");
    total += batch.length;
  }

  return total;
}
