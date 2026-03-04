/**
 * Parses a DEGIRO Account.csv (Spanish-locale) into normalized transactions.
 *
 * CSV columns (header row):
 *   Fecha, Hora, Fecha valor, Producto, ISIN, Descripción, Tipo,
 *   Variación (currency), Variación (amount), Saldo (currency), Saldo (amount), ID Orden
 */

export interface DegiroTransaction {
  date: string;            // YYYY-MM-DD
  type: "buy" | "sell" | "dividend" | "fee";
  ticker: string;
  name: string;
  isin: string;
  shares: number;
  pricePerShare: number;
  totalAmount: number;     // absolute, always positive
  fees: number;
  taxes: number;           // withholding taxes on dividends
  currency: string;
  orderId: string;
}

function parseEuropeanNumber(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
}

function parseDegiroDate(raw: string): string {
  const parts = raw.split("-");
  if (parts.length !== 3) return raw;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === "," && !inQuotes) { result.push(current); current = ""; continue; }
    current += ch;
  }
  result.push(current);
  return result;
}

interface RawRow {
  date: string;
  time: string;
  valueDate: string;
  product: string;
  isin: string;
  description: string;
  changeCurrency: string;
  changeAmount: number;
  orderId: string;
}

function parseRows(csv: string): RawRow[] {
  const lines = csv.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  return lines.slice(1).map((line) => {
    const cols = parseCSVLine(line);
    return {
      date: cols[0]?.trim() || "",
      time: cols[1]?.trim() || "",
      valueDate: cols[2]?.trim() || "",
      product: cols[3]?.trim() || "",
      isin: cols[4]?.trim() || "",
      description: cols[5]?.trim() || "",
      changeCurrency: cols[7]?.trim() || "",
      changeAmount: parseEuropeanNumber(cols[8] || ""),
      orderId: cols[11]?.trim() || "",
    };
  }).filter((r) => r.date);
}

const BUY_RE = /^(?:Compra|Buy)\s+(\d+(?:[.,]\d+)?)\s+.+@([\d.,]+)\s+([A-Z]{3})/i;
const SELL_RE = /^(?:Venta|Sell)\s+(\d+(?:[.,]\d+)?)\s+.+@([\d.,]+)\s+([A-Z]{3})/i;
const TX_FEE_RE = /Costes de transacción/i;

interface OrderFeeEntry {
  date: string;
  time: string;
  product: string;
  isin: string;
  orderId: string;
  currency: string;
  amount: number;
}

