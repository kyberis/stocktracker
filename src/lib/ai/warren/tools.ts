import { tool } from "ai";
import { z } from "zod";
import { randomUUID } from "crypto";

import {
  listAlerts,
  listHoldings as dbListHoldings,
  listCashEntries,
  listWatchlist as dbListWatchlist,
  listPortfolios as dbListPortfolios,
  getMoatCache,
  queryMoatCache,
} from "@/lib/db";
import { createProvider } from "@/lib/api-providers";
import type { WarrenPart, WarrenProposal, StockSnapshotData } from "./types";
import type {
  HoldingCardData,
  AllocationCardData,
  SummaryCardData,
  MoatSummaryCardData,
  StockPickCardData,
} from "@/components/chat-cards/types";
import { searchKnowledge } from "./knowledge";
import type { OfficeIdentity } from "@/lib/ai/office/office-identity";
import { buildSisterAgentTools, sisterAgentToolsEnabled } from "./sister-agent-tools";
import { rankPortfolioNewsForTickers } from "@/lib/portfolio-news-rank";
import { derivePortfolioNewsTickersFromHoldings } from "@/lib/portfolio-news-tickers";
import {
  listPortfolioNewsForTickers,
  normalizePortfolioNewsSymbol,
} from "@/lib/db/portfolio-news";

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
    trailingAnnualDividendPerShare?: number;
    dividendYield?: number;
    estimatedAnnualDividend?: number;
    dividendCurrency?: string;
  }>;
  allocation: Array<{ type: string; pct: number }>;
  cashSummary: Record<string, number>;
  /** Optional: included when the snapshot is built for Portfolio AI chat. */
  dividends?: {
    totalEstimatedAnnualEUR: number;
    portfolioYield: number;
    payingHoldings: number;
  };
  goals?: Array<{ name: string; target: number; progress: number }>;
}

