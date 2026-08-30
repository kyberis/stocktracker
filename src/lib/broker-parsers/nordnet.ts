/**
 * Nordnet Transaction CSV parser.
 *
 * Export from: Transactions tab → select date range → Export CSV.
 * The file uses semicolon (;) as delimiter and UTF-8 or UTF-16 BOM encoding.
 *
 * Columns (may appear in Swedish, Norwegian, Danish, or Finnish):
 *   Id; Bokföringsdag; Handelsdag; Valutadag; Portfölj; Transaktionstyp;
 *   Värdepapper; ISIN; Antal; Kurs; Ränta; Totalt belopp; Valuta;
 *   Inköpsvärde; Resultat; Totalt; Valuta; Avgifter; Valuta; Växlingskurs;
 *   Transaktionstext; Makuleringsdatum
 *
 * Transaktionstyp values that map to buy/sell/dividend:
 *   KÖP / KØBT / OSTO / KJØ → buy
 *   SÄLJ / SALG / SOLGT / MYYNTI → sell
 *   UTDELNING / UDBYTTE / OSINKO / DIVIDEND → dividend
 *
 * Verified against nordnet CSV samples from community repositories.
 */

import type { BrokerParser, ParsedTransaction } from "./types";
import { parseCSVLine, buildColumnMap, cell, deduplicateSourceRefs } from "./utils";

const BUY_KEYWORDS = ["köp", "kob", "købt", "osta", "osto", "kjø", "buy"];
const SELL_KEYWORDS = ["sälj", "salg", "solgt", "myynti", "sell"];
const DIVIDEND_KEYWORDS = ["utdelning", "udbytte", "osinko", "dividend", "osingon"];

const TX_TYPE_COLUMNS = ["Transaktionstyp", "Transaksjonstype", "Transaktionstype", "Tapahtumatyyppi", "Transaction type"];

/**
 * Nordnet's semicolon delimiter + a Transaktionstyp-family column name +
 * an ISIN column is a distinctive enough combo that it doesn't collide
 * with any other supported format.
 */
