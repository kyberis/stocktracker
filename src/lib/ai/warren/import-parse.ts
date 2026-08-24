import { YahooProvider } from "@/lib/api-providers/yahoo";
import { detectBrokerFormat, getBrokerParser, type ParsedTransaction } from "@/lib/broker-parsers";
import { buildIsinMap } from "@/lib/degiro-parser";
import { inferAssetType } from "@/lib/infer-asset-type";
import { parseSimpleCSV } from "@/lib/simple-csv-parser";
import { bufferToUtf8CsvOrPlainText } from "@/lib/spreadsheet-to-csv";
import { dedupeParsedAgainstLedger } from "@/lib/transaction-fingerprint";
import { listHoldings, listTransactionContentFingerprints, listTransactionSourceRefs } from "@/lib/db";
import type { RawAttachment } from "./preprocess-attachments";
import type { ImportCashBalanceRow, ImportTransactionRow } from "./types";

const ISIN_LOOKUP_TIMEOUT_MS = 5_000;
const ISIN_BATCH_TIMEOUT_MS = 15_000;
const MAX_ISIN_LOOKUPS = 50;

export interface BrokerImportPreview {
  detectedBroker?: string;
  transactions: ImportTransactionRow[];
  cashBalances: ImportCashBalanceRow[];
  summary: {
    total: number;
    buys: number;
    sells: number;
    dividends: number;
    fees: number;
    duplicatesRemoved: number;
    unmapped: string[];
  };
}

export type ParseBrokerCsvResult =
  | { ok: true; fallbackToAi: false; preview: BrokerImportPreview }
  | { ok: true; fallbackToAi: true; reason: "no_match" | "parse_error" }
  | { ok: false; error: string };

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  return Promise.race([
    promise,
    new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), ms)),
  ]);
}

function inferExchangeFromTicker(ticker: string): string {
  if (!ticker) return "";
  const parts = ticker.split(".");
  if (parts.length < 2) return "NASDAQ";
  const suffix = parts[1].toUpperCase();
  if (suffix === "AS") return "AMS";
  if (suffix === "MC") return "MAD";
  if (suffix === "L") return "LSE";
  if (suffix === "DE" || suffix === "F") return "XET";
  if (suffix === "CO") return "OMK";
  if (suffix === "TO") return "TSE";
  if (suffix === "HK") return "HKG";
  return "";
}

function toImportRow(tx: ParsedTransaction): ImportTransactionRow {
  const assetType = inferAssetType({ name: tx.name });
  return {
    date: tx.date,
    type: tx.type,
    ticker: tx.ticker,
    name: tx.name,
    isin: tx.isin || undefined,
    shares: tx.shares,
    pricePerShare: tx.pricePerShare,
    totalAmount: tx.totalAmount,
    fees: tx.fees,
    taxes: tx.taxes,
    currency: tx.currency,
    assetType: assetType === "crypto" || assetType === "etf" || assetType === "fund" ? assetType : "stock",
    sourceRef: tx.sourceRef || undefined,
    exchange: inferExchangeFromTicker(tx.ticker) || undefined,
  };
}

function summarize(rows: ImportTransactionRow[], duplicatesRemoved: number, unmapped: string[]) {
  return {
    total: rows.length,
    buys: rows.filter((t) => t.type === "buy").length,
    sells: rows.filter((t) => t.type === "sell").length,
    dividends: rows.filter((t) => t.type === "dividend").length,
    fees: rows.filter((t) => t.type === "fee").length,
    duplicatesRemoved,
    unmapped,
  };
}

async function resolveIsinsViaYahoo(
  unmappedIsins: string[],
  isinMap: Record<string, string>,
): Promise<Record<string, string>> {
  if (unmappedIsins.length === 0) return isinMap;
  const yahoo = new YahooProvider();
  const resolved = { ...isinMap };
  const batch = unmappedIsins.slice(0, MAX_ISIN_LOOKUPS);
  const batchWork = Promise.all(
    batch.map(async (isin) => {
      try {
        const results = await withTimeout(yahoo.search(isin), ISIN_LOOKUP_TIMEOUT_MS);
        if (results && results.length > 0) {
          resolved[isin] = results[0].symbol;
        }
      } catch {
        // leave unmapped
      }
    }),
  );
  await withTimeout(batchWork, ISIN_BATCH_TIMEOUT_MS);
  return resolved;
}