export interface WarrenToolContext {
  userId: string;
  isDemo: boolean;
  activePortfolioId?: string;
  baseCurrency: string;
  /** ISO 639-1 language hint — used to prefer ES titles in knowledge hits. */
  language?: string;
  snapshot?: PortfolioSnapshot;
  /** Unified IdP identity for Clara / Will sister-app calls. */
  officeIdentity?: OfficeIdentity | null;
  emitPart: (part: WarrenPart) => void;
  emitProposal: (proposal: WarrenProposal) => void;
  emitStep: (label: string) => void;
  /** Office UI: show Warren → Clara/Will coordination lines when sister tools run. */
  emitSisterCoordination?: (line: { from: "warren"; to: "clara" | "will"; summary: string }) => void;
  /** Office UI: optional direct Clara/Will chat bubbles. */
  emitSisterAgentMessage?: (role: "clara" | "will", content: string) => void;
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

export function buildWarrenTools(ctx: WarrenToolContext) {
  const sisterTools = sisterAgentToolsEnabled(ctx) ? buildSisterAgentTools(ctx) : {};

  return {
    ...sisterTools,
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
        "List all holdings in the user's active portfolio with their ticker, shares, current price, day change, and total return. Use when the user asks about a specific position ('how much AAPL do I own').",
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

    getHoldingsNews: tool({
      description:
        "Load recent news headlines linked to the user's portfolio holdings (same stored feed as Portfolio News in the app). Use when the user asks about news, headlines, what's happening with their stocks, sector stories, or press coverage tied to their positions. Returns titles, sources, dates, short excerpts, and related tickers. After calling, reply with 2-4 short bullet points summarizing themes (not individual article dumps unless asked). Neutral tone; no buy/sell recommendations.",
      inputSchema: z.object({
        maxArticles: z
          .number()
          .int()
          .min(5)
          .max(25)
          .optional()
          .describe("Maximum headlines to return (default 15)."),
      }),
      execute: async ({ maxArticles }) => {
        ctx.emitStep("Loading portfolio news…");
        if (ctx.isDemo) {
          return {
            articles: [] as const,
            note: "Demo mode has no live portfolio news cache.",
          };
        }
        const holdings = await dbListHoldings(ctx.userId, ctx.activePortfolioId);
        const tickers = derivePortfolioNewsTickersFromHoldings(holdings);
        if (tickers.length === 0) {
          return {
            articles: [] as const,
            note:
              holdings.length === 0
                ? "No holdings in this portfolio — add positions to see related news."
                : "No suitable equity tickers for news matching (e.g. unsupported symbols).",
          };
        }
        const norm = tickers.map(normalizePortfolioNewsSymbol);
        const fromDb = await listPortfolioNewsForTickers(norm, 500);
        const ranked = rankPortfolioNewsForTickers(fromDb, tickers);
        const limit = maxArticles ?? 15;
        const slice = ranked.slice(0, limit);
        if (slice.length === 0) {
          return {
            articles: [] as const,
            coverageTickers: tickers,
            note:
              "No cached headlines yet for these symbols. Opening Portfolio News in the app once refreshes the feed when data providers are configured.",
          };
        }
        return {
          articles: slice.map((a) => ({
            title: a.title,
            source: a.source,
            publishedAt: a.publishedAt,
            excerpt: (a.summary || "").slice(0, 400),
            tickers: [...new Set(a.tickerSentiment.map((t) => t.ticker))].slice(0, 10),
            sentiment: a.overallSentiment || undefined,
          })),
          coverageTickers: tickers,
          replyHint:
            "Summarize in 2-4 bullet points in the user's language: main themes tied to their holdings; mention tickers only when helpful; not investment advice.",
        };
      },
    }),

    listPortfolios: tool({
      description:
        "List all portfolios the user owns (id, name, base currency, default flag). Call this when you need to know which portfolio to act on, or when the user asks 'what portfolios do I have?'.",
      inputSchema: z.object({}),
      execute: async () => {
        ctx.emitStep("Reading portfolios…");
        const portfolios = await dbListPortfolios(ctx.userId);
        return portfolios.map((p) => ({
          id: p.id,
          name: p.name,
          currency: p.currency,
          isDefault: p.isDefault,
          isActive: p.id === ctx.activePortfolioId,
        }));
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

    renderStockPickCard: tool({
      description:
        "Display a stock pick card (ticker, optional price and short thesis note). Use for screener results or investment ideas.",
      inputSchema: z.object({
        ticker: z.string().min(1).max(20),
        name: z.string().optional(),
        currentPrice: z.number().optional(),
        currency: z.string().optional(),
        note: z.string().max(200).optional(),
      }),
      execute: async (input) => {
        const data: StockPickCardData = {
          ticker: input.ticker.toUpperCase(),
          name: input.name,
          currentPrice: input.currentPrice,
          currency: input.currency,
          note: input.note,
        };
        ctx.emitPart({ kind: "stockPick", data });
        return { rendered: "stock-pick", ticker: data.ticker };
      },
    }),

    renderMoatSummaryCard: tool({
      description:
        "Display a compact moat evaluation card (score %, verdict, P/E, criteria pass count). Use after getMoatEvaluation or when summarizing a company's competitive moat.",
      inputSchema: z.object({
        ticker: z.string().min(1).max(20),
        companyName: z.string().optional(),
        scorePct: z.number().min(0).max(100),
        verdict: z.string().min(1).max(80),
        peRatio: z.number().nullable().optional(),
        passedCount: z.number().int().min(0),
        criteriaCount: z.number().int().min(1),
        sector: z.string().optional(),
      }),
      execute: async (input) => {
        const data: MoatSummaryCardData = {
          ticker: input.ticker.toUpperCase(),
          companyName: input.companyName,
          scorePct: input.scorePct,
          verdict: input.verdict,
          peRatio: input.peRatio,
          passedCount: input.passedCount,
          criteriaCount: input.criteriaCount,
          sector: input.sector,
        };
        ctx.emitPart({ kind: "moatSummary", data });
        return { rendered: "moat-summary", ticker: data.ticker };
      },
    }),

    getMoatEvaluation: tool({
      description:
        "Load cached Buffett-style moat evaluation for a ticker (8 criteria, score %, verdict, P/E). Use when the user asks about a company's moat, competitive advantage, or moat analysis.",
      inputSchema: z.object({
        ticker: z.string().min(1).max(20),
      }),
      execute: async ({ ticker }) => {
        ctx.emitStep(`Loading moat evaluation for ${ticker.toUpperCase()}…`);
        const hit = await getMoatCache(ticker.toUpperCase(), 30);
        if (!hit) {
          return {
            found: false,
            note: "No cached moat data for this ticker. It may not be synced yet — suggest Tools → Moat evaluation for a live run.",
          };
        }
        return {
          found: true,
          symbol: hit.symbol,
          companyName: hit.companyName,
          sector: hit.sector,
          scorePct: hit.scorePct,
          verdict: hit.verdict,
          passedCount: hit.passedCount,
          criteriaCount: hit.criteriaCount,
          peRatio: hit.peRatio,
          updatedAt: hit.updatedAt,
          tip: "Call renderMoatSummaryCard to show a visual card, then explain 1-2 key criteria in prose.",
        };
      },
    }),

    screenMoatStocks: tool({
      description:
        "PRIMARY tool for moat screener / stock ideas requests (e.g. 'ideas del moat screener', 'P/E bajo 15', 'wide moat stocks'). Screens cached moat evaluations with P/E, score, market cap filters. Always follow with renderMoatSummaryCard or renderStockPickCard for top picks.",
      inputSchema: z.object({
        peMax: z.number().positive().optional().describe("Max P/E (default 15)"),
        scoreMin: z.number().min(0).max(100).optional().describe("Min moat score % (default 60)"),
        marketCapMax: z.number().positive().optional().describe("Max market cap in provider units (often USD)"),
        limit: z.number().int().min(1).max(15).optional(),
        sortBy: z.enum(["score", "pe", "marketCap"]).optional(),
      }),
      execute: async (input) => {
        ctx.emitStep("Screening moat database…");
        const result = await queryMoatCache({
          peMax: input.peMax ?? 15,
          scoreMin: input.scoreMin ?? 60,
          marketCapMax: input.marketCapMax,
          limit: input.limit ?? 8,
          sortBy: input.sortBy ?? "score",
          sortDir: "desc",
          page: 1,
        });
        return {
          total: result.total,
          results: result.results.map((r) => ({
            symbol: r.symbol,
            companyName: r.companyName,
            scorePct: r.scorePct,
            verdict: r.verdict,
            peRatio: r.peRatio,
            price: r.price,
            currency: r.currency,
            marketCap: r.marketCap,
            passedCount: r.passedCount,
            criteriaCount: r.criteriaCount,
            sector: r.sector,
          })),
          tip: "Pick 2-3 standouts and call renderMoatSummaryCard or renderStockPickCard for each. Not financial advice.",
        };
      },
    }),

    // ──────────────── KNOWLEDGE ────────────────
    searchInvestingKnowledge: tool({
      description:
        "Search Warren's curated library of value-investing concepts, metrics, asset types, risks, and behavioral pitfalls. Use this when the user asks an EDUCATIONAL question (\"what is P/E?\", \"how does diversification work?\", \"what is margin of safety?\", \"explain drawdown\") rather than a portfolio-specific one. Returns up to 3 short entries with title, summary, and an excerpt — paraphrase them in your own voice; never quote authors by name.",
      inputSchema: z.object({
        query: z
          .string()
          .min(2)
          .max(120)
          .describe("Natural-language query, e.g. \"what is margin of safety\""),
        k: z
          .number()
          .int()
          .min(1)
          .max(5)
          .optional()
          .describe("Max number of entries to return (default 3)."),
      }),
      execute: async ({ query, k }) => {
        ctx.emitStep(`Looking up "${query}"…`);
        const hits = searchKnowledge(query, k ?? 3, ctx.language);
        if (hits.length === 0) {
          return { hits: [], note: "No matching entry — answer from general knowledge but stay cautious." };
        }
        return {
          hits: hits.map((h) => ({
            slug: h.slug,
            title: h.title,
            summary: h.summary,
            excerpt: h.excerpt,
            tags: h.tags,
          })),
        };
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
