import YahooFinance from "yahoo-finance2";
import type {
  StockDataProvider,
  ProviderQuoteResult,
  ProviderSearchResult,
  ProviderHistoricalPoint,
  SearchOptions,
  TimePeriod,
  CompanyOverview,
  FundamentalData,
  IncomeStatementReport,
  BalanceSheetReport,
  CashFlowReport,
  EarningsReport,
  ETFHoldingsData,
} from "./types";
import { providerRequestsTotal, providerRequestDuration } from "@/lib/metrics";

const yahooFinance = new YahooFinance();

export class YahooProvider implements StockDataProvider {
  readonly name = "yahoo";

  async getQuote(symbol: string): Promise<ProviderQuoteResult> {
    const end = providerRequestDuration.startTimer({ provider: "yahoo", operation: "quote" });
    let ok = false;
    try {
      const quote = await yahooFinance.quote(symbol);
      ok = true;
      return {
        symbol: quote.symbol ?? symbol,
        shortName: quote.shortName || quote.longName || symbol,
        regularMarketPrice: quote.regularMarketPrice ?? 0,
        regularMarketChange: quote.regularMarketChange ?? 0,
        regularMarketChangePercent: quote.regularMarketChangePercent ?? 0,
        currency: quote.currency || "USD",
        regularMarketPreviousClose: quote.regularMarketPreviousClose ?? 0,
        fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh ?? 0,
        fiftyTwoWeekLow: quote.fiftyTwoWeekLow ?? 0,
        marketCap: quote.marketCap ?? 0,
        trailingAnnualDividendRate: quote.trailingAnnualDividendRate ?? undefined,
        trailingAnnualDividendYield: quote.trailingAnnualDividendYield ?? undefined,
      };
    } finally {
      end();
      providerRequestsTotal.inc({ provider: "yahoo", operation: "quote", status: ok ? "success" : "error" });
    }
  }

  async search(query: string, options?: SearchOptions): Promise<ProviderSearchResult[]> {
    const end = providerRequestDuration.startTimer({ provider: "yahoo", operation: "search" });
    let ok = false;
    try {
      const result = await yahooFinance.search(query, { quotesCount: 8 }, { validateResult: false }) as { quotes?: Array<Record<string, unknown>> };
      ok = true;
      const allowedTypes = new Set(["EQUITY", "ETF"]);
      if (options?.includeCrypto) allowedTypes.add("CRYPTOCURRENCY");
      return (result.quotes || [])
        .filter(
          (q): q is typeof q & { symbol: string; quoteType: string } =>
            "symbol" in q &&
            "quoteType" in q &&
            allowedTypes.has(String(q.quoteType))
        )
        .map((q) => ({
          symbol: q.symbol,
          shortname: String(
            ("shortname" in q ? q.shortname : "") ||
            ("longname" in q ? q.longname : "") ||
            q.symbol
          ),
          exchange: String(("exchange" in q ? q.exchange : "") || ""),
          quoteType: String(q.quoteType || ""),
        }));
    } finally {
      end();
      providerRequestsTotal.inc({ provider: "yahoo", operation: "search", status: ok ? "success" : "error" });
    }
  }

  async getHistorical(
    symbol: string,
    period: TimePeriod
  ): Promise<ProviderHistoricalPoint[]> {
    const end = providerRequestDuration.startTimer({ provider: "yahoo", operation: "historical" });
    let ok = false;
    try {
      const now = new Date();
      let period1: Date;
      let interval: "1d" | "1wk" | "1mo" = "1d";

      switch (period) {
        case "1w":
          period1 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          interval = "1d";
          break;
        case "1m":
          period1 = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          interval = "1d";
          break;
        case "3m":
          period1 = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
          interval = "1d";
          break;
        case "6m":
          period1 = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
          interval = "1wk";
          break;
        case "1y":
          period1 = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          interval = "1wk";
          break;
        case "all":
          period1 = new Date(2000, 0, 1);
          interval = "1mo";
          break;
        default:
          period1 = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          interval = "1d";
      }

      const result = await yahooFinance.chart(symbol, {
        period1,
        period2: now,
        interval,
      });

      ok = true;
      const quotes = result.quotes ?? [];
      return quotes
        .filter((item) => item.close != null)
        .map((item) => ({
          date: item.date.toISOString().split("T")[0],
          open: item.open ?? 0,
          high: item.high ?? 0,
          low: item.low ?? 0,
          close: item.close ?? 0,
          volume: item.volume ?? 0,
        }));
    } finally {
      end();
      providerRequestsTotal.inc({ provider: "yahoo", operation: "historical", status: ok ? "success" : "error" });
    }
  }

