/**
 * Trade Republic Transaction Report CSV parser.
 *
 * App path: Profile → Account Statements → Transaction Report → Create.
 *
 * English headers (documented by Parqet / DeclaRenta):
 *   Date, Type, Ticker, ISIN, Shares, Price, Amount, Currency, Fee, Tax
 *
 * German exports use Datum/Typ/Anteile/Preis/Betrag/Währung/Gebühr/Steuer.
 * Delimiter may be comma or semicolon.
 */

import type { BrokerParser, ParsedTransaction } from "./types";
import {
  parseCSVLine,
  buildColumnMap,
  cell,
  num,
  extractDate,
  parseEuropeanNumber,
  deduplicateSourceRefs,
  detectByHeaderColumns,
} from "./utils";

const EN_REQUIRED = ["Date", "Type", "ISIN", "Shares"];
const DE_REQUIRED = ["Datum", "Typ", "ISIN", "Anteile"];

function detectDelimiter(headerLine: string): "," | ";" {
  const semi = (headerLine.match(/;/g) || []).length;
  const comma = (headerLine.match(/,/g) || []).length;
  return semi > comma ? ";" : ",";
}

function detect(csv: string): boolean {
  return (
    detectByHeaderColumns(csv, EN_REQUIRED, 10, ",") ||
    detectByHeaderColumns(csv, EN_REQUIRED, 10, ";") ||
    detectByHeaderColumns(csv, DE_REQUIRED, 10, ",") ||
    detectByHeaderColumns(csv, DE_REQUIRED, 10, ";")
  );
}

function findHeaderLine(lines: string[], delimiter: "," | ";"): { index: number; headers: string[] } | null {
  const scan = Math.min(lines.length, 10);
  for (let i = 0; i < scan; i++) {
    if (!lines[i].trim()) continue;
    const headers = parseCSVLine(lines[i], delimiter).map((h) => h.trim());
    const set = new Set(headers);
    if (EN_REQUIRED.every((c) => set.has(c)) || DE_REQUIRED.every((c) => set.has(c))) {
      return { index: i, headers };
    }
  }
  return null;
}

function detectType(raw: string): ParsedTransaction["type"] | null {
  const lower = raw.toLowerCase();
  if (lower.includes("dividend") || lower.includes("dividende")) return "dividend";
  if (lower.includes("sell") || lower.includes("verkauf") || lower.includes("sale")) return "sell";
  if (
    lower.includes("buy") ||
    lower.includes("kauf") ||
    lower.includes("savings plan") ||
    lower.includes("sparplan")
  ) {
    return "buy";
  }
  if (lower.includes("fee") || lower.includes("gebühr") || lower.includes("gebuehr")) return "fee";
  return null;
}

function parseTrDate(raw: string): string {
  const iso = extractDate(raw);
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const de = raw.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (de) {
    return `${de[3]}-${de[2].padStart(2, "0")}-${de[1].padStart(2, "0")}`;
  }
  return "";
}

function parseAmount(raw: string, european: boolean): number {
  return european ? parseEuropeanNumber(raw) : num(raw);
}

function col(map: Record<string, number>, ...names: string[]): number | undefined {
  for (const name of names) {
    if (map[name] !== undefined) return map[name];
  }
  return undefined;
}

function parseTradeRepublic(csv: string, isinToTicker: Record<string, string>): ParsedTransaction[] {
  const lines = csv.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const first = lines.find((l) => l.trim()) || "";
  const delimiter = detectDelimiter(first);
  const header = findHeaderLine(lines, delimiter);
  if (!header) return [];

  const colMap = buildColumnMap(header.headers);
  const dateIdx = col(colMap, "Date", "Datum");
  const typeIdx = col(colMap, "Type", "Typ");
  const tickerIdx = col(colMap, "Ticker");
  const isinIdx = col(colMap, "ISIN");
  const sharesIdx = col(colMap, "Shares", "Anteile");
  const priceIdx = col(colMap, "Price", "Preis");
  const amountIdx = col(colMap, "Amount", "Betrag");
  const currencyIdx = col(colMap, "Currency", "Währung", "Waehrung");
  const feeIdx = col(colMap, "Fee", "Gebühr", "Gebuehr");
  const taxIdx = col(colMap, "Tax", "Steuer");

  const european = delimiter === ";";
  const parseNum = (raw: string) => parseAmount(raw, european);

  const transactions: ParsedTransaction[] = [];

  for (let i = header.index + 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i], delimiter);
    const type = detectType(cell(row, typeIdx));
    if (!type) continue;

    const date = parseTrDate(cell(row, dateIdx));
    if (!date) continue;

    const isin = cell(row, isinIdx);
    const ticker = (cell(row, tickerIdx) || isinToTicker[isin] || isin).toUpperCase();
    if (!ticker) continue;

    const shares = Math.abs(parseNum(cell(row, sharesIdx)));
    const price = Math.abs(parseNum(cell(row, priceIdx)));
    const amount = Math.abs(parseNum(cell(row, amountIdx)));
    const fees = Math.abs(parseNum(cell(row, feeIdx)));
    const taxes = Math.abs(parseNum(cell(row, taxIdx)));
    const currency = cell(row, currencyIdx) || "EUR";
    const totalAmount = amount || (type === "dividend" ? 0 : shares * price);

    if (type !== "dividend" && type !== "fee" && shares <= 0) continue;

    transactions.push({
      date,
      type,
      ticker,
      name: ticker,
      isin,
      shares: type === "dividend" || type === "fee" ? 0 : shares,
      pricePerShare: price,
      totalAmount,
      fees,
      taxes,
      currency,
      orderId: "",
      sourceRef: `traderepublic|${date}|${type}|${isin || ticker}|${shares}|${totalAmount}`,
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
  const first = lines.find((l) => l.trim()) || "";
  const delimiter = detectDelimiter(first);
  const header = findHeaderLine(lines, delimiter);
  if (!header) return [];
  const isinIdx = header.headers.findIndex((h) => h === "ISIN");
  if (isinIdx < 0) return [];

  for (let i = header.index + 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i], delimiter);
    const isin = cell(row, isinIdx);
    if (/^[A-Z]{2}[A-Z0-9]{10}$/.test(isin)) isins.add(isin);
  }
  return Array.from(isins);
}

export const tradeRepublicParser: BrokerParser = {
  id: "trade_republic",
  label: "Trade Republic",
  fileHint: "Transaction Report CSV",

  detect,

  parse: parseTradeRepublic,

  extractIsins(csv: string): string[] {
    return extractIsins(csv);
  },
};
