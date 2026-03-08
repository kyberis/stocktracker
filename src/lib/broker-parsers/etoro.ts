/**
 * eToro Account Statement XLS/CSV parser.
 *
 * Export from: Settings → Account → Documents → Account Statement → View →
 *              select time frame → Create → XLS button.
 *
 * eToro exports an Excel file. When opened/converted to CSV the relevant
 * sheet ("Account Statement" or sheet 1) has a summary section at the top
 * followed by a transaction table with headers:
 *
 *   Date, Type, Details, Amount, Units, Realized Equity Change,
 *   Realized Equity, Balance, Position ID, Asset type, NWA
 *
 * Some exports also use column names:
 *   Date Created, Type, Details, Amount, Units, ...
 *
 * Transaction types (Type column):
 *   Open Position → buy
 *   Closed Position → sell
 *   Dividends → dividend
 *   Profit/Loss of Trade (with positive/negative Units) → may indicate sell
 *
 * When eToro statement is converted to CSV it may include metadata rows
 * at the top before the header row.
 *
 * Verified against eToro community-shared statement samples and
 * github.com/dsadovnikov/etoro-statement-parser.
 */

import type { BrokerParser, ParsedTransaction } from "./types";
import { parseCSVLine, buildColumnMap, cell, num, extractDate, deduplicateSourceRefs } from "./utils";

function detectType(txType: string): ParsedTransaction["type"] | null {
  const t = txType.toLowerCase();
  if (t.includes("open position") || t.includes("buy")) return "buy";
  if (t.includes("closed position") || t.includes("sell") || t.includes("close position")) return "sell";
  if (t.includes("dividend")) return "dividend";
  return null;
}

function parseEtoro(csv: string, _isinToTicker: Record<string, string>): ParsedTransaction[] {
  const rawLines = csv.split("\n");

  // Find the header row: must contain "Type" and "Details" and "Amount"
  let headerIdx = -1;
  for (let i = 0; i < rawLines.length; i++) {
    const l = rawLines[i];
    if (l.includes("Type") && l.includes("Details") && l.includes("Amount")) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) return [];

  const lines = rawLines.slice(headerIdx).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map((h) => h.trim());
  const colMap = buildColumnMap(headers);

  const dateIdx = colMap["Date"] ?? colMap["Date Created"] ?? colMap["Date/Time"];
  const typeIdx = colMap["Type"];
  const detailsIdx = colMap["Details"];
  const amountIdx = colMap["Amount"];
  const unitsIdx = colMap["Units"];
  const posIdIdx = colMap["Position ID"] ?? colMap["PositionID"];
  const assetTypeIdx = colMap["Asset type"] ?? colMap["Asset Type"];

  const transactions: ParsedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    const txType = cell(row, typeIdx);
    const type = detectType(txType);
    if (!type) continue;

    const assetType = cell(row, assetTypeIdx).toLowerCase();
    if (assetType && !assetType.includes("stock") && !assetType.includes("etf") && !assetType.includes("equity")) {
      continue;
    }

    const rawDate = cell(row, dateIdx);
    // eToro dates: "DD/MM/YYYY HH:MM:SS" or "YYYY-MM-DD"
    let date = "";
    const dmyMatch = rawDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dmyMatch) {
      date = `${dmyMatch[3]}-${dmyMatch[2].padStart(2, "0")}-${dmyMatch[1].padStart(2, "0")}`;
    } else {
      date = extractDate(rawDate);
    }
    if (!date) continue;

    const details = cell(row, detailsIdx);
    // Extract ticker from details: "AAPL/Buy" or "Dividend from AAPL" or just "AAPL"
    const tickerMatch = details.match(/^([A-Z0-9./-]+)/);
    const ticker = tickerMatch ? tickerMatch[1].split("/")[0] : details;
    if (!ticker) continue;

    const units = Math.abs(num(cell(row, unitsIdx)));
    const rawAmount = num(cell(row, amountIdx));
    const totalAmount = Math.abs(rawAmount);
    const posId = cell(row, posIdIdx);

    transactions.push({
      date,
      type,
      ticker,
      name: details,
      isin: "",
      shares: type === "dividend" ? 0 : units,
      pricePerShare: units > 0 ? totalAmount / units : 0,
      totalAmount,
      fees: 0,
      taxes: 0,
      currency: "USD",
      orderId: posId,
      sourceRef: posId ? `etoro|${posId}|${type}` : `etoro|${date}|${type}|${ticker}|${totalAmount}`,
    });
  }

  deduplicateSourceRefs(transactions);
  transactions.sort((a, b) => b.date.localeCompare(a.date));
  return transactions;
}

export const etoroParser: BrokerParser = {
  id: "etoro",
  label: "eToro",
  fileHint: "Account Statement XLS/CSV",

  parse: parseEtoro,
};