function detect(csv: string): boolean {
  const stripped = csv.replace(/^\uFEFF/, "").replace(/^\xFF\xFE/, "");
  const firstLine = stripped.split("\n").find((l) => l.trim());
  if (!firstLine || !firstLine.includes(";")) return false;
  const headers = parseCSVLine(firstLine, ";").map((h) => h.trim().replace(/"/g, ""));
  const hasIsin = headers.includes("ISIN");
  const hasTxType = TX_TYPE_COLUMNS.some((c) => headers.includes(c));
  return hasIsin && hasTxType;
}

function detectType(txType: string): ParsedTransaction["type"] | null {
  const t = txType.toLowerCase().trim();
  if (BUY_KEYWORDS.some((k) => t.startsWith(k))) return "buy";
  if (SELL_KEYWORDS.some((k) => t.startsWith(k))) return "sell";
  if (DIVIDEND_KEYWORDS.some((k) => t.startsWith(k))) return "dividend";
  return null;
}

function parseNordnetNumber(raw: string): number {
  if (!raw) return 0;
  // Nordnet uses space as thousands separator and comma as decimal: "1 234,56"
  const cleaned = raw.replace(/\s/g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
}

function parseNordnet(csv: string, isinToTicker: Record<string, string>): ParsedTransaction[] {
  // Strip BOM if present
  const stripped = csv.replace(/^\uFEFF/, "").replace(/^\xFF\xFE/, "");
  const lines = stripped.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Detect delimiter: Nordnet uses ";" but some exports may use "\t"
  const delimiter = lines[0].includes(";") ? ";" : "\t";

  const headers = parseCSVLine(lines[0], delimiter).map((h) => h.trim().replace(/"/g, ""));
  const colMap = buildColumnMap(headers);

  // Nordnet column name variants across languages
  const txTypeIdx =
    colMap["Transaktionstyp"] ??
    colMap["Transaksjonstype"] ??
    colMap["Transaktionstype"] ??
    colMap["Tapahtumatyyppi"] ??
    colMap["Transaction type"];
  const tradeDateIdx =
    colMap["Handelsdag"] ??
    colMap["Kaupankäyntipäivä"] ??
    colMap["Trade date"];
  const bookDateIdx =
    colMap["Bokföringsdag"] ??
    colMap["Bokføringsdag"] ??
    colMap["Kirjauspäivä"] ??
    colMap["Settlement date"] ??
    tradeDateIdx;
  const securityIdx =
    colMap["Värdepapper"] ??
    colMap["Verdipapir"] ??
    colMap["Værdipapir"] ??
    colMap["Arvopaperi"] ??
    colMap["Security"];
  const isinIdx = colMap["ISIN"];
  const qtyIdx =
    colMap["Antal"] ??
    colMap["Antall"] ??
    colMap["Määrä"] ??
    colMap["Quantity"];
  const priceIdx =
    colMap["Kurs"] ??
    colMap["Kurssi"] ??
    colMap["Price"];
  const totalIdx =
    colMap["Totalt belopp"] ??
    colMap["Totalbeløp"] ??
    colMap["Totalt beløb"] ??
    colMap["Kokonaissumma"] ??
    colMap["Total"];
  const currencyIdx =
    colMap["Valuta"] ??
    colMap["Valuutta"] ??
    colMap["Currency"];
  const feesIdx =
    colMap["Avgifter"] ??
    colMap["Gebyrer"] ??
    colMap["Palkkiot"] ??
    colMap["Fees"];
  const idIdx = colMap["Id"] ?? colMap["ID"];

  const transactions: ParsedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i], delimiter).map((c) => c.trim().replace(/"/g, ""));
    const txType = cell(row, txTypeIdx);
    const type = detectType(txType);
    if (!type) continue;

    // Use trade date, fall back to booking date
    const rawDate = cell(row, tradeDateIdx) || cell(row, bookDateIdx);
    // Nordnet dates: "YYYY-MM-DD"
    const date = rawDate.slice(0, 10);
    if (!date || date.length < 10) continue;

    const security = cell(row, securityIdx);
    const isin = cell(row, isinIdx);
    const ticker = (isin && isinToTicker[isin]) || security || "";
    const shares = Math.abs(parseNordnetNumber(cell(row, qtyIdx)));
    const price = Math.abs(parseNordnetNumber(cell(row, priceIdx)));
    const rawTotal = parseNordnetNumber(cell(row, totalIdx));
    const totalAmount = Math.abs(rawTotal) || shares * price;
    const fees = Math.abs(parseNordnetNumber(cell(row, feesIdx)));
    const currency = cell(row, currencyIdx) || "SEK";
    const orderId = cell(row, idIdx);

    transactions.push({
      date,
      type,
      ticker,
      name: security,
      isin,
      shares: type === "dividend" ? 0 : shares,
      pricePerShare: price,
      totalAmount,
      fees,
      taxes: 0,
      currency,
      orderId,
      sourceRef: `nordnet|${orderId || `${date}|${type}|${isin || ticker}|${totalAmount}`}`,
    });
  }

  deduplicateSourceRefs(transactions);
  transactions.sort((a, b) => b.date.localeCompare(a.date));
  return transactions;
}

function extractIsins(csv: string): string[] {
  const isins = new Set<string>();
  const stripped = csv.replace(/^\uFEFF/, "");
  const lines = stripped.split("\n").filter((l) => l.trim());
  const delimiter = lines[0]?.includes(";") ? ";" : "\t";
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0], delimiter).map((h) => h.trim().replace(/"/g, ""));
  const isinIdx = headers.findIndex((h) => h === "ISIN");
  if (isinIdx < 0) return [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i], delimiter);
    const isin = row[isinIdx]?.trim().replace(/"/g, "");
    if (isin && /^[A-Z]{2}[A-Z0-9]{10}$/.test(isin)) isins.add(isin);
  }
  return Array.from(isins);
}

export const nordnetParser: BrokerParser = {
  id: "nordnet",
  label: "Nordnet",
  fileHint: "Transactions CSV export",

  detect,

  parse: parseNordnet,

  extractIsins(csv: string): string[] {
    return extractIsins(csv);
  },
};
