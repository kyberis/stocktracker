/**
 * Revolut Invest account statement CSV/Excel parser.
 *
 * Columns (Activity section):
 *   Trade Date, Settle Date, Currency, Activity Type,
 *   Symbol / Description, Symbol, Description, Quantity, Price, Amount
 *
 * Activity Types: BUY, SELL, DIV, DIVNRA, SSP, MRG, CDEP, CSD
 *
 * Dividends (DIV) and withholding tax (DIVNRA) are separate rows that
 * must be grouped by symbol + trade date.
 *
 * Verified from github.com/bogdanghervan/revolut-statement (43 stars)
 * and Revolut's native Excel export (available since June 2021).
 */

import type { BrokerParser, ParsedTransaction } from "./types";
import { parseCSVLine, buildColumnMap, cell, num, deduplicateSourceRefs } from "./utils";

interface DividendGroup {
  symbol: string;
  description: string;
  date: string;
  currency: string;
  gross: number;
  tax: number;
}

function parseRevolut(csv: string, _isinToTicker: Record<string, string>): ParsedTransaction[] {
  const lines = csv.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map((h) => h.trim());
  const colMap = buildColumnMap(headers);

  const tradeDateIdx = colMap["Trade Date"];
  const currencyIdx = colMap["Currency"];
  const activityIdx = colMap["Activity Type"];
  const symbolDescIdx = colMap["Symbol / Description"];
  const symbolIdx = colMap["Symbol"];
  const descIdx = colMap["Description"];
  const qtyIdx = colMap["Quantity"];
  const priceIdx = colMap["Price"];
  const amountIdx = colMap["Amount"];

  const transactions: ParsedTransaction[] = [];
  const dividendGroups = new Map<string, DividendGroup>();

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    const activityType = cell(row, activityIdx).toUpperCase();
    const date = cell(row, tradeDateIdx);
    if (!date) continue;

    const symbol = cell(row, symbolIdx) || cell(row, symbolDescIdx).split(" - ")[0]?.trim() || "";
    const description = cell(row, descIdx) || cell(row, symbolDescIdx) || "";
    const currency = cell(row, currencyIdx) || "USD";
    const quantity = Math.abs(num(cell(row, qtyIdx)));
    const price = Math.abs(num(cell(row, priceIdx)));
    const amount = num(cell(row, amountIdx));

    if (activityType === "BUY") {
      const totalAmount = Math.abs(amount) || quantity * price;
      transactions.push({
        date,
        type: "buy",
        ticker: symbol,
        name: description,
        isin: "",
        shares: quantity,
        pricePerShare: price,
        totalAmount,
        fees: 0,
        taxes: 0,
        currency,
        orderId: "",
        sourceRef: `revolut|${date}|buy|${symbol}|${totalAmount}`,
      });
      continue;
    }

    if (activityType === "SELL") {
      const totalAmount = Math.abs(amount) || quantity * price;
      transactions.push({
        date,
        type: "sell",
        ticker: symbol,
        name: description,
        isin: "",
        shares: quantity,
        pricePerShare: price,
        totalAmount,
        fees: 0,
        taxes: 0,
        currency,
        orderId: "",
        sourceRef: `revolut|${date}|sell|${symbol}|${totalAmount}`,
      });
      continue;
    }

    if (activityType === "DIV") {
      const key = `${symbol}|${date}`;
      const group = dividendGroups.get(key) || {
        symbol, description, date, currency, gross: 0, tax: 0,
      };
      group.gross += Math.abs(amount);
      dividendGroups.set(key, group);
      continue;
    }

    if (activityType === "DIVNRA") {
      const key = `${symbol}|${date}`;
      const group = dividendGroups.get(key) || {
        symbol, description: description || symbol, date, currency, gross: 0, tax: 0,
      };
      group.tax += Math.abs(amount);
      dividendGroups.set(key, group);
      continue;
    }
    // SSP (stock split), MRG (merger), CDEP, CSD are skipped
  }

  // Materialize dividend groups
  for (const group of dividendGroups.values()) {
    if (group.gross <= 0) continue;
    transactions.push({
      date: group.date,
      type: "dividend",
      ticker: group.symbol,
      name: group.description,
      isin: "",
      shares: 0,
      pricePerShare: 0,
      totalAmount: group.gross,
      fees: 0,
      taxes: group.tax,
      currency: group.currency,
      orderId: "",
      sourceRef: `revolut|${group.date}|dividend|${group.symbol}|${group.gross}`,
    });
  }

  deduplicateSourceRefs(transactions);
  transactions.sort((a, b) => b.date.localeCompare(a.date));
  return transactions;
}

export const revolutParser: BrokerParser = {
  id: "revolut",
  label: "Revolut",
  fileHint: "Account statement (Excel/CSV)",

  parse: parseRevolut,
};