  async getClassification(symbol: string): Promise<{ sector: string; region: string; assetClass: string } | null> {
    const end = providerRequestDuration.startTimer({ provider: "yahoo", operation: "classification" });
    let ok = false;
    try {
      try {
        const result = await yahooFinance.quoteSummary(symbol, { modules: ["assetProfile", "quoteType"] });
        ok = true;
        const profile = result.assetProfile;
        const qt = result.quoteType;

        return {
          sector: profile?.sector ?? "",
          region: profile?.country ?? "",
          assetClass: yahooQuoteTypeToAssetClass(qt?.quoteType),
        };
      } catch {
        // assetProfile module is unavailable for many instruments (bond ETFs,
        // money-market ETFs, ETCs, crypto pairs). Fall back to quote() which
        // reliably returns quoteType so we can still classify the asset class.
        const quote = await yahooFinance.quote(symbol);
        ok = true;
        return {
          sector: "",
          region: "",
          assetClass: yahooQuoteTypeToAssetClass(quote.quoteType),
        };
      }
    } catch {
      return null;
    } finally {
      end();
      providerRequestsTotal.inc({ provider: "yahoo", operation: "classification", status: ok ? "success" : "error" });
    }
  }

  async getExchangeRate(from: string, to: string): Promise<number> {
    const end = providerRequestDuration.startTimer({ provider: "yahoo", operation: "exchange_rate" });
    let ok = false;
    try {
      const symbol = `${from}${to}=X`;
      const quote = await yahooFinance.quote(symbol);
      ok = true;
      return quote.regularMarketPrice ?? 0;
    } finally {
      end();
      providerRequestsTotal.inc({ provider: "yahoo", operation: "exchange_rate", status: ok ? "success" : "error" });
    }
  }

  async getOverview(symbol: string): Promise<CompanyOverview | null> {
    const end = providerRequestDuration.startTimer({ provider: "yahoo", operation: "overview" });
    let ok = false;
    try {
      const result = await yahooFinance.quoteSummary(symbol, {
        modules: ["summaryProfile", "summaryDetail", "financialData", "defaultKeyStatistics", "recommendationTrend"],
      });
      ok = true;

      const profile = result.summaryProfile;
      const detail = result.summaryDetail;
      const fin = result.financialData;
      const stats = result.defaultKeyStatistics;
      const rec = result.recommendationTrend;

      const trend = rec?.trend?.find((t) => t.period === "0m");

      return {
        symbol,
        name: profile?.longBusinessSummary ? symbol : symbol,
        description: profile?.longBusinessSummary ?? "",
        exchange: "",
        currency: fin?.financialCurrency ?? detail?.currency ?? "USD",
        sector: profile?.sector ?? "",
        industry: profile?.industry ?? "",
        peRatio: detail?.trailingPE ?? null,
        pegRatio: stats?.pegRatio ?? null,
        eps: fin?.revenuePerShare ?? null,
        dividendPerShare: detail?.dividendRate ?? null,
        dividendYield: detail?.dividendYield ?? null,
        beta: detail?.beta ?? null,
        profitMargin: fin?.profitMargins ?? null,
        returnOnEquity: fin?.returnOnEquity ?? null,
        revenueTTM: fin?.totalRevenue ?? null,
        analystTargetPrice: fin?.targetMeanPrice ?? null,
        analystRatings: trend
          ? { strongBuy: trend.strongBuy ?? 0, buy: trend.buy ?? 0, hold: trend.hold ?? 0, sell: trend.sell ?? 0, strongSell: trend.strongSell ?? 0 }
          : null,
        fiftyDayMA: detail?.fiftyDayAverage ?? null,
        twoHundredDayMA: detail?.twoHundredDayAverage ?? null,
        sharesOutstanding: stats?.sharesOutstanding ?? null,
        forwardPE: stats?.forwardPE ?? null,
      };
    } catch {
      return null;
    } finally {
      end();
      providerRequestsTotal.inc({ provider: "yahoo", operation: "overview", status: ok ? "success" : "error" });
    }
  }

