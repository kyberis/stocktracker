/**
 * Interactive Brokers Activity Statement / Flex Query CSV parser.
 *
 * The CSV is a multi-section file. Each row starts with a section identifier
 * (e.g. "Trades", "Dividends"). A row containing all expected field names for
 * that section acts as the header. Subsequent rows prefixed with the section
 * name and "Data" in the Header column contain the data.
 *
 * Verified against ibkr-report-parser (github.com/oittaa/ibkr-report-parser)
 * and official IBKR Flex Statement docs.
 */

import type { BrokerParser, ParsedTransaction } from "./types";
import { parseCSVLine, extractDate, num, deduplicateSourceRefs } from "./utils";

/* ── Section field names ── */

const TRADE_FIELDS = [
  "Trades", "Header", "DataDiscriminator", "Asset Category",
  "Currency", "Symbol", "Date/Time", "Quantity", "T. Price",
  "Proceeds", "Comm/Fee",
] as const;

const DIVIDEND_FIELDS = [
  "Dividends", "Header", "Currency", "Date", "Description", "Amount",
] as const;

const WHT_FIELDS = [
  "Withholding Tax", "Header", "Currency", "Date", "Description", "Amount",
] as const;

/* ── Helpers ── */

interface SectionRow {
  columns: Record<string, number>;
  rows: string[][];
}

/**
 * Scan the CSV and group data rows by section. A header row is one where
 * all expected field names appear as cell values.
 */
function parseSections(csv: string): Record<string, SectionRow> {
  const sections: Record<string, SectionRow> = {};
  const lines = csv.split("\n").filter((l) => l.trim());

  let currentSection: string | null = null;
  let currentColumns: Record<string, number> = {};

  for (const line of lines) {
    const cells = parseCSVLine(line);
    const sectionName = cells[0]?.trim() || "";

    // Detect header rows: the second cell is "Header" and remaining cells
    // are field names. Build column index map.
    if (cells[1]?.trim() === "Header") {
      currentSection = sectionName;
      currentColumns = {};
      for (let i = 0; i < cells.length; i++) {
        currentColumns[cells[i].trim()] = i;
      }
      if (!sections[sectionName]) {
        sections[sectionName] = { columns: currentColumns, rows: [] };
      } else {
        sections[sectionName].columns = currentColumns;
      }
      continue;
    }

    // Data rows: same section name, second cell is "Data"
    if (
      currentSection &&
      sectionName === currentSection &&
      cells[1]?.trim() === "Data" &&
      sections[currentSection]
    ) {
      sections[currentSection].rows.push(cells);
    }
  }

  return sections;
}

function cellVal(row: string[], colMap: Record<string, number>, field: string): string {
  const idx = colMap[field];
  if (idx === undefined || idx >= row.length) return "";
  return row[idx].trim();
}

function extractIsins(csv: string): string[] {
  const isins = new Set<string>();
  const lines = csv.split("\n");
  for (const line of lines) {
    const matches = line.match(/\b[A-Z]{2}[A-Z0-9]{10}\b/g);
    if (matches) matches.forEach((m) => isins.add(m));
  }
  return Array.from(isins);
}

/* ── Parser ── */

function parseIBKR(csv: string, isinToTicker: Record<string, string>): ParsedTransaction[] {
  const sections = parseSections(csv);
  const transactions: ParsedTransaction[] = [];

  // --- Trades ---
  const trades = sections["Trades"];
  if (trades) {
    const col = trades.columns;
    for (const row of trades.rows) {
      const disc = cellVal(row, col, "DataDiscriminator");
      if (disc !== "Trade") continue;

      const assetCat = cellVal(row, col, "Asset Category");
      if (assetCat !== "Stocks" && assetCat !== "Equity and Index Options") continue;

      const symbol = cellVal(row, col, "Symbol");
      const rawQty = num(cellVal(row, col, "Quantity"));
      const price = num(cellVal(row, col, "T. Price"));
      const proceeds = num(cellVal(row, col, "Proceeds"));
      const commFee = num(cellVal(row, col, "Comm/Fee"));
      const currency = cellVal(row, col, "Currency");
      const dateRaw = cellVal(row, col, "Date/Time");
      const date = extractDate(dateRaw);
      const tradeId = cellVal(row, col, "Trade ID") || cellVal(row, col, "IB Order ID") || "";

      // IBKR uses explicit Buy/Sell column when available, otherwise infer from quantity sign
      const buySellCol = cellVal(row, col, "Buy/Sell");
      const isBuy = buySellCol
        ? buySellCol.toUpperCase().startsWith("BUY") || buySellCol === "BOT"
        : rawQty > 0;

      const type = isBuy ? "buy" : "sell";
      const shares = Math.abs(rawQty);
      const totalAmount = Math.abs(proceeds) || shares * price;
      const fees = Math.abs(commFee);

      // Resolve ISIN if present
      const isin = cellVal(row, col, "ISIN") || cellVal(row, col, "Security ID") || "";
      const ticker = symbol || isinToTicker[isin] || "";

      transactions.push({
        date,
        type,
        ticker,
        name: cellVal(row, col, "Description") || symbol,
        isin,
        shares,
        pricePerShare: price,
        totalAmount,
        fees,
        taxes: 0,
        currency,
        orderId: tradeId,
        sourceRef: `ibkr|${date}|${type}|${symbol}|${tradeId || totalAmount}`,
      });
    }
  }

  // --- Dividends ---
  const dividends = sections["Dividends"];
  const whtSection = sections["Withholding Tax"];

  // Build withholding tax lookup: symbol+date -> absolute tax amount
  const whtMap = new Map<string, number>();
  if (whtSection) {
    const col = whtSection.columns;
    for (const row of whtSection.rows) {
      const desc = cellVal(row, col, "Description");
      const dateRaw = cellVal(row, col, "Date");
      const date = extractDate(dateRaw);
      const amount = num(cellVal(row, col, "Amount"));
      // Description typically starts with the symbol
      const symbol = desc.split(/[(\s]/)[0] || "";
      const key = `${symbol}|${date}`;
      whtMap.set(key, (whtMap.get(key) || 0) + Math.abs(amount));
    }
  }

  if (dividends) {
    const col = dividends.columns;
    for (const row of dividends.rows) {
      const desc = cellVal(row, col, "Description");
      const dateRaw = cellVal(row, col, "Date");
      const date = extractDate(dateRaw);
      const amount = num(cellVal(row, col, "Amount"));
      const currency = cellVal(row, col, "Currency");

      if (amount <= 0) continue;

      const symbol = desc.split(/[(\s]/)[0] || "";
      const key = `${symbol}|${date}`;
      const taxes = whtMap.get(key) || 0;

      transactions.push({
        date,
        type: "dividend",
        ticker: symbol,
        name: desc,
        isin: "",
        shares: 0,
        pricePerShare: 0,
        totalAmount: amount,
        fees: 0,
        taxes,
        currency,
        orderId: "",
        sourceRef: `ibkr|${date}|dividend|${symbol}|${amount}`,
      });
    }
  }

  deduplicateSourceRefs(transactions);
  transactions.sort((a, b) => b.date.localeCompare(a.date));
  return transactions;
}

export const ibkrParser: BrokerParser = {
  id: "interactive_brokers",
  label: "Interactive Brokers",
  fileHint: "Activity Statement CSV",

  parse: parseIBKR,

  extractIsins(csv: string): string[] {
    return extractIsins(csv);
  },
};
