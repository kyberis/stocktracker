/**
 * MyInvestor / Inversis broker portal operations export parser.
 *
 * Users download Excel from inversis.com/cbmyinvestor (first sheet is read as CSV).
 * Headers are often Spanish; aliases below are best-effort until validated against
 * production exports.
 */

import type { BrokerParser, ParsedTransaction } from "./types";
import {
  parseCSVLine,
  cell,
  deduplicateSourceRefs,
  extractDate,
  parseEuropeanNumber,
} from "./utils";

const DATE_ALIASES = [
  "fecha valor",
  "fecha operacion",
  "fecha operación",
  "fecha op.",
  "fecha",
  "f. valor",
  "trade date",
];

const ISIN_ALIASES = ["isin"];

const NAME_ALIASES = [
  "valor",
  "titulo",
  "título",
  "descripcion",
  "descripción",
  "nombre valor",
  "nombre",
  "instrumento",
  "description",
];

const TYPE_ALIASES = [
  "tipo operacion",
  "tipo operación",
  "concepto",
  "naturaleza",
  "tipo",
  "operacion",
  "operación",
];

const QTY_ALIASES = [
  "nominal",
  "cantidad",
  "titulos",
  "títulos",
  "numero titulos",
  "número titulos",
  "nº titulos",
  "acciones",
  "quantity",
];

const PRICE_ALIASES = [
  "precio",
  "precio medio",
  "precio unitario",
  "cotizacion",
  "cotización",
  "precio ref.",
  "price",
];

const AMOUNT_ALIASES = [
  "importe",
  "importe liquidacion",
  "importe liquidación",
  "importe total",
  "contravalor",
  "liquido",
  "líquido",
];

const CURR_ALIASES = ["divisa", "moneda", "currency"];

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

function resolveColumnIndex(headers: string[], aliases: string[]): number | undefined {
  const norm = headers.map(normalizeHeader);
  for (const alias of aliases) {
    const a = normalizeHeader(alias);
    const idx = norm.findIndex((h) => h === a);
    if (idx >= 0) return idx;
  }
  for (const alias of aliases) {
    const a = normalizeHeader(alias);
    const idx = norm.findIndex((h) => h.startsWith(a) || a.startsWith(h));
    if (idx >= 0 && a.length >= 4) return idx;
  }
  return undefined;
}

/**
 * MyInvestor's headers are fuzzy Spanish aliases with no fixed column
 * order, so detection reuses the same precondition parseMyInvestor itself
 * requires to not throw: a resolvable date column and a resolvable ISIN
 * or name column. Registered last in the parser list, after DEGIRO's much
 * stricter exact-column detector, which keeps Spanish DEGIRO exports from
 * being mis-claimed by this looser check.
 */
function detect(csv: string): boolean {
  const stripped = csv.replace(/^\uFEFF/, "");
  const lines = stripped.split(/\n/).filter((l) => l.trim());
  if (lines.length < 2) return false;
  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCSVLine(lines[0], delimiter).map((h) => h.trim().replace(/^"|"$/g, ""));
  const dateIdx = resolveColumnIndex(headers, DATE_ALIASES);
  const isinIdx = resolveColumnIndex(headers, ISIN_ALIASES);
  const nameIdx = resolveColumnIndex(headers, NAME_ALIASES);
  const typeIdx = resolveColumnIndex(headers, TYPE_ALIASES);
  return dateIdx !== undefined && typeIdx !== undefined && (isinIdx !== undefined || nameIdx !== undefined);
}

function detectDelimiter(line: string): string {
  const semi = (line.match(/;/g) || []).length;
  const comma = (line.match(/,/g) || []).length;
  return semi > comma ? ";" : ",";
}

function detectOperationType(raw: string): ParsedTransaction["type"] | null {
  const t = normalizeHeader(raw);
  if (!t) return null;

  if (
    /\b(compra|buy|adquisicion|adquisición|subscripcion|subscripción)\b/.test(t)
  ) {
    return "buy";
  }
  if (/\b(venta|sell|vent)\b/.test(t)) {
    return "sell";
  }
  if (/\b(dividendo|dividend|renta)\b/.test(t)) {
    return "dividend";
  }
  if (
    /\b(comisi|gasto|custodia|fee|canon|tarifa|mantenimiento)\b/.test(t)
  ) {
    return "fee";
  }
  return null;
}

function parseNumber(raw: string): number {
  if (!raw) return 0;
  const trimmed = raw.trim();
  if (trimmed.includes(",") && /\d,\d/.test(trimmed)) {
    return parseEuropeanNumber(trimmed);
  }
  return parseFloat(trimmed.replace(/\s/g, "").replace(",", ".")) || 0;
}

