import type { Holding, CashEntry, QuoteData, ExchangeRates } from "./types";
import { computeTaxonomyAllocations, type TaxonomyCategory } from "./services/taxonomy";
import { computeEstimatedDividends, computeTotalEstimatedEUR } from "./services/dividend-calculator";
import { calculatePortfolioTotals } from "./portfolio-summary";
import { convertToEUR, resolveQuoteCurrency } from "./utils";

/* ── Response types ──────────────────────────────────────── */

export interface CategoryScore {
  score: number;
  label: string;
  summary: string;
  details: string[];
  weaknesses: string[];
  improvements: string[];
}

export interface Recommendation {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  tickers: string[];
}

export interface AllocationInsight {
  label: string;
  pct: number;
  assessment: string;
}

export interface PortfolioScoreResponse {
  overallScore: number;
  percentile: number;
  categories: {
    diversification: CategoryScore;
    risk: CategoryScore;
    costs: CategoryScore;
    macroeconomics: CategoryScore;
  };
  sectorInsights: AllocationInsight[];
  regionInsights: AllocationInsight[];
  topConcentrationRisks: Array<{
    ticker: string;
    name: string;
    weightPct: number;
    issue: string;
  }>;
  recommendations: Recommendation[];
  disclaimer: string;
}

export interface StoredScore {
  id: string;
  score: PortfolioScoreResponse;
  createdAt: string;
}

/* ── OpenAI JSON Schema ──────────────────────────────────── */

const categoryScoreSchema = {
  type: "object" as const,
  properties: {
    score: { type: "number" as const, description: "Score from 0 to 10" },
    label: { type: "string" as const, description: "Qualitative label" },
    summary: { type: "string" as const, description: "2-3 sentence explanation referencing specific holdings" },
    details: {
      type: "array" as const,
      items: { type: "string" as const },
      description: "3-5 bullet points with specific data (tickers, percentages, sectors)",
    },
    weaknesses: {
      type: "array" as const,
      items: { type: "string" as const },
      description: "For scores ≤ 6: 2-4 specific reasons WHY the score is low, citing tickers/sectors/percentages. Empty array if score > 6.",
    },
    improvements: {
      type: "array" as const,
      items: { type: "string" as const },
      description: "For scores ≤ 6: 2-4 concrete, actionable steps to raise this score, each referencing specific tickers or sectors. Empty array if score > 6.",
    },
  },
  required: ["score", "label", "summary", "details", "weaknesses", "improvements"] as const,
  additionalProperties: false as const,
};

export const PORTFOLIO_SCORE_JSON_SCHEMA = {
  name: "portfolio_score",
  strict: true,
  schema: {
    type: "object",
    properties: {
      overallScore: { type: "number", description: "Overall portfolio score from 0 to 10" },
      percentile: { type: "number", description: "Estimated percentile vs typical retail portfolios (0-100)" },
      categories: {
        type: "object",
        properties: {
          diversification: categoryScoreSchema,
          risk: categoryScoreSchema,
          costs: categoryScoreSchema,
          macroeconomics: categoryScoreSchema,
        },
        required: ["diversification", "risk", "costs", "macroeconomics"],
        additionalProperties: false,
      },
      sectorInsights: {
        type: "array",
        items: {
          type: "object",
          properties: {
            label: { type: "string" },
            pct: { type: "number" },
            assessment: { type: "string", description: "Short assessment: overweight/underweight/balanced + why" },
          },
          required: ["label", "pct", "assessment"],
          additionalProperties: false,
        },
        description: "Top 5 sectors with allocation assessment",
      },
      regionInsights: {
        type: "array",
        items: {
          type: "object",
          properties: {
            label: { type: "string" },
            pct: { type: "number" },
            assessment: { type: "string", description: "Short assessment: overweight/underweight/balanced + why" },
          },
          required: ["label", "pct", "assessment"],
          additionalProperties: false,
        },
        description: "Top regions with allocation assessment",
      },
      topConcentrationRisks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            ticker: { type: "string" },
            name: { type: "string" },
            weightPct: { type: "number" },
            issue: { type: "string", description: "What risk this concentration creates" },
          },
          required: ["ticker", "name", "weightPct", "issue"],
          additionalProperties: false,
        },
        description: "Positions with concentration risk (>8% weight)",
      },
      recommendations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string", description: "2-3 sentences with specific tickers, sectors, or amounts" },
            priority: { type: "string", enum: ["high", "medium", "low"] },
            tickers: {
              type: "array",
              items: { type: "string" },
              description: "Ticker symbols this recommendation relates to (can be empty)",
            },
          },
          required: ["title", "description", "priority", "tickers"],
          additionalProperties: false,
        },
      },
      disclaimer: { type: "string" },
    },
    required: [
      "overallScore", "percentile", "categories",
      "sectorInsights", "regionInsights", "topConcentrationRisks",
      "recommendations", "disclaimer",
    ],
    additionalProperties: false,
  },
} as const;

