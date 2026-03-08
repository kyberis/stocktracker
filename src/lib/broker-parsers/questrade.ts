/**
 * Questrade Account Activity CSV/Excel parser.
 *
 * Export from: Accounts menu → select account → Account Activity →
 *              select date range → Download.
 * The Excel export can be saved as CSV.
 *
 * Columns:
 *   Transaction Date, Settlement Date, Action, Symbol, Description,
 *   Currency, Quantity, Price, Gross Amount, Commission,
 *   Net Amount, Activity Type, Account #, Account Type
 *
 * Action values:
 *   Buy, Sell, DIV (dividend), INT, CON, TFI, TFO, FXT, etc.
 *
 * Verified against Questrade CSV samples shared in the community.
 */

import type { BrokerParser, ParsedTransaction } from "./types";
import { parseCSVLine, buildColumnMap, cell, num, extractDate, deduplicateSourceRefs } from "./utils";

function detectType(action: string): ParsedTransaction["type"] | null {
  const a = action.toUpperCase().trim();
  if (a === "BUY") return "buy";
  if (a === "SELL") return "sell";
  if (a === "DIV" || a === "DIVIDEND") return "dividend";
  return null;
}

function parseQuestrade(csv: string, _isinToTicker: Record<string, string>): ParsedTransaction[] {
  const rawLines = csv.split("\n");

  // Find header row: must contain "Transaction Date" and "Action"
  let headerIdx = -1;
  for (let i = 0; i < rawLines.length; i++) {
    const l = rawLines[i];
    if (l.includes("Transaction Date") && l.includes("Action")) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) return [];

  const lines = rawLines.slice(headerIdx).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map((h) => h.trim());
  const colMap = buildColumnMap(headers);

  const txDateIdx = colMap["Transaction Date"];
  const actionIdx = colMap["Action"];
  const symbolIdx = colMap["Symbol"];
  const descIdx = colMap["Description"];
  const currencyIdx = colMap["Currency"];
  const qtyIdx = colMap["Quantity"];
  const priceIdx = colMap["Price"];
  const grossAmountIdx = colMap["Gross Amount"];
  const commissionIdx = colMap["Commission"];
  const netAmountIdx = colMap["Net Amount"];

  const transactions: ParsedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    const action = cell(row, actionIdx);
    const type = detectType(action);
    if (!type) continue;

    const rawDate = cell(row, txDateIdx);
    // Questrade dates: "2024-01-15 12:00:00 AM" or "YYYY-MM-DD"
    const date = extractDate(rawDate);
    if (!date) continue;

    const symbol = cell(row, symbolIdx);
    const desc = cell(row, descIdx) || symbol;
    const currency = cell(row, currencyIdx) || "CAD";
    const qty = Math.abs(num(cell(row, qtyIdx)));
    const price = Math.abs(num(cell(row, priceIdx)));
    const gross = Math.abs(num(cell(row, grossAmountIdx)));
    const commission = Math.abs(num(cell(row, commissionIdx)));
    const net = Math.abs(num(cell(row, netAmountIdx)));
    const totalAmount = gross || net || qty * price;

    transactions.push({
      date,
      type,
      ticker: symbol,
      name: desc,
      isin: "",
      shares: type === "dividend" ? 0 : qty,
      pricePerShare: price,
      totalAmount,
      fees: commission,
      taxes: 0,
      currency,
      orderId: "",
      sourceRef: `questrade|${date}|${type}|${symbol}|${totalAmount}`,
    });
  }

  deduplicateSourceRefs(transactions);
  transactions.sort((a, b) => b.date.localeCompare(a.date));
  return transactions;
}

export const questradeParser: BrokerParser = {
  id: "questrade",
  label: "Questrade",
  fileHint: "Account Activity CSV",

  parse: parseQuestrade,
};
