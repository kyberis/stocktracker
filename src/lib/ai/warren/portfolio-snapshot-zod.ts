import { z } from "zod";

/** Strict Zod schema for client-supplied Warren portfolio snapshots (no .passthrough). */
const topHoldingRowSchema = z
  .object({
    ticker: z.string(),
    name: z.string().optional(),
    shares: z.number().optional(),
    currentPrice: z.number().optional(),
    purchasePrice: z.number().optional(),
    currency: z.string().optional(),
    value: z.number(),
    weight: z.number(),
    sector: z.string().optional(),
    region: z.string().optional(),
    assetType: z.string().optional(),
    dayChangePct: z.number().optional(),
    totalGainPct: z.number().optional(),
    fiftyTwoWeekHigh: z.number().optional(),
    fiftyTwoWeekLow: z.number().optional(),
    trailingAnnualDividendPerShare: z.number().optional(),
    dividendYield: z.number().optional(),
    estimatedAnnualDividend: z.number().optional(),
    dividendCurrency: z.string().optional(),
  })
  .strict();

export const warrenPortfolioSnapshotSchema = z
  .object({
    baseCurrency: z.string(),
    totals: z
      .object({
        value: z.number(),
        cost: z.number(),
        gainLoss: z.number(),
        gainLossPct: z.number(),
        dayChange: z.number(),
      })
      .strict(),
    holdingsCount: z.number(),
    topHoldings: z.array(topHoldingRowSchema),
    allocation: z.array(z.object({ type: z.string(), pct: z.number() }).strict()),
    cashSummary: z.record(z.string(), z.number()),
    dividends: z
      .object({
        totalEstimatedAnnualEUR: z.number(),
        portfolioYield: z.number(),
        payingHoldings: z.number(),
      })
      .strict()
      .optional(),
    goals: z.array(z.object({ name: z.string(), target: z.number(), progress: z.number() }).strict()).optional(),
  })
  .strict()
  .optional();

export type WarrenPortfolioSnapshotParsed = z.infer<typeof warrenPortfolioSnapshotSchema>;
