/**
 * Firstrade Account History CSV parser.
 *
 * Export from: Tax Center → select account → Download Account Information →
 *              select date range → Excel CSV Files.
 *
 * Columns:
 *   Date, Action, Symbol, Description, Quantity, Price,
 *   Commission, Fees, Amount, Settlement Date, Account
 *
 * Action values:
 *   Buy, Sell, Dividend, Long-term Capital Gain Distribution,
 *   Short-term Capital Gain Distribution, Reinvest Dividend,
 *   Transfer In, Transfer Out, Interest, Wire, etc.
 *
 * Verified against Firstrade community-shared CSV exports.
 */

import type { BrokerParser, ParsedTransaction } from "./types";
import { parseCSVLine, buildColumnMap, cell, num, extractDate, deduplicateSourceRefs, detectByHeaderColumns } from "./utils";

// Plain "Date"/"Commission"/"Fees"/"Amount"/"Account" (all separate, exact
// columns) distinguish this from Schwab ("Fees & Comm" combined), Fidelity
// ("Commission ($)"/"Fees ($)"/"Amount ($)"), and Questrade ("Transaction
// Date"/"Gross Amount"/"Net Amount"/"Account #").
const REQUIRED_COLUMNS = ["Date", "Action", "Symbol", "Description", "Quantity", "Price", "Commission", "Fees", "Amount", "Settlement Date", "Account"];

function detect(csv: string): boolean {
  return detectByHeaderColumns(csv, REQUIRED_COLUMNS);
}

function detectType(action: string): ParsedTransaction["type"] | null {
  const a = action.toUpperCase().trim();
  if (a.startsWith("BUY") || a.includes("PURCHASED")) return "buy";
  if (a.startsWith("SELL") || a.includes("SOLD")) return "sell";
  if (
    a.startsWith("DIVIDEND") ||
    a.includes("CAPITAL GAIN") ||
    a.startsWith("REINVEST")
  ) return "dividend";
  return null;
}

function parseFirstrade(csv: string, _isinToTicker: Record<string, string>): ParsedTransaction[] {
  const rawLines = csv.split("\n");

  // Find header row: must contain "Date", "Action", and "Symbol"
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
  const commissionIdx = colMap["Commission"];
  const feesIdx = colMap["Fees"];
  const amountIdx = colMap["Amount"];

  const transactions: ParsedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    const action = cell(row, actionIdx);
    const type = detectType(action);
    if (!type) continue;

    const rawDate = cell(row, dateIdx);
    // Firstrade dates: "MM/DD/YYYY" or "YYYY-MM-DD"
    let date = "";
    const slashMatch = rawDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashMatch) {
      date = `${slashMatch[3]}-${slashMatch[1].padStart(2, "0")}-${slashMatch[2].padStart(2, "0")}`;
    } else {
      date = extractDate(rawDate);
    }
    if (!date) continue;

    const symbol = cell(row, symbolIdx);
    const desc = cell(row, descIdx) || symbol;
    const qty = Math.abs(num(cell(row, qtyIdx)));
    const price = Math.abs(num(cell(row, priceIdx)));
    const commission = Math.abs(num(cell(row, commissionIdx)));
    const fees = commission + Math.abs(num(cell(row, feesIdx)));
    const rawAmount = num(cell(row, amountIdx));
    const totalAmount = Math.abs(rawAmount) || qty * price;

    transactions.push({
      date,
      type,
      ticker: symbol,
      name: desc,
      isin: "",
      shares: type === "dividend" ? 0 : qty,
      pricePerShare: price,
      totalAmount,
      fees,
      taxes: 0,
      currency: "USD",
      orderId: "",
      sourceRef: `firstrade|${date}|${type}|${symbol}|${totalAmount}`,
    });
  }

  deduplicateSourceRefs(transactions);
  transactions.sort((a, b) => b.date.localeCompare(a.date));
  return transactions;
}

export const firsttradeParser: BrokerParser = {
  id: "firstrade",
  label: "Firstrade",
  fileHint: "Account History CSV",

  detect,

  parse: parseFirstrade,
};
