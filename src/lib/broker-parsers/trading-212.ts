/**
 * Trading 212 History CSV parser.
 *
 * Fixed columns A-K (all exports):
 *   Action, Time, ISIN, Ticker, Name, No. of shares,
 *   Price / share, Currency (Price / share), Exchange rate,
 *   Result ({ccy}), Total ({ccy})
 *
 * Variable columns L+ differ by tax year (2019-2022+). Fee columns are
 * detected dynamically at parse time.
 *
 * Verified from Trading 212 community forum:
 * community.trading212.com/t/csv-exports-issue/57009
 */

import type { BrokerParser, ParsedTransaction } from "./types";
import { parseCSVLine, buildColumnMap, cell, num } from "./utils";

const FEE_COLUMN_PATTERNS = [
  "charge amount",
  "stamp duty reserve tax",
  "stamp duty",
  "transaction fee",
  "deposit fee",
  "finra fee",
  "currency conversion fee",
];

const TAX_COLUMN_PATTERNS = ["withholding tax"];

function detectType(action: string): ParsedTransaction["type"] | null {
  const lower = action.toLowerCase();
  if (lower.includes("dividend")) return "dividend";
  if (lower.includes("buy")) return "buy";
  if (lower.includes("sell")) return "sell";
  // Skip deposits, withdrawals, interest, etc.
  return null;
}

function parseTrading212(csv: string, _isinToTicker: Record<string, string>): ParsedTransaction[] {
  const lines = csv.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map((h) => h.trim());
  const colMap = buildColumnMap(headers);

  // Detect fee and tax column indices dynamically
  const feeIndices: number[] = [];
  const taxIndices: number[] = [];
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase();
    if (TAX_COLUMN_PATTERNS.some((p) => h.startsWith(p))) {
      taxIndices.push(i);
    } else if (FEE_COLUMN_PATTERNS.some((p) => h.startsWith(p))) {
      feeIndices.push(i);
    }
  }

  // Core column indices
  const actionIdx = colMap["Action"];
  const timeIdx = colMap["Time"];
  const isinIdx = colMap["ISIN"];
  const tickerIdx = colMap["Ticker"];
  const nameIdx = colMap["Name"];
  const sharesIdx = colMap["No. of shares"];
  const priceIdx = colMap["Price / share"];
  const currIdx = headers.findIndex((h) => h.startsWith("Currency (Price"));

  // Find ID column (always one of the last columns)
  const idIdx = colMap["ID"];

  // Find the "Total" column (header includes base currency, e.g. "Total (GBP)")
  const totalIdx = headers.findIndex((h) => h.startsWith("Total"));

  const transactions: ParsedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    const action = cell(row, actionIdx);
    const type = detectType(action);
    if (!type) continue;

    const ticker = cell(row, tickerIdx);
    const isin = cell(row, isinIdx);
    const name = cell(row, nameIdx);
    const shares = num(cell(row, sharesIdx));
    const price = num(cell(row, priceIdx));
    const currency = cell(row, currIdx) || "GBP";
    const rawTime = cell(row, timeIdx);
    const date = rawTime.slice(0, 10); // "2024-01-15 10:30:00" -> "2024-01-15"
    const total = num(cell(row, totalIdx));
    const id = cell(row, idIdx);

    const fees = feeIndices.reduce((sum, idx) => sum + Math.abs(num(cell(row, idx))), 0);
    const taxes = taxIndices.reduce((sum, idx) => sum + Math.abs(num(cell(row, idx))), 0);

    const totalAmount = type === "dividend"
      ? Math.abs(total) || Math.abs(shares * price)
      : Math.abs(total) || shares * price;

    transactions.push({
      date,
      type,
      ticker,
      name,
      isin,
      shares: type === "dividend" ? 0 : shares,
      pricePerShare: price,
      totalAmount,
      fees,
      taxes,
      currency,
      orderId: id,
      sourceRef: id ? `trading212|${id}` : `trading212|${date}|${type}|${ticker}|${totalAmount}`,
    });
  }

  transactions.sort((a, b) => b.date.localeCompare(a.date));
  return transactions;
}

function extractIsins(csv: string): string[] {
  const isins = new Set<string>();
  const lines = csv.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  const isinIdx = headers.findIndex((h) => h.trim() === "ISIN");
  if (isinIdx < 0) return [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    const isin = cell(row, isinIdx);
    if (/^[A-Z]{2}[A-Z0-9]{10}$/.test(isin)) isins.add(isin);
  }
  return Array.from(isins);
}

export const trading212Parser: BrokerParser = {
  id: "trading_212",
  label: "Trading 212",
  fileHint: "History CSV export",

  parse: parseTrading212,

  extractIsins(csv: string): string[] {
    return extractIsins(csv);
  },
};