  async getIncomeStatement(symbol: string): Promise<FundamentalData<IncomeStatementReport> | null> {
    const end = providerRequestDuration.startTimer({ provider: "yahoo", operation: "income_statement" });
    let ok = false;
    try {
      const result = await yahooFinance.quoteSummary(symbol, {
        modules: ["incomeStatementHistory", "incomeStatementHistoryQuarterly"],
      });
      ok = true;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapRow = (row: any): IncomeStatementReport => ({
        fiscalDateEnding: row.endDate ? new Date(row.endDate).toISOString().slice(0, 10) : "",
        reportedCurrency: "USD",
        totalRevenue: numOrNull(row.totalRevenue),
        costOfRevenue: numOrNull(row.costOfRevenue),
        grossProfit: numOrNull(row.grossProfit),
        operatingExpenses: numOrNull(row.totalOperatingExpenses),
        operatingIncome: numOrNull(row.operatingIncome),
        incomeBeforeTax: numOrNull(row.incomeBeforeTax),
        incomeTaxExpense: numOrNull(row.incomeTaxExpense),
        netIncome: numOrNull(row.netIncome),
        ebitda: numOrNull(row.ebitda),
        researchAndDevelopment: numOrNull(row.researchDevelopment),
        sellingGeneralAndAdmin: numOrNull(row.sellingGeneralAdministrative),
        interestExpense: numOrNull(row.interestExpense),
      });

      return {
        annual: (result.incomeStatementHistory?.incomeStatementHistory ?? []).map(mapRow),
        quarterly: (result.incomeStatementHistoryQuarterly?.incomeStatementHistory ?? []).map(mapRow),
      };
    } catch {
      return null;
    } finally {
      end();
      providerRequestsTotal.inc({ provider: "yahoo", operation: "income_statement", status: ok ? "success" : "error" });
    }
  }

  async getBalanceSheet(symbol: string): Promise<FundamentalData<BalanceSheetReport> | null> {
    const end = providerRequestDuration.startTimer({ provider: "yahoo", operation: "balance_sheet" });
    let ok = false;
    try {
      const result = await yahooFinance.quoteSummary(symbol, {
        modules: ["balanceSheetHistory", "balanceSheetHistoryQuarterly"],
      });
      ok = true;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapRow = (row: any): BalanceSheetReport => ({
        fiscalDateEnding: row.endDate ? new Date(row.endDate).toISOString().slice(0, 10) : "",
        reportedCurrency: "USD",
        totalAssets: numOrNull(row.totalAssets),
        totalCurrentAssets: numOrNull(row.totalCurrentAssets),
        cashAndEquivalents: numOrNull(row.cash),
        totalNonCurrentAssets: null,
        totalLiabilities: numOrNull(row.totalLiab),
        totalCurrentLiabilities: numOrNull(row.totalCurrentLiabilities),
        totalNonCurrentLiabilities: null,
        totalShareholderEquity: numOrNull(row.totalStockholderEquity),
        retainedEarnings: numOrNull(row.retainedEarnings),
        longTermDebt: numOrNull(row.longTermDebt),
        shortTermDebt: numOrNull(row.shortTermBorrowings),
        commonStockSharesOutstanding: numOrNull(row.commonStock),
      });

      return {
        annual: (result.balanceSheetHistory?.balanceSheetStatements ?? []).map(mapRow),
        quarterly: (result.balanceSheetHistoryQuarterly?.balanceSheetStatements ?? []).map(mapRow),
      };
    } catch {
      return null;
    } finally {
      end();
      providerRequestsTotal.inc({ provider: "yahoo", operation: "balance_sheet", status: ok ? "success" : "error" });
    }
  }