/* ── Payload builder ─────────────────────────────────────── */

interface HoldingSummary {
  ticker: string;
  name: string;
  type: string;
  shares: number;
  avgCost: number;
  currentPrice: number | null;
  currency: string;
  valueEUR: number;
  weightPct: number;
  sector: string;
  region: string;
  dayChangePct: number;
  totalGainPct: number;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  dividendYield: number | null;
}

interface ScorePayload {
  holdingsCount: number;
  totalValueEUR: number;
  totalCostEUR: number;
  totalGainLossPct: number;
  dayChangePct: number;
  cashAllocationPct: number;
  holdings: HoldingSummary[];
  sectorAllocation: Array<{ label: string; pct: number }>;
  regionAllocation: Array<{ label: string; pct: number }>;
  typeAllocation: Array<{ label: string; pct: number }>;
  dividends: {
    estimatedAnnualEUR: number;
    portfolioYield: number;
    payingCount: number;
  };
  concentrationMetrics: {
    top1WeightPct: number;
    top5WeightPct: number;
    herfindahlIndex: number;
    positionCount: number;
  };
}

export function buildScorePayload(
  holdings: Holding[],
  cashEntries: CashEntry[],
  quotes: Record<string, QuoteData>,
  exchangeRates: ExchangeRates,
): ScorePayload {
  const totals = calculatePortfolioTotals(holdings, cashEntries, quotes, exchangeRates, "EUR");
  const totalValue = totals.totalCurrentEUR;

  const holdingSummaries: HoldingSummary[] = holdings.map((h) => {
    const q = quotes[h.ticker];
    let valueEUR = 0;
    let currentPrice: number | null = null;
    let dayChangePct = 0;
    let totalGainPct = 0;

    if (q && q.regularMarketPrice > 0) {
      currentPrice = q.regularMarketPrice;
      const qc = resolveQuoteCurrency(h.displayCurrency, q.currency);
      valueEUR = convertToEUR(h.shares * q.regularMarketPrice, qc, exchangeRates);
      dayChangePct = q.regularMarketChangePercent ?? 0;
      const costPerShare = h.purchasePrice;
      if (costPerShare > 0) {
        totalGainPct = ((q.regularMarketPrice - costPerShare) / costPerShare) * 100;
      }
    } else {
      valueEUR = h.valueInEUR;
    }

    return {
      ticker: h.ticker,
      name: h.name,
      type: h.assetType || "stock",
      shares: h.shares,
      avgCost: h.purchasePrice,
      currentPrice,
      currency: h.displayCurrency,
      valueEUR: Math.round(valueEUR * 100) / 100,
      weightPct: totalValue > 0 ? Math.round((valueEUR / totalValue) * 10000) / 100 : 0,
      sector: h.sector || "Unknown",
      region: h.region || "Unknown",
      dayChangePct: Math.round(dayChangePct * 100) / 100,
      totalGainPct: Math.round(totalGainPct * 100) / 100,
      fiftyTwoWeekHigh: q?.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: q?.fiftyTwoWeekLow ?? null,
      dividendYield: q?.trailingAnnualDividendYield
        ? Math.round(q.trailingAnnualDividendYield * 10000) / 100
        : null,
    };
  });

  holdingSummaries.sort((a, b) => b.valueEUR - a.valueEUR);

  const taxonomyCategories: TaxonomyCategory[] = ["sector", "region", "assetType"];
  const [sectorAlloc, regionAlloc, typeAlloc] = taxonomyCategories.map((cat) =>
    computeTaxonomyAllocations(holdings, quotes, exchangeRates, cat, "Unclassified").map((a) => ({
      label: a.label,
      pct: Math.round(a.percent * 100) / 100,
    })),
  );

  const estimated = computeEstimatedDividends(holdings, quotes, exchangeRates);
  const totalEstimatedEUR = computeTotalEstimatedEUR(estimated);
  const portfolioYield = totalValue > 0 ? (totalEstimatedEUR / totalValue) * 100 : 0;

  const totalCashEUR = cashEntries.reduce((s, c) => s + c.amountEUR, 0);
  const cashPct = totalValue > 0 ? (totalCashEUR / totalValue) * 100 : 0;

  const weights = holdingSummaries.map((h) => h.weightPct / 100);
  const hhi = weights.reduce((s, w) => s + w * w, 0);
  const sortedWeights = [...weights].sort((a, b) => b - a);

  return {
    holdingsCount: holdings.length,
    totalValueEUR: Math.round(totalValue * 100) / 100,
    totalCostEUR: Math.round(totals.totalCostEUR * 100) / 100,
    totalGainLossPct: Math.round(totals.totalGainLossPercent * 100) / 100,
    dayChangePct: totals.totalCurrentEUR > 0
      ? Math.round((totals.dayGainLossEUR / totals.totalCurrentEUR) * 10000) / 100
      : 0,
    cashAllocationPct: Math.round(cashPct * 100) / 100,
    holdings: holdingSummaries.slice(0, 30),
    sectorAllocation: sectorAlloc,
    regionAllocation: regionAlloc,
    typeAllocation: typeAlloc,
    dividends: {
      estimatedAnnualEUR: Math.round(totalEstimatedEUR * 100) / 100,
      portfolioYield: Math.round(portfolioYield * 100) / 100,
      payingCount: estimated.length,
    },
    concentrationMetrics: {
      top1WeightPct: Math.round((sortedWeights[0] ?? 0) * 10000) / 100,
      top5WeightPct: Math.round(sortedWeights.slice(0, 5).reduce((s, w) => s + w, 0) * 10000) / 100,
      herfindahlIndex: Math.round(hhi * 10000) / 10000,
      positionCount: holdings.length,
    },
  };
}