export function isImportableSpreadsheetOrCsv(mime: string, filename: string): boolean {
  const m = mime.toLowerCase().split(";")[0]?.trim() ?? "";
  const lower = filename.toLowerCase();
  if (m === "text/csv" || m === "application/csv") return true;
  if (m === "text/plain" && lower.endsWith(".csv")) return true;
  if (m === "application/vnd.ms-excel") return true;
  if (m === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") return true;
  return [".csv", ".xls", ".xlsx", ".xlsm"].some((ext) => lower.endsWith(ext));
}

export function isImportableImage(mime: string, filename: string): boolean {
  if (mime.toLowerCase().startsWith("image/")) return true;
  return [".png", ".jpg", ".jpeg", ".webp", ".gif"].some((ext) => filename.toLowerCase().endsWith(ext));
}

export function findCsvOrSpreadsheetAttachment(files: RawAttachment[] | undefined): RawAttachment | undefined {
  return files?.find((f) => isImportableSpreadsheetOrCsv(f.mimeType, f.filename));
}

export function findImageAttachment(files: RawAttachment[] | undefined): RawAttachment | undefined {
  return files?.find((f) => isImportableImage(f.mimeType, f.filename));
}

export function decodeAttachmentCsv(file: RawAttachment): string {
  return bufferToUtf8CsvOrPlainText(new Uint8Array(file.buffer), file.filename);
}

export async function parseBrokerCsvPreview(
  userId: string,
  csv: string,
  portfolioId?: string,
): Promise<ParseBrokerCsvResult> {
  if (!csv.trim()) {
    return { ok: false, error: "The file is empty." };
  }

  const broker = detectBrokerFormat(csv);

  const [existingRefs, existingFingerprints] = await Promise.all([
    listTransactionSourceRefs(userId),
    listTransactionContentFingerprints(userId),
  ]);

  if (!broker) {
    const simple = parseSimpleCSV(csv);
    if (simple.length === 0) {
      return { ok: true, fallbackToAi: true, reason: "no_match" };
    }
    const asParsed: ParsedTransaction[] = simple.map((tx) => ({
      date: tx.date,
      type: tx.type,
      ticker: tx.ticker,
      name: tx.name,
      isin: tx.isin,
      shares: tx.shares,
      pricePerShare: tx.pricePerShare,
      totalAmount: tx.totalAmount,
      fees: tx.fees,
      taxes: tx.taxes,
      currency: tx.currency,
      orderId: tx.orderId,
      sourceRef: tx.sourceRef,
    }));
    const { deduped, duplicatesRemoved } = dedupeParsedAgainstLedger(
      asParsed,
      existingRefs,
      existingFingerprints,
    );
    const rows = deduped.map(toImportRow);
    return {
      ok: true,
      fallbackToAi: false,
      preview: {
        detectedBroker: "simple",
        transactions: rows,
        cashBalances: [],
        summary: summarize(rows, duplicatesRemoved, []),
      },
    };
  }

  const parser = getBrokerParser(broker);
  if (!parser) {
    return { ok: true, fallbackToAi: true, reason: "no_match" };
  }

  try {
    const holdings = await listHoldings(userId, portfolioId);
    let isinMap = buildIsinMap(holdings);
    if (parser.extractIsins) {
      const allIsins = parser.extractIsins(csv);
      const unmapped = allIsins.filter((isin) => !isinMap[isin]);
      if (unmapped.length > 0) {
        isinMap = await resolveIsinsViaYahoo(unmapped, isinMap);
      }
    }
    const parsed = parser.parse(csv, isinMap);
    const { deduped, duplicatesRemoved } = dedupeParsedAgainstLedger(
      parsed,
      existingRefs,
      existingFingerprints,
    );
    const cash = parser.parseCashBalances?.(csv) || [];
    const rows = deduped.map(toImportRow);
    const unmapped = [
      ...new Set(deduped.filter((t) => !t.ticker && t.isin).map((t) => t.isin)),
    ];
    return {
      ok: true,
      fallbackToAi: false,
      preview: {
        detectedBroker: broker,
        transactions: rows,
        cashBalances: cash.map((c) => ({ currency: c.currency, amount: c.amount, broker })),
        summary: summarize(rows, duplicatesRemoved, unmapped),
      },
    };
  } catch (err) {
    console.error("[warren/import-parse] parse error", broker, err);
    return { ok: true, fallbackToAi: true, reason: "parse_error" };
  }
}