function parseMyInvestor(csv: string, isinToTicker: Record<string, string>): ParsedTransaction[] {
  const stripped = csv.replace(/^\uFEFF/, "");
  const lines = stripped.split(/\n/).map((l) => l.trimEnd()).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCSVLine(lines[0], delimiter).map((h) => h.trim().replace(/^"|"$/g, ""));
  const dateIdx = resolveColumnIndex(headers, DATE_ALIASES);
  const isinIdx = resolveColumnIndex(headers, ISIN_ALIASES);
  const nameIdx = resolveColumnIndex(headers, NAME_ALIASES);
  const typeIdx = resolveColumnIndex(headers, TYPE_ALIASES);
  const qtyIdx = resolveColumnIndex(headers, QTY_ALIASES);
  const priceIdx = resolveColumnIndex(headers, PRICE_ALIASES);
  const amountIdx = resolveColumnIndex(headers, AMOUNT_ALIASES);
  const currIdx = resolveColumnIndex(headers, CURR_ALIASES);

  if (dateIdx === undefined) {
    throw new Error(
      `MyInvestor: no date column found. Headers: ${headers.slice(0, 24).join(" | ")}${headers.length > 24 ? " …" : ""}`,
    );
  }
  if (isinIdx === undefined && nameIdx === undefined) {
    throw new Error(
      `MyInvestor: no ISIN or security name column found. Headers: ${headers.slice(0, 24).join(" | ")}${headers.length > 24 ? " …" : ""}`,
    );
  }

  const transactions: ParsedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i], delimiter).map((c) => c.trim().replace(/^"|"$/g, ""));
    const dateRaw = cell(row, dateIdx);
    const date = extractDate(dateRaw);
    if (!date) continue;

    const typeRaw = typeIdx !== undefined ? cell(row, typeIdx) : "";
    const type = detectOperationType(typeRaw);
    if (!type) continue;

    const isin = isinIdx !== undefined ? cell(row, isinIdx).toUpperCase().replace(/\s/g, "") : "";
    const name = nameIdx !== undefined ? cell(row, nameIdx) : "";

    let ticker = "";
    if (isin && /^[A-Z]{2}[A-Z0-9]{10}$/.test(isin)) {
      ticker = isinToTicker[isin] || "";
    }

    const shares = qtyIdx !== undefined ? Math.abs(parseNumber(cell(row, qtyIdx))) : 0;
    const price = priceIdx !== undefined ? Math.abs(parseNumber(cell(row, priceIdx))) : 0;
    let totalAmount =
      amountIdx !== undefined ? Math.abs(parseNumber(cell(row, amountIdx))) : 0;
    const currency = (currIdx !== undefined ? cell(row, currIdx) : "EUR").toUpperCase() || "EUR";

    if (type === "dividend") {
      if (totalAmount <= 0 && shares > 0 && price > 0) {
        totalAmount = shares * price;
      }
      if (totalAmount <= 0 && amountIdx !== undefined) {
        totalAmount = Math.abs(parseNumber(cell(row, amountIdx)));
      }
    } else if (type === "fee") {
      if (totalAmount <= 0 && amountIdx !== undefined) {
        totalAmount = Math.abs(parseNumber(cell(row, amountIdx)));
      }
    } else {
      if (totalAmount <= 0 && shares > 0 && price > 0) {
        totalAmount = shares * price;
      }
    }

    const rowSig = `${date}|${type}|${isin}|${name}|${shares}|${totalAmount}|${i}`;
    const sourceRef = `myinvestor|${rowSig}`;

    transactions.push({
      date,
      type,
      ticker,
      name: name || typeRaw || "MyInvestor",
      isin: /^[A-Z]{2}[A-Z0-9]{10}$/.test(isin) ? isin : "",
      shares: type === "dividend" || type === "fee" ? (type === "fee" ? 0 : shares) : shares,
      pricePerShare: type === "dividend" || type === "fee" ? 0 : price,
      totalAmount,
      fees: 0,
      taxes: 0,
      currency,
      orderId: "",
      sourceRef,
    });
  }

  deduplicateSourceRefs(transactions);
  transactions.sort((a, b) => b.date.localeCompare(a.date));
  return transactions;
}

function extractIsins(csv: string): string[] {
  try {
    const stripped = csv.replace(/^\uFEFF/, "");
    const lines = stripped.split(/\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];
    const delimiter = detectDelimiter(lines[0]);
    const headers = parseCSVLine(lines[0], delimiter).map((h) => h.trim().replace(/^"|"$/g, ""));
    const isinIdx = resolveColumnIndex(headers, ISIN_ALIASES);
    if (isinIdx === undefined) return [];

    const isins = new Set<string>();
    for (let i = 1; i < lines.length; i++) {
      const row = parseCSVLine(lines[i], delimiter);
      const raw = cell(row, isinIdx).toUpperCase().replace(/\s/g, "");
      if (/^[A-Z]{2}[A-Z0-9]{10}$/.test(raw)) isins.add(raw);
    }
    return Array.from(isins);
  } catch {
    return [];
  }
}

export const myinvestorParser: BrokerParser = {
  id: "myinvestor",
  label: "MyInvestor (Inversis)",
  fileHint: "Consulta de operaciones (Excel)",

  detect,

  parse(csv: string, isinToTicker: Record<string, string>): ParsedTransaction[] {
    return parseMyInvestor(csv, isinToTicker);
  },

  extractIsins(csv: string): string[] {
    return extractIsins(csv);
  },
};