/* ── Prompt builder ──────────────────────────────────────── */

export function buildScorePrompt(payload: ScorePayload, language: string): { system: string; user: string } {
  const system = `You are an expert portfolio analyst scoring retail investment portfolios. You evaluate four dimensions on a 0-10 scale and produce an overall score also on a 0-10 scale.

CRITICAL: Always reference SPECIFIC ticker symbols, stock names, sector names, region names, and exact percentages from the portfolio data. Never give generic advice — every observation must cite actual data.

Scoring rubric:
- **Diversification (0-10)**: Evaluate sector spread, geographic spread, asset type mix, number of positions, and concentration (HHI). Single-stock dominance (>20%) is heavily penalized. Fewer than 5 positions is weak. Good: 10+ positions across 5+ sectors and 3+ regions. In details, list specific sectors/regions that are over/underrepresented.
- **Risk (0-10)**: Assess portfolio volatility — concentration risk (name the stocks), proximity of positions to 52-week highs (overvalued risk), cash buffer adequacy, and asset type risk levels (crypto = higher risk). Name the riskiest positions.
- **Costs (0-10)**: Evaluate the mix of ETFs (low cost) vs individual stocks (higher implied trading costs). Heavy ETF portfolios score higher. Crypto and many small positions imply higher costs. Name specific ETFs vs stocks and their cost implications.
- **Macroeconomics (0-10)**: Assess positioning for current macro conditions — geographic diversification vs home bias (name the dominant regions), currency exposure, sector positioning relative to economic cycles (name cyclical vs defensive sectors in the portfolio), and interest-rate sensitivity.

Overall score = weighted average of the four sub-scores on the same 0-10 scale: Diversification 30%, Risk 30%, Costs 15%, Macroeconomics 25%. The result must be 0-10, NOT 0-100.

Labels must be one of: "Excellent" (8-10), "Good" (6-7.9), "Medium" (4-5.9), "Room for Improvement" (2-3.9), "Poor" (0-1.9).

CRITICAL FOR WEAK CATEGORIES (score ≤ 6, i.e. Medium or worse):
- "weaknesses" MUST list 2-4 specific reasons WHY the score is low. Each reason must cite concrete data: "Technology sector at 58% dominates the portfolio vs a healthy 20-25% benchmark", "3 of 12 positions are in the same industry (AAPL, MSFT, GOOGL)".
- "improvements" MUST list 2-4 actionable steps to raise the score. Each step must be specific: "Sell 50% of AAPL position (currently 25%) and reallocate to a healthcare ETF like XLV", "Add an emerging markets ETF (e.g. VWO) to reduce the 85% US home bias to below 70%".
- For categories with score > 6, both "weaknesses" and "improvements" must be empty arrays [].
- The goal is that the user understands EXACTLY what is dragging the score down and EXACTLY what to do about it.

For sectorInsights: list the top 5 sectors from the portfolio data with their actual allocation percentage and assess each as overweight/underweight/balanced relative to a diversified benchmark.

For regionInsights: list all regions from the portfolio data with their actual allocation percentage and assess geographic concentration or diversification.

For topConcentrationRisks: list every position with weight > 8% and explain the specific risk (sector dominance, single-company risk, etc.).

For recommendations: provide 3-5 SPECIFIC recommendations. Each must reference actual ticker symbols or sector names from the portfolio. E.g. "Reduce AAPL from 25% to below 10% — it creates excessive Technology sector concentration" NOT "Reduce single-stock concentration".

Write all text in ${language}. The disclaimer must state this is AI-generated analysis, not personalized financial advice.

Respond ONLY with the JSON object matching the required schema.`;

  const user = `Score this portfolio:\n\n${JSON.stringify(payload, null, 2)}`;

  return { system, user };
}
