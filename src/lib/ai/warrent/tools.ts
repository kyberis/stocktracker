import { tool } from "ai";
import { z } from "zod";
import { randomUUID } from "crypto";

import {
  listAlerts,
  listHoldings as dbListHoldings,
  listCashEntries,
  listWatchlist as dbListWatchlist,
} from "@/lib/db";
import { createProvider } from "@/lib/api-providers";
import type { WarrentPart, WarrentProposal, StockSnapshotData } from "./types";
import type {
  HoldingCardData,
  AllocationCardData,
  SummaryCardData,
} from "@/components/chat-cards/types";

export interface PortfolioSnapshot {
  baseCurrency: string;
  totals: {
    value: number;
    cost: number;
    gainLoss: number;
    gainLossPct: number;
    dayChange: number;
  };
  holdingsCount: number;
  topHoldings: Array<{
    ticker: string;
    name?: string;
    shares?: number;
    currentPrice?: number;
    purchasePrice?: number;
    currency?: string;
    value: number;
    weight: number;
    sector?: string;
    region?: string;
    assetType?: string;
    dayChangePct?: number;
    totalGainPct?: number;
    fiftyTwoWeekHigh?: number;
    fiftyTwoWeekLow?: number;
  }>;
  allocation: Array<{ type: string; pct: number }>;
  cashSummary: Record<string, number>;
}

export interface WarrentToolContext {
  userId: string;
  isDemo: boolean;
  activePortfolioId?: string;
  baseCurrency: string;
  snapshot?: PortfolioSnapshot;
  emitPart: (part: WarrentPart) => void;
  emitProposal: (proposal: WarrentProposal) => void;
  emitStep: (label: string) => void;
}

const ALLOC_COLORS: Record<string, string> = {
  Stocks: "#6366f1",
  ETFs: "#10b981",
  Crypto: "#f59e0b",
  Cash: "#1e293b",
  "Real Estate": "#3b82f6",
  Savings: "#06b6d4",
  Pension: "#8b5cf6",
};

