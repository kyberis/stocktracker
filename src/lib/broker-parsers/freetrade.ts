/**
 * Freetrade Activity CSV parser.
 *
 * Export from: Activity page → Export button (top-right of the screen).
 *
 * Columns:
 *   Title, Type, Timestamp, Account Currency, Total Amount,
 *   Price per Share in Account Currency, Shares Bought,
 *   Stamp Duty, ISIN, Reference
 *
 * Type values:
 *   ORDER → buy or sell (determined by Shares Bought sign or context)
 *   DIVIDEND
 *   TOP_UP / WITHDRAWAL / INTEREST → skipped
 *
 * Verified against Freetrade community exports and
 * github.com/samjbrennan/freetrade-exporter.
 */

import type { BrokerParser, ParsedTransaction } from "./types";
import { parseCSVLine, buildColumnMap, cell, num, extractDate, deduplicateSourceRefs } from "./utils";

function parseFreetrade(csv: string, isinToTicker: Record<string, string>): ParsedTransaction[] {
  const lines = csv.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map((h) => h.trim());
  const colMap = buildColumnMap(headers);

  const titleIdx = colMap["Title"];
  const typeIdx = colMap["Type"];
  const timestampIdx = colMap["Timestamp"];
  const currencyIdx = colMap["Account Currency"];
  const totalAmountIdx = colMap["Total Amount"];
  const pricePerShareIdx = colMap["Price per Share in Account Currency"];
  const sharesBoughtIdx = colMap["Shares Bought"];
  const stampDutyIdx = colMap["Stamp Duty"];
  const isinIdx = colMap["ISIN"];
  const referenceIdx = colMap["Reference"];

  const transactions: ParsedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    const txType = cell(row, typeIdx).toUpperCase();

    let type: ParsedTransaction["type"];
    if (txType === "DIVIDEND") {
      type = "dividend";
    } else if (txType === "ORDER" || txType === "BUY" || txType === "SELL") {
      // Freetrade represents sells as negative share amounts
      const sharesBought = num(cell(row, sharesBoughtIdx));
      type = sharesBought < 0 ? "sell" : "buy";
    } else {
      continue;
    }

    const rawTimestamp = cell(row, timestampIdx);
    const date = extractDate(rawTimestamp);
    if (!date) continue;

    const isin = cell(row, isinIdx);
    const title = cell(row, titleIdx) || isin;
    const currency = cell(row, currencyIdx) || "GBP";
    const shares = Math.abs(num(cell(row, sharesBoughtIdx)));
    const pricePerShare = Math.abs(num(cell(row, pricePerShareIdx)));
    const rawTotal = num(cell(row, totalAmountIdx));
    const totalAmount = Math.abs(rawTotal) || shares * pricePerShare;
    const stampDuty = Math.abs(num(cell(row, stampDutyIdx)));
    const reference = cell(row, referenceIdx);

    transactions.push({
      date,
      type,
      ticker: isinToTicker[isin] || isin,
      name: title,
      isin,
      shares: type === "dividend" ? 0 : shares,
      pricePerShare,
      totalAmount,
      fees: stampDuty,
      taxes: 0,
      currency,
      orderId: reference,
      sourceRef: reference ? `freetrade|${reference}` : `freetrade|${date}|${type}|${isin}|${totalAmount}`,
    });
  }

  deduplicateSourceRefs(transactions);
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
    const isin = row[isinIdx]?.trim();
    if (isin && /^[A-Z]{2}[A-Z0-9]{10}$/.test(isin)) isins.add(isin);
  }
  return Array.from(isins);
}

export const freetradeParser: BrokerParser = {
  id: "freetrade",
  label: "Freetrade",
  fileHint: "Activity CSV export",

  parse: parseFreetrade,

  extractIsins(csv: string): string[] {
    return extractIsins(csv);
  },
};
