import type { BrokerParser, ParsedTransaction, CashBalance } from "./types";
import {
  parseDegiroCSV,
  parseDegiroCashBalances,
  parseCSVLine,
  type DegiroTransaction,
} from "../degiro-parser";
import { hasExactColumns } from "./utils";

const REQUIRED_COLUMNS = ["Fecha", "Hora", "Fecha valor", "Producto", "ISIN", "Descripción", "Tipo"];

function detect(csv: string): boolean {
  const firstLine = csv.split("\n").find((l) => l.trim());
  if (!firstLine) return false;
  return hasExactColumns(parseCSVLine(firstLine), REQUIRED_COLUMNS);
}

function toTransaction(tx: DegiroTransaction): ParsedTransaction {
  return {
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
    exchangeRateEur: tx.exchangeRateEur,
    orderId: tx.orderId,
    sourceRef: tx.sourceRef,
  };
}

function extractIsins(csv: string): string[] {
  const isins = new Set<string>();
  const lines = csv.split("\n").filter((l) => l.trim());
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const isin = cols[4]?.trim() || "";
    if (/^[A-Z]{2}[A-Z0-9]{10}$/.test(isin)) isins.add(isin);
  }
  return Array.from(isins);
}

export const degiroParser: BrokerParser = {
  id: "degiro",
  label: "DEGIRO",
  fileHint: "Account.csv",

  detect,

  parse(csv: string, isinToTicker: Record<string, string>): ParsedTransaction[] {
    return parseDegiroCSV(csv, isinToTicker).map(toTransaction);
  },

  parseCashBalances(csv: string): CashBalance[] {
    return parseDegiroCashBalances(csv);
  },

  extractIsins(csv: string): string[] {
    return extractIsins(csv);
  },
};
