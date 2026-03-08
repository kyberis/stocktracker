/**
 * Charles Schwab Brokerage History CSV parser.
 *
 * Export from: Account → select account → History → Export (top-right).
 *
 * File format: Schwab prepends 2 header lines before the column row.
 * The column row looks like:
 *   Date,Action,Symbol,Description,Quantity,Price,Fees & Comm,Amount
 *
 * Transaction types (Action column):
 *   Buy, Sell, Reinvest Dividend, Cash Dividend, Qualified Dividend,
 *   Special Dividend, Bank Interest, Margin Interest, Wire Transferred,
 *   Journal, MoneyLink Transfer, NFS Charges, Purchased, Sold
 *
 * Verified against multiple community-posted Schwab exports.
 */

import type { BrokerParser, ParsedTransaction } from "./types";
import { parseCSVLine, buildColumnMap, cell, num, extractDate, deduplicateSourceRefs } from "./utils";

function detectType(action: string): ParsedTransaction["type"] | null {
  const a = action.toLowerCase();
  if (a.includes("sell") || a === "sold") return "sell";
  if (a.includes("buy") || a === "purchased") return "buy";
  if (a.includes("dividend") || a.includes("distribution")) return "dividend";
  return null;
}

function parseCharlesSchwab(csv: string, _isinToTicker: Record<string, string>): ParsedTransaction[] {
  const rawLines = csv.split("\n");

  // Find the header row: it contains the "Date" and "Action" columns
  let headerIdx = -1;
  for (let i = 0; i < rawLines.length; i++) {
    const l = rawLines[i];
    if (l.includes("Date") && l.includes("Action") && l.includes("Symbol")) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) return [];

  const lines = rawLines.slice(headerIdx).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map((h) => h.trim());
  const colMap = buildColumnMap(headers);

  const dateIdx = colMap["Date"];
  const actionIdx = colMap["Action"];
  const symbolIdx = colMap["Symbol"];
  const descIdx = colMap["Description"];
  const qtyIdx = colMap["Quantity"];
  const priceIdx = colMap["Price"];
  const feesIdx = colMap["Fees & Comm"];
  const amountIdx = colMap["Amount"];

  const transactions: ParsedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    const action = cell(row, actionIdx);
    const type = detectType(action);
    if (!type) continue;

    const rawDate = cell(row, dateIdx);
    // Schwab dates: "MM/DD/YYYY" or "YYYY-MM-DD"
    let date = "";
    const slashMatch = rawDate.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (slashMatch) {
      date = `${slashMatch[3]}-${slashMatch[1]}-${slashMatch[2]}`;
    } else {
      date = extractDate(rawDate);
    }
    if (!date) continue;

    const symbol = cell(row, symbolIdx);
    const name = cell(row, descIdx) || symbol;
    const shares = Math.abs(num(cell(row, qtyIdx)));
    const price = Math.abs(num(cell(row, priceIdx)));
    const fees = Math.abs(num(cell(row, feesIdx)));
    const rawAmount = num(cell(row, amountIdx));
    const totalAmount = Math.abs(rawAmount) || shares * price;

    transactions.push({
      date,
      type,
      ticker: symbol,
      name,
      isin: "",
      shares: type === "dividend" ? 0 : shares,
      pricePerShare: price,
      totalAmount,
      fees,
      taxes: 0,
      currency: "USD",
      orderId: "",
      sourceRef: `schwab|${date}|${type}|${symbol}|${totalAmount}`,
    });
  }

  deduplicateSourceRefs(transactions);
  transactions.sort((a, b) => b.date.localeCompare(a.date));
  return transactions;
}

export const charlesSchwabParser: BrokerParser = {
  id: "charles_schwab",
  label: "Charles Schwab",
  fileHint: "Brokerage History CSV",

  parse: parseCharlesSchwab,
};
