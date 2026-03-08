/**
 * Wealthsimple Activities CSV parser.
 *
 * Export from: Profile icon → Documents → Request Documents →
 *              Document type: "Activities Export (CSV)" → Download CSV.
 *
 * Columns:
 *   account_id, account_type, process_date, settlement_date,
 *   activity_type, transaction_description, symbol, currency,
 *   quantity, price, market_value, book_value, net_amount, commission
 *
 * Activity types:
 *   buy → buy
 *   sell → sell
 *   dividend → dividend
 *   institutional transfer, dep, wire, etc. → skipped
 *
 * Verified against Wealthsimple community-shared CSV exports.
 */

import type { BrokerParser, ParsedTransaction } from "./types";
import { parseCSVLine, buildColumnMap, cell, num, extractDate, deduplicateSourceRefs } from "./utils";

function detectType(activityType: string): ParsedTransaction["type"] | null {
  const a = activityType.toLowerCase().trim();
  if (a === "buy" || a.includes("purchase") || a.includes("bought")) return "buy";
  if (a === "sell" || a.includes("sold")) return "sell";
  if (a === "dividend" || a.includes("dividend")) return "dividend";
  return null;
}

function parseWealthsimple(csv: string, _isinToTicker: Record<string, string>): ParsedTransaction[] {
  const lines = csv.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
  const colMap = buildColumnMap(headers);

  const processDateIdx = colMap["process_date"] ?? colMap["date"];
  const activityTypeIdx = colMap["activity_type"] ?? colMap["type"];
  const descIdx = colMap["transaction_description"] ?? colMap["description"];
  const symbolIdx = colMap["symbol"];
  const currencyIdx = colMap["currency"];
  const quantityIdx = colMap["quantity"];
  const priceIdx = colMap["price"];
  const netAmountIdx = colMap["net_amount"] ?? colMap["amount"];
  const commissionIdx = colMap["commission"];

  const transactions: ParsedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    const activityType = cell(row, activityTypeIdx);
    const type = detectType(activityType);
    if (!type) continue;

    const rawDate = cell(row, processDateIdx);
    const date = extractDate(rawDate);
    if (!date) continue;

    const symbol = cell(row, symbolIdx);
    if (!symbol && type !== "dividend") continue;

    const desc = cell(row, descIdx) || symbol;
    const currency = cell(row, currencyIdx) || "CAD";
    const quantity = Math.abs(num(cell(row, quantityIdx)));
    const price = Math.abs(num(cell(row, priceIdx)));
    const netAmount = Math.abs(num(cell(row, netAmountIdx)));
    const commission = Math.abs(num(cell(row, commissionIdx)));
    const totalAmount = netAmount || quantity * price;

    transactions.push({
      date,
      type,
      ticker: symbol,
      name: desc,
      isin: "",
      shares: type === "dividend" ? 0 : quantity,
      pricePerShare: price,
      totalAmount,
      fees: commission,
      taxes: 0,
      currency,
      orderId: "",
      sourceRef: `wealthsimple|${date}|${type}|${symbol}|${totalAmount}`,
    });
  }

  deduplicateSourceRefs(transactions);
  transactions.sort((a, b) => b.date.localeCompare(a.date));
  return transactions;
}

export const wealthsimpleParser: BrokerParser = {
  id: "wealthsimple",
  label: "Wealthsimple",
  fileHint: "Activities Export CSV",

  parse: parseWealthsimple,
};
