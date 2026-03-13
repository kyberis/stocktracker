/**
 * Core tax calculation engine.
 * Provides FIFO, LIFO, and weighted-average cost basis methods,
 * tax year filtering, dividend aggregation, and holding period calculation.
 */
import type { Transaction, ExchangeRates } from "@/lib/types";
import type { TaxRealizedGain, TaxDividend, CostBasisMethod, DataQualityCheck } from "./types";
import { convertToEUR, convertCurrency } from "@/lib/utils";

/* ── Currency Helpers ──────────────────────────────────────── */

function resolveBaseAmount(
  amount: number,
  tx: Transaction,
  baseCurrency: string,
  exchangeRates: ExchangeRates,
): number | null {
  const cur = (tx.displayCurrency || tx.currency || "EUR").toUpperCase();
  if (cur === baseCurrency) return amount;

  const normalizedAmount = cur === "GBX" ? amount / 100 : amount;
  const normalizedCur = cur === "GBX" ? "GBP" : cur;
  if (normalizedCur === baseCurrency) return normalizedAmount;

  if (baseCurrency === "EUR" && tx.exchangeRateEur && tx.exchangeRateEur > 0) {
    return normalizedAmount / tx.exchangeRateEur;
  }

  const rateKey = `EUR${normalizedCur}`;
  if (normalizedCur !== "EUR" && !exchangeRates[rateKey]) return null;
  const inEUR = normalizedCur === "EUR" ? normalizedAmount : convertToEUR(normalizedAmount, normalizedCur, exchangeRates);
  if (baseCurrency === "EUR") return inEUR;
  return convertCurrency(inEUR, "EUR", baseCurrency, exchangeRates);
}

/* ── Tax Year Filtering ────────────────────────────────────── */

export function filterByTaxYear(transactions: Transaction[], taxYear: number): Transaction[] {
  const start = `${taxYear}-01-01`;
  const end = `${taxYear}-12-31`;
  return transactions.filter((tx) => tx.date >= start && tx.date <= end);
}

/** All transactions up to and including the tax year (for cost basis lot building). */
export function filterUpToTaxYear(transactions: Transaction[], taxYear: number): Transaction[] {
  const end = `${taxYear}-12-31`;
  return transactions.filter((tx) => tx.date <= end);
}

/* ── Lot-based Cost Basis ──────────────────────────────────── */

interface Lot {
  date: string;
  shares: number;
  costPerShareBase: number;
}

function sortTransactions(txs: Transaction[]): Transaction[] {
  return [...txs]
    .filter((t) => t.type === "buy" || t.type === "sell")
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.createdAt.localeCompare(b.createdAt);
    });
}

