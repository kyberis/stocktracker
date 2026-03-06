/**
 * Parses a simple CSV with columns: ticker, type, price, amount, currency
 *
 * Accepts both period and comma decimal separators.
 * Skips rows with missing/invalid ticker or type.
 */

import type { DegiroTransaction } from "./degiro-parser";
import { deduplicateSourceRefs } from "./broker-parsers/utils";

type TxType = DegiroTransaction["type"];

const VALID_TYPES = new Set<TxType>(["buy", "sell", "dividend", "fee"]);

function parseNumber(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.trim().replace(/\s/g, "");
  if (cleaned.includes(",") && !cleaned.includes(".")) {
    return parseFloat(cleaned.replace(",", ".")) || 0;
  }
  return parseFloat(cleaned) || 0;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === "," && !inQuotes) { result.push(current.trim()); current = ""; continue; }
    current += ch;
  }
  result.push(current.trim());
  return result;
}

function detectSeparator(headerLine: string): string {
  if (headerLine.includes("\t")) return "\t";
  if (headerLine.includes(";")) return ";";
  return ",";
}

function splitLine(line: string, separator: string): string[] {
  if (separator === ",") return parseCSVLine(line);
  return line.split(separator).map((s) => s.trim().replace(/^"|"$/g, ""));
}

function resolveColumnIndices(headers: string[]): {
  ticker: number;
  type: number;
  price: number;
  amount: number;
  currency: number;
  date: number;
  name: number;
} {
  const lower = headers.map((h) => h.toLowerCase().replace(/[^a-z]/g, ""));
  const find = (candidates: string[]) =>
    lower.findIndex((h) => candidates.includes(h));

  return {
    ticker: find(["ticker", "symbol", "ticket"]),
    type: find(["type", "tipo"]),
    price: find(["price", "precio", "pricepershare"]),
    amount: find(["amount", "shares", "cantidad", "quantity"]),
    currency: find(["currency", "divisa", "curr", "moneda"]),
    date: find(["date", "fecha"]),
    name: find(["name", "nombre", "product", "producto"]),
  };
}

export function parseSimpleCSV(csv: string): DegiroTransaction[] {
  const lines = csv.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const separator = detectSeparator(lines[0]);
  const headers = splitLine(lines[0], separator);
  const cols = resolveColumnIndices(headers);

  if (cols.ticker < 0 || cols.type < 0) return [];

  const today = new Date().toISOString().slice(0, 10);
  const transactions: DegiroTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = splitLine(lines[i], separator);
    const ticker = (fields[cols.ticker] || "").toUpperCase().trim();
    if (!ticker) continue;

    const rawType = (fields[cols.type] || "").toLowerCase().trim() as TxType;
    if (!VALID_TYPES.has(rawType)) continue;

    const price = cols.price >= 0 ? parseNumber(fields[cols.price]) : 0;
    const shares = cols.amount >= 0 ? parseNumber(fields[cols.amount]) : 0;
    const currency = cols.currency >= 0
      ? (fields[cols.currency] || "EUR").toUpperCase().trim()
      : "EUR";
    const date = cols.date >= 0 ? (fields[cols.date] || today).trim() : today;
    const name = cols.name >= 0 ? (fields[cols.name] || ticker).trim() : ticker;

    const totalAmount = rawType === "fee" ? price : shares * price;

    const absTotalAmount = Math.abs(totalAmount);
    transactions.push({
      date,
      type: rawType,
      ticker,
      name,
      isin: "",
      shares: rawType === "fee" ? 0 : shares,
      pricePerShare: price,
      totalAmount: absTotalAmount,
      fees: 0,
      taxes: 0,
      currency,
      orderId: "",
      sourceRef: `simple|${date}|${rawType}|${ticker}|${absTotalAmount}`,
    });
  }

  deduplicateSourceRefs(transactions);
  transactions.sort((a, b) => b.date.localeCompare(a.date));
  return transactions;
}