export function buildWarrentTools(ctx: WarrentToolContext) {
  return {
    // ──────────────── READ TOOLS ────────────────
    getPortfolioSummary: tool({
      description:
        "Get a summary of the user's active portfolio: total value, gain/loss, day change, holdings count, top holdings, and allocation breakdown. Use this whenever the user asks about overall portfolio state.",
      inputSchema: z.object({}),
      execute: async () => {
        ctx.emitStep("Reading your portfolio…");
        if (!ctx.snapshot) return { error: "No portfolio snapshot available." };
        return ctx.snapshot;
      },
    }),

    listHoldings: tool({
      description:
        "List all holdings in the user's active portfolio with their ticker, shares, current price, day change, and total return.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(100).optional().describe("Max number of holdings to return"),
      }),
      execute: async ({ limit }) => {
        ctx.emitStep("Listing holdings…");
        const holdings = await dbListHoldings(ctx.userId, ctx.activePortfolioId);
        const slice = limit ? holdings.slice(0, limit) : holdings;
        return slice.map((h) => ({
          id: h.id,
          ticker: h.ticker,
          name: h.name,
          shares: h.shares,
          purchasePrice: h.purchasePrice,
          currency: h.displayCurrency,
          sector: h.sector,
          region: h.region,
          assetType: h.assetType,
        }));
      },
    }),

    listAlerts: tool({
      description: "List the user's active price alerts.",
      inputSchema: z.object({}),
      execute: async () => {
        ctx.emitStep("Reading alerts…");
        return listAlerts(ctx.userId);
      },
    }),

    listCash: tool({
      description: "List the user's cash entries in the active portfolio.",
      inputSchema: z.object({}),
      execute: async () => {
        ctx.emitStep("Reading cash positions…");
        return listCashEntries(ctx.userId, ctx.activePortfolioId);
      },
    }),

    listWatchlist: tool({
      description: "List tickers in the user's watchlist.",
      inputSchema: z.object({}),
      execute: async () => {
        ctx.emitStep("Reading watchlist…");
        return dbListWatchlist(ctx.userId);
      },
    }),

    getQuote: tool({
      description:
        "Get the current quote for one or more tickers from Yahoo Finance: price, day change percent, currency, 52-week high/low.",
      inputSchema: z.object({
        tickers: z.array(z.string().min(1).max(20)).min(1).max(10),
      }),
      execute: async ({ tickers }) => {
        ctx.emitStep(`Fetching quotes for ${tickers.join(", ")}…`);
        const provider = createProvider("yahoo");
        const results = await Promise.all(
          tickers.map(async (t) => {
            try {
              const q = await provider.getQuote(t);
              return {
                ticker: t,
                price: q.regularMarketPrice,
                changePct: q.regularMarketChangePercent,
                currency: q.currency,
                fiftyTwoWeekHigh: q.fiftyTwoWeekHigh,
                fiftyTwoWeekLow: q.fiftyTwoWeekLow,
                name: q.shortName,
              };
            } catch {
              return { ticker: t, error: "Quote unavailable" };
            }
          }),
        );
        return results;
      },
    }),

    // ──────────────── RENDER TOOLS ────────────────
    renderHoldingCard: tool({
      description:
        "Display a holding card visually in the chat for one ticker. Use this when describing a single position to the user.",
      inputSchema: z.object({
        ticker: z.string(),
        name: z.string().optional(),
        shares: z.number().optional(),
        avgPrice: z.number().optional(),
        currentPrice: z.number().optional(),
        currency: z.string().optional(),
        changePct: z.number().optional(),
      }),
      execute: async (input) => {
        const data: HoldingCardData = { ...input, privacy: "full" };
        ctx.emitPart({ kind: "holding", data });
        return { rendered: "holding-card", ticker: input.ticker };
      },
    }),

    renderAllocationCard: tool({
      description:
        "Display an allocation breakdown card visually (horizontal bar + legend). Use when the user asks about their allocation.",
      inputSchema: z.object({
        items: z
          .array(
            z.object({
              label: z.string(),
              pct: z.number().min(0).max(100),
              color: z.string().optional(),
            }),
          )
          .min(1)
          .max(10),
        totalValue: z.number().optional(),
        currency: z.string().optional(),
      }),
      execute: async (input) => {
        const items = input.items.map((it) => ({
          label: it.label,
          pct: it.pct,
          color: it.color || ALLOC_COLORS[it.label] || "#94a3b8",
        }));
        const data: AllocationCardData = {
          items,
          totalValue: input.totalValue,
          currency: input.currency || ctx.baseCurrency,
          privacy: "full",
        };
        ctx.emitPart({ kind: "allocation", data });
        return { rendered: "allocation-card", count: items.length };
      },
    }),

    renderSummaryCard: tool({
      description:
        "Display a portfolio summary card visually (total value, day change, top holdings). Use when answering 'how is my portfolio?' style questions.",
      inputSchema: z.object({
        totalValue: z.number().optional(),
        dayChange: z.number().optional(),
        dayChangePct: z.number().optional(),
        holdingsCount: z.number().int().min(0),
        topHoldings: z
          .array(z.object({ ticker: z.string(), pct: z.number() }))
          .max(10)
          .optional(),
        currency: z.string().optional(),
      }),
      execute: async (input) => {
        const data: SummaryCardData = {
          ...input,
          currency: input.currency || ctx.baseCurrency,
          privacy: "full",
        };
        ctx.emitPart({ kind: "summary", data });
        return { rendered: "summary-card" };
      },
    }),

    renderStockSnapshot: tool({
      description:
        "Display a compact snapshot card for a ticker (price, change, 52-week range). Use when the user asks about a specific stock.",
      inputSchema: z.object({
        ticker: z.string(),
        name: z.string().optional(),
        price: z.number().optional(),
        currency: z.string().optional(),
        changePct: z.number().optional(),
        fiftyTwoWeekHigh: z.number().optional(),
        fiftyTwoWeekLow: z.number().optional(),
      }),
      execute: async (input) => {
        const data: StockSnapshotData = input;
        ctx.emitPart({ kind: "stockSnapshot", data });
        return { rendered: "stock-snapshot", ticker: input.ticker };
      },
    }),

    // ──────────────── WRITE PROPOSALS ────────────────
    proposeAddHolding: tool({
      description:
        "Propose adding a new holding (or buying more shares of an existing one). The user will see a confirmation card and must approve before anything is saved.",
      inputSchema: z.object({
        ticker: z.string().min(1).max(20),
        name: z.string().optional(),
        shares: z.number().positive(),
        purchasePrice: z.number().nonnegative(),
        displayCurrency: z.string().min(3).max(4).default("EUR"),
      }),
      execute: async (input) => {
        if (ctx.isDemo) return demoBlocked("propose new holdings");
        const id = randomUUID();
        const total = input.shares * input.purchasePrice;
        ctx.emitProposal({
          id,
          kind: "addHolding",
          title: `Add ${input.shares} × ${input.ticker.toUpperCase()} @ ${input.purchasePrice.toFixed(2)} ${input.displayCurrency}`,
          summary: `Buy ${input.shares} shares of ${input.ticker.toUpperCase()} at ${input.purchasePrice.toFixed(2)} ${input.displayCurrency}.`,
          rows: [
            { label: "Ticker", value: input.ticker.toUpperCase() },
            { label: "Shares", value: String(input.shares) },
            { label: "Price", value: `${input.purchasePrice.toFixed(2)} ${input.displayCurrency}` },
            { label: "Total", value: `${total.toFixed(2)} ${input.displayCurrency}` },
          ],
          data: {
            ticker: input.ticker.toUpperCase(),
            name: input.name,
            shares: input.shares,
            purchasePrice: input.purchasePrice,
            displayCurrency: input.displayCurrency,
            portfolioId: ctx.activePortfolioId,
          },
        });
        return {
          proposalId: id,
          status: "awaiting_user_confirmation",
          tip: "I prepared the proposal. Tell the user to confirm it on the card.",
        };
      },
    }),

    proposeRemoveHolding: tool({
      description:
        "Propose removing a holding by id. Destructive: deletes the position and its transactions in this portfolio. The user must confirm.",
      inputSchema: z.object({
        holdingId: z.string().min(1),
        ticker: z.string().min(1).optional(),
      }),
      execute: async (input) => {
        if (ctx.isDemo) return demoBlocked("remove holdings");
        const id = randomUUID();
        ctx.emitProposal({
          id,
          kind: "removeHolding",
          destructive: true,
          title: `Remove ${input.ticker || "holding"}`,
          summary: "This will delete the position and its transactions in this portfolio.",
          rows: [
            { label: "Holding id", value: input.holdingId.slice(0, 8) + "…" },
            { label: "Reversible", value: "No" },
          ],
          data: { holdingId: input.holdingId, portfolioId: ctx.activePortfolioId },
        });
        return { proposalId: id, status: "awaiting_user_confirmation" };
      },
    }),

    proposeAddCash: tool({
      description: "Propose adding a cash entry (or other manual asset like savings/pension/real estate).",
      inputSchema: z.object({
        name: z.string().min(1).max(100),
        amountEUR: z.number().positive(),
        type: z.enum(["cash", "savings", "pension", "real_estate"]).optional(),
        displayCurrency: z.string().min(3).max(4).optional(),
      }),
      execute: async (input) => {
        if (ctx.isDemo) return demoBlocked("add cash");
        const id = randomUUID();
        ctx.emitProposal({
          id,
          kind: "addCash",
          title: `Add ${input.type || "cash"}: ${input.name}`,
          summary: `Add ${input.name} to your portfolio.`,
          rows: [
            { label: "Name", value: input.name },
            { label: "Amount", value: `€${input.amountEUR.toFixed(2)}` },
            { label: "Type", value: input.type || "cash" },
          ],
          data: { ...input, portfolioId: ctx.activePortfolioId },
        });
        return { proposalId: id, status: "awaiting_user_confirmation" };
      },
    }),

    proposeCreateAlert: tool({
      description:
        "Propose a price alert. Use `condition: 'above'` for upside alerts and `'below'` for downside. For percent-based alerts, set alertType: 'percent_change' and percentValue (e.g. -5 for a 5% drop).",
      inputSchema: z.object({
        ticker: z.string().min(1).max(20),
        condition: z.enum(["above", "below"]),
        threshold: z.number(),
        alertType: z.enum(["threshold", "percent_change"]).default("threshold"),
        percentBasis: z.enum(["daily", "purchase"]).optional(),
        percentValue: z.number().optional(),
        currency: z.string().optional(),
      }),
      execute: async (input) => {
        if (ctx.isDemo) return demoBlocked("create alerts");
        const id = randomUUID();
        const isPct = input.alertType === "percent_change";
        ctx.emitProposal({
          id,
          kind: "createAlert",
          title: isPct
            ? `${input.ticker.toUpperCase()} ${input.percentValue ?? 0}% ${input.condition === "above" ? "rise" : "drop"}`
            : `${input.ticker.toUpperCase()} ${input.condition} ${input.threshold} ${input.currency || ""}`.trim(),
          summary: "Notify you when the condition triggers.",
          rows: [
            { label: "Ticker", value: input.ticker.toUpperCase() },
            { label: "Type", value: isPct ? "Percent change" : "Price threshold" },
            { label: "Condition", value: input.condition },
            isPct
              ? { label: "Change", value: `${input.percentValue ?? 0}%` }
              : { label: "Threshold", value: `${input.threshold}${input.currency ? ` ${input.currency}` : ""}` },
          ],
          data: {
            ticker: input.ticker.toUpperCase(),
            condition: input.condition,
            threshold: input.threshold,
            alertType: input.alertType,
            percentBasis: input.percentBasis,
            percentValue: input.percentValue,
            currency: input.currency,
            portfolioId: ctx.activePortfolioId,
          },
        });
        return { proposalId: id, status: "awaiting_user_confirmation" };
      },
    }),

    proposeAddWatchlist: tool({
      description: "Propose adding a ticker to the user's watchlist.",
      inputSchema: z.object({
        ticker: z.string().min(1).max(20),
        name: z.string().optional(),
        exchange: z.string().optional(),
      }),
      execute: async (input) => {
        if (ctx.isDemo) return demoBlocked("modify the watchlist");
        const id = randomUUID();
        ctx.emitProposal({
          id,
          kind: "addWatchlist",
          title: `Watch ${input.ticker.toUpperCase()}`,
          summary: "Add to your watchlist.",
          rows: [
            { label: "Ticker", value: input.ticker.toUpperCase() },
            ...(input.name ? [{ label: "Name", value: input.name }] : []),
          ],
          data: {
            ticker: input.ticker.toUpperCase(),
            name: input.name,
            exchange: input.exchange,
          },
        });
        return { proposalId: id, status: "awaiting_user_confirmation" };
      },
    }),
  } as const;
}

function demoBlocked(action: string) {
  return {
    error: "demo_mode",
    message: `Demo mode is read-only — I cannot ${action}. Tell the user to sign up to act on their portfolio.`,
  };
}