export function parseDegiroCSV(csv: string, isinToTicker: Record<string, string>): DegiroTransaction[] {
  const rows = parseRows(csv);
  const transactions: DegiroTransaction[] = [];

  // Collect order-level fee rows so we can attach only exact matching ones.
  const feesByOrderAndTimestamp: Record<string, OrderFeeEntry[]> = {};
  for (const row of rows) {
    if (TX_FEE_RE.test(row.description) && row.orderId) {
      const key = `${row.orderId}|${row.date}|${row.time}`;
      if (!feesByOrderAndTimestamp[key]) feesByOrderAndTimestamp[key] = [];
      feesByOrderAndTimestamp[key].push({
        date: row.date,
        time: row.time,
        product: row.product,
        isin: row.isin,
        orderId: row.orderId,
        currency: row.changeCurrency,
        amount: Math.abs(row.changeAmount),
      });
    }
  }

  const consumedFees = new Set<OrderFeeEntry>();

  // Group dividend-related rows by ISIN + value date
  const dividendGroups: Record<string, { product: string; isin: string; date: string; currency: string; gross: number; tax: number }> = {};

  for (const row of rows) {
    const desc = row.description;
    const ticker = isinToTicker[row.isin] || "";
    const date = parseDegiroDate(row.valueDate || row.date);

    // --- Buy / Sell ---
    const buyMatch = desc.match(BUY_RE);
    if (buyMatch) {
      const shares = parseEuropeanNumber(buyMatch[1]);
      const price = parseEuropeanNumber(buyMatch[2]);
      const tradeCurrency = row.changeCurrency || buyMatch[3] || "";
      const feeKey = `${row.orderId}|${row.date}|${row.time}`;
      const matchedFees = row.orderId ? (feesByOrderAndTimestamp[feeKey] || []) : [];
      const fees = matchedFees
        .filter((fee) => fee.currency === tradeCurrency)
        .reduce((sum, fee) => {
          consumedFees.add(fee);
          return sum + fee.amount;
        }, 0);
      transactions.push({
        date,
        type: "buy",
        ticker,
        name: row.product,
        isin: row.isin,
        shares,
        pricePerShare: price,
        totalAmount: Math.abs(row.changeAmount) || shares * price,
        fees,
        taxes: 0,
        currency: tradeCurrency,
        orderId: row.orderId,
      });
      continue;
    }

    const sellMatch = desc.match(SELL_RE);
    if (sellMatch) {
      const shares = parseEuropeanNumber(sellMatch[1]);
      const price = parseEuropeanNumber(sellMatch[2]);
      const tradeCurrency = row.changeCurrency || sellMatch[3] || "";
      const feeKey = `${row.orderId}|${row.date}|${row.time}`;
      const matchedFees = row.orderId ? (feesByOrderAndTimestamp[feeKey] || []) : [];
      const fees = matchedFees
        .filter((fee) => fee.currency === tradeCurrency)
        .reduce((sum, fee) => {
          consumedFees.add(fee);
          return sum + fee.amount;
        }, 0);
      transactions.push({
        date,
        type: "sell",
        ticker,
        name: row.product,
        isin: row.isin,
        shares,
        pricePerShare: price,
        totalAmount: Math.abs(row.changeAmount) || shares * price,
        fees,
        taxes: 0,
        currency: tradeCurrency,
        orderId: row.orderId,
      });
      continue;
    }

    // --- Dividends: accumulate into groups ---
    if (row.isin && (
      desc === "Dividendo" ||
      desc === "Dividendo sustitutivo" ||
      desc === "Interest Income Distribution" ||
      desc === "Rendimiento de capital"
    )) {
      const key = `${row.isin}|${date}`;
      if (!dividendGroups[key]) {
        dividendGroups[key] = { product: row.product, isin: row.isin, date, currency: row.changeCurrency, gross: 0, tax: 0 };
      }
      dividendGroups[key].gross += row.changeAmount;
      continue;
    }

    if (row.isin && (
      desc === "Retención del dividendo" ||
      desc === "Impuesto sustitutivo sobre Dividendos"
    )) {
      const key = `${row.isin}|${date}`;
      if (!dividendGroups[key]) {
        dividendGroups[key] = { product: row.product, isin: row.isin, date, currency: row.changeCurrency, gross: 0, tax: 0 };
      }
      dividendGroups[key].tax += row.changeAmount; // negative amounts
      continue;
    }

    // --- Standalone fees (market connectivity, corporate action fees without order) ---
    if (
      !row.orderId && (
        desc.includes("Comisión de conectividad") ||
        desc.includes("Comisión por Acción Corporativa")
      )
    ) {
      const amt = Math.abs(row.changeAmount);
      if (amt > 0) {
        transactions.push({
          date,
          type: "fee",
          ticker: "",
          name: desc,
          isin: "",
          shares: 0,
          pricePerShare: 0,
          totalAmount: amt,
          fees: 0,
          taxes: 0,
          currency: row.changeCurrency,
          orderId: "",
        });
      }
      continue;
    }
  }

  // Materialize order fees that were not attached to a buy/sell of the same
  // currency + timestamp, preserving each fee row's own currency.
  for (const feeEntries of Object.values(feesByOrderAndTimestamp)) {
    for (const fee of feeEntries) {
      if (consumedFees.has(fee) || fee.amount <= 0) continue;
      const ticker = isinToTicker[fee.isin] || "";
      transactions.push({
        date: parseDegiroDate(fee.date),
        type: "fee",
        ticker,
        name: fee.product || "Costes de transacción",
        isin: fee.isin,
        shares: 0,
        pricePerShare: 0,
        totalAmount: fee.amount,
        fees: 0,
        taxes: 0,
        currency: fee.currency,
        orderId: fee.orderId,
      });
    }
  }

  // Convert dividend groups into transactions
  for (const group of Object.values(dividendGroups)) {
    const grossAmount = group.gross;
    if (grossAmount <= 0) continue; // skip corrections that net to zero or negative
    const ticker = isinToTicker[group.isin] || "";
    const taxAmount = Math.abs(group.tax);
    transactions.push({
      date: group.date,
      type: "dividend",
      ticker,
      name: group.product,
      isin: group.isin,
      shares: 0,
      pricePerShare: 0,
      totalAmount: grossAmount,
      fees: 0,
      taxes: taxAmount,
      currency: group.currency,
      orderId: "",
    });
  }

  // Sort by date descending
  transactions.sort((a, b) => b.date.localeCompare(a.date));
  return transactions;
}

/**
 * Build ISIN → ticker map from seed holdings JSON.
 */
export function buildIsinMap(holdings: { isin: string; ticker: string }[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const h of holdings) {
    if (h.isin && h.ticker) map[h.isin] = h.ticker;
  }
  return map;
}