  async getCashFlow(symbol: string): Promise<FundamentalData<CashFlowReport> | null> {
    const end = providerRequestDuration.startTimer({ provider: "yahoo", operation: "cash_flow" });
    let ok = false;
    try {
      const result = await yahooFinance.quoteSummary(symbol, {
        modules: ["cashflowStatementHistory", "cashflowStatementHistoryQuarterly"],
      });
      ok = true;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapRow = (row: any): CashFlowReport => ({
        fiscalDateEnding: row.endDate ? new Date(row.endDate).toISOString().slice(0, 10) : "",
        reportedCurrency: "USD",
        operatingCashflow: numOrNull(row.totalCashFromOperatingActivities),
        capitalExpenditures: numOrNull(row.capitalExpenditures),
        changeInCash: numOrNull(row.changeInCash),
        freeCashFlow: numOrNull(row.freeCashFlow),
        dividendPayout: numOrNull(row.dividendsPaid),
        shareRepurchase: numOrNull(row.repurchaseOfStock),
        proceedsFromIssuanceOfDebt: numOrNull(row.netBorrowings),
        paymentsForRepurchaseOfEquity: numOrNull(row.repurchaseOfStock),
      });

      return {
        annual: (result.cashflowStatementHistory?.cashflowStatements ?? []).map(mapRow),
        quarterly: (result.cashflowStatementHistoryQuarterly?.cashflowStatements ?? []).map(mapRow),
      };
    } catch {
      return null;
    } finally {
      end();
      providerRequestsTotal.inc({ provider: "yahoo", operation: "cash_flow", status: ok ? "success" : "error" });
    }
  }

  async getEarnings(symbol: string): Promise<FundamentalData<EarningsReport> | null> {
    const end = providerRequestDuration.startTimer({ provider: "yahoo", operation: "earnings" });
    let ok = false;
    try {
      const result = await yahooFinance.quoteSummary(symbol, {
        modules: ["earningsHistory"],
      });
      ok = true;

      const history = result.earningsHistory?.history ?? [];
      const quarterly: EarningsReport[] = history.map((row) => ({
        fiscalDateEnding: row.quarter ? new Date(row.quarter).toISOString().slice(0, 10) : "",
        reportedEPS: numOrNull(row.epsActual),
        estimatedEPS: numOrNull(row.epsEstimate),
        surprise: numOrNull(row.epsDifference),
        surprisePercentage: numOrNull(row.surprisePercent),
      }));

      return { annual: [], quarterly };
    } catch {
      return null;
    } finally {
      end();
      providerRequestsTotal.inc({ provider: "yahoo", operation: "earnings", status: ok ? "success" : "error" });
    }
  }

  async getETFHoldings(symbol: string): Promise<ETFHoldingsData | null> {
    const end = providerRequestDuration.startTimer({ provider: "yahoo", operation: "etf_holdings" });
    let ok = false;
    try {
      const result = await yahooFinance.quoteSummary(symbol, {
        modules: ["topHoldings", "fundProfile"],
      });
      ok = true;

      const th = result.topHoldings;
      const fp = result.fundProfile;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const holdings = (th?.holdings ?? []).map((h: any) => ({
        symbol: String(h.symbol ?? ""),
        name: String(h.holdingName ?? h.symbol ?? ""),
        weight: typeof h.holdingPercent === "number" ? h.holdingPercent * 100 : 0,
      }));

      const sectorWeightings: ETFHoldingsData["sectorWeightings"] = [];
      if (th?.sectorWeightings) {
        for (const entry of th.sectorWeightings) {
          // Each entry is an object with a single key-value pair { sectorName: weight }
          for (const [sector, weight] of Object.entries(entry)) {
            if (typeof weight === "number" && weight > 0) {
              sectorWeightings.push({ sector, weight: weight * 100 });
            }
          }
        }
      }

      return {
        holdings,
        sectorWeightings: sectorWeightings.sort((a, b) => b.weight - a.weight),
        category: String(fp?.categoryName ?? ""),
        fundFamily: String(fp?.family ?? ""),
        legalType: String(fp?.legalType ?? ""),
      };
    } catch {
      return null;
    } finally {
      end();
      providerRequestsTotal.inc({ provider: "yahoo", operation: "etf_holdings", status: ok ? "success" : "error" });
    }
  }
}

function yahooQuoteTypeToAssetClass(quoteType?: string): string {
  switch (quoteType) {
    case "ETF": return "ETF";
    case "MUTUALFUND": return "Fund";
    case "CRYPTOCURRENCY": return "Cryptocurrency";
    default: return "Equity";
  }
}

function numOrNull(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