function daysBetween(a: string, b: string): number {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

/**
 * Calculate realized gains using lot-matching (FIFO or LIFO).
 * Processes ALL transactions up to the tax year end to build correct lots,
 * but only returns gains for sells within the tax year.
 */
export function calculateLotBasedGains(
  allTransactions: Transaction[],
  taxYear: number,
  method: "fifo" | "lifo",
  exchangeRates: ExchangeRates,
  baseCurrency: string = "EUR",
): TaxRealizedGain[] {
  const sorted = sortTransactions(
    filterUpToTaxYear(allTransactions, taxYear),
  );

  const lots = new Map<string, Lot[]>();
  const results: TaxRealizedGain[] = [];
  const yearStart = `${taxYear}-01-01`;

  for (const tx of sorted) {
    const ticker = (tx.ticker || "").toUpperCase().trim();
    if (!ticker) continue;

    if (tx.type === "buy" && tx.shares > 0) {
      const totalCost = tx.totalAmount + (tx.fees || 0) + (tx.taxes || 0);
      const costBase = resolveBaseAmount(totalCost, tx, baseCurrency, exchangeRates);
      if (costBase == null) continue;

      const tickerLots = lots.get(ticker) || [];
      tickerLots.push({ date: tx.date, shares: tx.shares, costPerShareBase: costBase / tx.shares });
      lots.set(ticker, tickerLots);
    } else if (tx.type === "sell" && tx.shares > 0) {
      const tickerLots = lots.get(ticker);
      if (!tickerLots || tickerLots.length === 0) continue;

      const proceeds = tx.totalAmount - (tx.fees || 0) - (tx.taxes || 0);
      const proceedsBase = resolveBaseAmount(proceeds, tx, baseCurrency, exchangeRates);
      if (proceedsBase == null) continue;

      let remainingToSell = tx.shares;
      let costBasisBase = 0;
      let earliestBuyDate: string | undefined;

      while (remainingToSell > 0 && tickerLots.length > 0) {
        const lotIndex = method === "fifo" ? 0 : tickerLots.length - 1;
        const lot = tickerLots[lotIndex];
        const soldFromLot = Math.min(remainingToSell, lot.shares);
        costBasisBase += soldFromLot * lot.costPerShareBase;
        if (!earliestBuyDate || lot.date < earliestBuyDate) earliestBuyDate = lot.date;
        lot.shares -= soldFromLot;
        remainingToSell -= soldFromLot;
        if (lot.shares <= 1e-9) tickerLots.splice(lotIndex, 1);
      }
      lots.set(ticker, tickerLots);

      if (tx.date >= yearStart) {
        const gain = proceedsBase - costBasisBase;
        results.push({
          transactionId: tx.id,
          ticker,
          name: tx.name || ticker,
          assetType: tx.assetType,
          sellDate: tx.date,
          buyDate: earliestBuyDate,
          holdingDays: earliestBuyDate ? daysBetween(earliestBuyDate, tx.date) : undefined,
          sharesSold: tx.shares - remainingToSell,
          proceeds: proceedsBase,
          costBasis: costBasisBase,
          fees: (tx.fees || 0),
          gain,
        });
      }
    }
  }

  return results;
}

/* ── Weighted Average Cost Basis ───────────────────────────── */

export function calculateAverageCostGains(
  allTransactions: Transaction[],
  taxYear: number,
  exchangeRates: ExchangeRates,
  baseCurrency: string = "EUR",
): TaxRealizedGain[] {
  const sorted = sortTransactions(
    filterUpToTaxYear(allTransactions, taxYear),
  );

  const positions = new Map<string, { shares: number; totalCost: number; firstBuyDate: string }>();
  const results: TaxRealizedGain[] = [];
  const yearStart = `${taxYear}-01-01`;

  for (const tx of sorted) {
    const ticker = (tx.ticker || "").toUpperCase().trim();
    if (!ticker) continue;

    if (tx.type === "buy" && tx.shares > 0) {
      const totalCost = tx.totalAmount + (tx.fees || 0) + (tx.taxes || 0);
      const costBase = resolveBaseAmount(totalCost, tx, baseCurrency, exchangeRates);
      if (costBase == null) continue;

      const pos = positions.get(ticker) || { shares: 0, totalCost: 0, firstBuyDate: tx.date };
      pos.shares += tx.shares;
      pos.totalCost += costBase;
      positions.set(ticker, pos);
    } else if (tx.type === "sell" && tx.shares > 0) {
      const pos = positions.get(ticker);
      if (!pos || pos.shares <= 0) continue;

      const proceeds = tx.totalAmount - (tx.fees || 0) - (tx.taxes || 0);
      const proceedsBase = resolveBaseAmount(proceeds, tx, baseCurrency, exchangeRates);
      if (proceedsBase == null) continue;

      const avgCost = pos.totalCost / pos.shares;
      const soldShares = Math.min(tx.shares, pos.shares);
      const costBasisBase = soldShares * avgCost;

      pos.shares -= soldShares;
      pos.totalCost = Math.max(0, pos.totalCost - costBasisBase);
      positions.set(ticker, pos);

      if (tx.date >= yearStart) {
        results.push({
          transactionId: tx.id,
          ticker,
          name: tx.name || ticker,
          assetType: tx.assetType,
          sellDate: tx.date,
          buyDate: pos.firstBuyDate,
          sharesSold: soldShares,
          proceeds: proceedsBase,
          costBasis: costBasisBase,
          fees: (tx.fees || 0),
          gain: proceedsBase - costBasisBase,
        });
      }
    }
  }

  return results;
}

/* ── Unified Gains Calculator ──────────────────────────────── */

export function calculateRealizedGains(
  allTransactions: Transaction[],
  taxYear: number,
  method: CostBasisMethod,
  exchangeRates: ExchangeRates,
  baseCurrency: string = "EUR",
): TaxRealizedGain[] {
  if (method === "average") {
    return calculateAverageCostGains(allTransactions, taxYear, exchangeRates, baseCurrency);
  }
  return calculateLotBasedGains(allTransactions, taxYear, method, exchangeRates, baseCurrency);
}

/* ── Dividend Aggregation ──────────────────────────────────── */

export function aggregateDividends(
  allTransactions: Transaction[],
  taxYear: number,
  exchangeRates: ExchangeRates,
  baseCurrency: string = "EUR",
  domesticCountries?: string[],
): TaxDividend[] {
  const yearTxs = filterByTaxYear(allTransactions, taxYear).filter((t) => t.type === "dividend");

  return yearTxs.map((tx) => {
    const gross = resolveBaseAmount(tx.totalAmount, tx, baseCurrency, exchangeRates) ?? tx.totalAmount;
    const wht = resolveBaseAmount(tx.taxes || 0, tx, baseCurrency, exchangeRates) ?? (tx.taxes || 0);

    const exchange = (tx.exchange || "").toUpperCase();
    const sourceCountry = guessCountryFromExchange(exchange);
    const isDomestic = domesticCountries ? domesticCountries.some((c) => c === sourceCountry) : false;

    return {
      transactionId: tx.id,
      ticker: (tx.ticker || "").toUpperCase().trim(),
      name: tx.name || tx.ticker || "",
      date: tx.date,
      grossAmount: gross,
      withholdingTax: wht,
      netAmount: gross - wht,
      sourceCountry,
      isDomestic,
    };
  });
}

function guessCountryFromExchange(exchange: string): string | undefined {
  const map: Record<string, string> = {
    XETR: "DE", XFRA: "DE", FRA: "DE", ETR: "DE",
    XPAR: "FR", EPA: "FR", PAR: "FR",
    XMAD: "ES", BME: "ES",
    XAMS: "NL", AMS: "NL",
    XMIL: "IT", BIT: "IT", MIL: "IT",
    XLON: "GB", LSE: "GB", LON: "GB",
    XNYS: "US", XNAS: "US", NYSE: "US", NMS: "US", NGM: "US", NASDAQ: "US",
    XTSE: "CA", TSX: "CA",
    XASX: "AU", ASX: "AU",
    XHKG: "HK", XSES: "SG", XTKS: "JP",
    XSWX: "CH", SWX: "CH", VTX: "CH",
    XBRU: "BE", XLIS: "PT",
    XCSE: "DK", XHEL: "FI", XSTO: "SE", XOSL: "NO", XICE: "IS",
    XWBO: "AT",
    XDUB: "IE", ISE: "IE",
  };
  for (const [key, country] of Object.entries(map)) {
    if (exchange.includes(key)) return country;
  }
  return undefined;
}

/* ── Data Quality Checks ───────────────────────────────────── */

export function runDataQualityChecks(
  allTransactions: Transaction[],
  taxYear: number,
  gains: TaxRealizedGain[],
  dividends: TaxDividend[],
  jan1Value?: number,
  dec31Value?: number,
  jan1Estimated?: boolean,
  dec31Estimated?: boolean,
): DataQualityCheck[] {
  const checks: DataQualityCheck[] = [];
  const yearTxs = filterByTaxYear(allTransactions, taxYear);

  const sellsWithNoLots = gains.filter((g) => g.sharesSold === 0);
  if (sellsWithNoLots.length === 0) {
    checks.push({ status: "ok", message: "All sell transactions have matching buy lots" });
  } else {
    checks.push({ status: "warning", message: `${sellsWithNoLots.length} sell transaction(s) have no matching buy lots — cost basis may be incomplete` });
  }

  const missingRates = yearTxs.filter(
    (t) => t.currency !== "EUR" && (!t.exchangeRateEur || t.exchangeRateEur <= 0),
  );
  if (missingRates.length === 0) {
    checks.push({ status: "ok", message: "Exchange rates available for all foreign-currency transactions" });
  } else {
    checks.push({
      status: "warning",
      message: `${missingRates.length} transaction(s) missing historical exchange rate — using current rate as fallback`,
    });
  }

  const divWithTax = dividends.filter((d) => d.withholdingTax > 0).length;
  const divTotal = dividends.length;
  if (divTotal === 0) {
    checks.push({ status: "ok", message: "No dividend transactions in this tax year" });
  } else if (divWithTax === divTotal) {
    checks.push({ status: "ok", message: `Withholding tax recorded for all ${divTotal} dividend transactions` });
  } else {
    checks.push({
      status: "warning",
      message: `Withholding tax recorded for ${divWithTax} of ${divTotal} dividend transactions — verify with broker statement`,
    });
  }

  if (jan1Estimated) {
    checks.push({ status: "warning", message: "January 1 portfolio value estimated from current holdings — no historical snapshot found" });
  } else if (jan1Value !== undefined && jan1Value > 0) {
    checks.push({ status: "ok", message: "Portfolio snapshot available for January 1" });
  } else {
    checks.push({ status: "warning", message: "No portfolio snapshot for January 1 — some calculations may be approximate" });
  }

  if (dec31Estimated) {
    checks.push({ status: "warning", message: "December 31 portfolio value estimated from current holdings — no historical snapshot found" });
  } else if (dec31Value !== undefined && dec31Value > 0) {
    checks.push({ status: "ok", message: "Portfolio snapshot available for December 31" });
  } else {
    checks.push({ status: "warning", message: "No portfolio snapshot for December 31 — some calculations may be approximate" });
  }

  return checks;
}
