/**
 * Fidelity Brokerage Activity CSV parser.
 *
 * Export from: Activity & Orders → Custom date range → Download (CSV).
 * Upload one file per year (max 366 days), oldest to newest.
 *
 * Column row (after optional preamble lines):
 *   Run Date, Account, Action, Symbol, Security Description,
 *   Security Type, Quantity, Price ($), Commission ($),
 *   Fees ($), Accrued Interest ($), Amount ($), Settlement Date
 *
 * Transaction types (Action column keywords):
 *   YOU BOUGHT, YOU SOLD, DIVIDEND RECEIVED, REINVESTMENT, LONG-TERM CAP GAIN,
 *   SHORT-TERM CAP GAIN, IN-KIND TRANSFER, JOURNALED SHARES
 *
 * Verified against community-posted Fidelity CSV exports.
 */

import type { BrokerParser, ParsedTransaction } from "./types";
import { parseCSVLine, buildColumnMap, cell, num, extractDate, deduplicateSourceRefs, hasExactColumns } from "./utils";

// The "($)" suffixed column names (unique to Fidelity) are what distinguish
// this from Firstrade/Questrade, which use the same bare names without it.
const REQUIRED_COLUMNS = ["Action", "Symbol", "Security Description", "Quantity", "Price ($)", "Commission ($)", "Amount ($)"];

function detect(csv: string): boolean {
  const rawLines = csv.split("\n");
  for (let i = 0; i < Math.min(rawLines.length, 10); i++) {
    const l = rawLines[i];
    if (!((l.includes("Run Date") || l.includes("Trade Date")) && l.includes("Action"))) continue;
    if (hasExactColumns(parseCSVLine(l).map((h) => h.trim()), REQUIRED_COLUMNS)) return true;
  }
  return false;
}

function detectType(action: string): ParsedTransaction["type"] | null {
  const a = action.toUpperCase();
  if (a.includes("SOLD")) return "sell";
  if (a.includes("BOUGHT") || a.includes("PURCHASE")) return "buy";
  if (
    a.includes("DIVIDEND") ||
    a.includes("REINVESTMENT") ||
    a.includes("CAP GAIN") ||
    a.includes("CAPITAL GAIN")
  ) return "dividend";
  return null;
}

function parseFidelity(csv: string, _isinToTicker: Record<string, string>): ParsedTransaction[] {
  const rawLines = csv.split("\n");

  // Find header row: contains "Run Date" and "Action"
  let headerIdx = -1;
  for (let i = 0; i < rawLines.length; i++) {
    const l = rawLines[i];
    if ((l.includes("Run Date") || l.includes("Trade Date")) && l.includes("Action")) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) return [];

  const lines = rawLines.slice(headerIdx).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map((h) => h.trim());
  const colMap = buildColumnMap(headers);

  // Support both "Run Date" and "Trade Date" header variants
  const dateIdx = colMap["Run Date"] ?? colMap["Trade Date"];
  const actionIdx = colMap["Action"];
  const symbolIdx = colMap["Symbol"];
  const descIdx = colMap["Security Description"];
  const qtyIdx = colMap["Quantity"];
  const priceIdx = colMap["Price ($)"] ?? colMap["Price"];
  const commIdx = colMap["Commission ($)"] ?? colMap["Commission"];
  const feesIdx = colMap["Fees ($)"] ?? colMap["Fees"];
  const amountIdx = colMap["Amount ($)"] ?? colMap["Amount"];

  const transactions: ParsedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    const action = cell(row, actionIdx);
    const type = detectType(action);
    if (!type) continue;

    const rawDate = cell(row, dateIdx);
    // Fidelity dates: "MM/DD/YYYY"
    let date = "";
    const slashMatch = rawDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashMatch) {
      date = `${slashMatch[3]}-${slashMatch[1].padStart(2, "0")}-${slashMatch[2].padStart(2, "0")}`;
    } else {
      date = extractDate(rawDate);
    }
    if (!date) continue;

    const symbol = cell(row, symbolIdx);
    if (!symbol && type !== "dividend") continue;

    const name = cell(row, descIdx) || symbol;
    const shares = Math.abs(num(cell(row, qtyIdx)));
    const price = Math.abs(num(cell(row, priceIdx)));
    const commission = Math.abs(num(cell(row, commIdx)));
    const fees = commission + Math.abs(num(cell(row, feesIdx)));
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
      sourceRef: `fidelity|${date}|${type}|${symbol}|${totalAmount}`,
    });
  }

  deduplicateSourceRefs(transactions);
  transactions.sort((a, b) => b.date.localeCompare(a.date));
  return transactions;
}

export const fidelityParser: BrokerParser = {
  id: "fidelity",
  label: "Fidelity",
  fileHint: "Activity & Orders CSV",

  detect,

  parse: parseFidelity,
};
