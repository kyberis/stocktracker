/**
 * Tastytrade (TastyTrade) Transaction History CSV parser.
 *
 * Export from: Desktop app → History tab (clock icon) → CSV button (top-right).
 *
 * Column row:
 *   Date, Type, Sub Type, Action, Symbol, Instrument Type, Description,
 *   Value, Quantity, Average Price, Commissions, Fees, Multiplier,
 *   Underlying Symbol, Expiration Date, Strike Price, Call or Put
 *
 * Relevant Type values:
 *   Trade → Action = Buy to Open / Sell to Close / etc.
 *   Receive Deliver → dividends, stock splits
 *   Money Movement → fees, interest, cash
 *
 * Instrument types we parse: Equity (stocks), ETF.
 * Options are skipped.
 *
 * Verified against publicly shared Tastytrade CSV samples.
 */

import type { BrokerParser, ParsedTransaction } from "./types";
import { parseCSVLine, buildColumnMap, cell, num, extractDate, deduplicateSourceRefs, hasExactColumns } from "./utils";

const REQUIRED_COLUMNS = ["Date", "Type", "Sub Type", "Action", "Instrument Type", "Value", "Quantity", "Average Price"];

function detect(csv: string): boolean {
  const firstLine = csv.split("\n").find((l) => l.trim());
  if (!firstLine) return false;
  return hasExactColumns(parseCSVLine(firstLine).map((h) => h.trim()), REQUIRED_COLUMNS);
}

function detectType(
  txType: string,
  subType: string,
  action: string,
): ParsedTransaction["type"] | null {
  const t = txType.toLowerCase();
  const s = subType.toLowerCase();
  const a = action.toLowerCase();

  if (t === "trade") {
    if (a.includes("buy") || a.includes("bot")) return "buy";
    if (a.includes("sell") || a.includes("sld")) return "sell";
  }
  if (t === "receive deliver") {
    if (s.includes("dividend") || s.includes("cash dividend")) return "dividend";
  }
  return null;
}

function parseTastytrade(csv: string, _isinToTicker: Record<string, string>): ParsedTransaction[] {
  const lines = csv.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map((h) => h.trim());
  const colMap = buildColumnMap(headers);

  const dateIdx = colMap["Date"];
  const typeIdx = colMap["Type"];
  const subTypeIdx = colMap["Sub Type"];
  const actionIdx = colMap["Action"];
  const symbolIdx = colMap["Symbol"] ?? colMap["Underlying Symbol"];
  const underlyingIdx = colMap["Underlying Symbol"];
  const instrTypeIdx = colMap["Instrument Type"];
  const descIdx = colMap["Description"];
  const valueIdx = colMap["Value"];
  const qtyIdx = colMap["Quantity"];
  const avgPriceIdx = colMap["Average Price"];
  const commIdx = colMap["Commissions"];
  const feesIdx = colMap["Fees"];

  const transactions: ParsedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    const txType = cell(row, typeIdx);
    const subType = cell(row, subTypeIdx);
    const action = cell(row, actionIdx);
    const instrType = cell(row, instrTypeIdx).toLowerCase();

    // Skip options and futures
    if (instrType && instrType !== "equity" && instrType !== "etf" && instrType !== "common stock") {
      if (instrType.includes("option") || instrType.includes("future")) continue;
    }

    const type = detectType(txType, subType, action);
    if (!type) continue;

    const rawDate = cell(row, dateIdx);
    const date = extractDate(rawDate);
    if (!date) continue;

    // For equity trades, prefer Underlying Symbol; for dividends use Symbol
    const symbol = cell(row, underlyingIdx) || cell(row, symbolIdx);
    if (!symbol) continue;

    const desc = cell(row, descIdx) || symbol;
    const qty = Math.abs(num(cell(row, qtyIdx)));
    const avgPrice = Math.abs(num(cell(row, avgPriceIdx)));
    const rawValue = num(cell(row, valueIdx));
    const totalAmount = Math.abs(rawValue) || qty * avgPrice;
    const commissions = Math.abs(num(cell(row, commIdx)));
    const fees = commissions + Math.abs(num(cell(row, feesIdx)));

    transactions.push({
      date,
      type,
      ticker: symbol,
      name: desc,
      isin: "",
      shares: type === "dividend" ? 0 : qty,
      pricePerShare: avgPrice,
      totalAmount,
      fees,
      taxes: 0,
      currency: "USD",
      orderId: "",
      sourceRef: `tastytrade|${date}|${type}|${symbol}|${totalAmount}`,
    });
  }

  deduplicateSourceRefs(transactions);
  transactions.sort((a, b) => b.date.localeCompare(a.date));
  return transactions;
}

export const tastytradeParser: BrokerParser = {
  id: "tastytrade",
  label: "Tastytrade",
  fileHint: "Transaction History CSV",

  detect,

  parse: parseTastytrade,
};
