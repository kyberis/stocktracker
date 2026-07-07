import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { createProvider } from "@/lib/api-providers";
import { getPortfolioSummaryForUser } from "@/lib/services/portfolio-snapshot";
import { MCP_READ_ONLY } from "@/lib/mcp/mcp-tool-annotations";
import { fromServiceResult, gateMcpTool, jsonContent } from "@/lib/mcp/mcp-helpers";

export function registerPortfolioMcp(server: McpServer): void {
  server.registerTool(
    "getPortfolioSummary",
    {
      title: "Portfolio summary",
      description:
        "Live portfolio summary: totals, gain/loss, day change, top holdings, allocation, cash. Optional dividend estimates and savings goals. Uses Yahoo quotes (not stored DB values only).",
      inputSchema: {
        portfolioId: z.string().optional(),
        baseCurrency: z.string().max(4).optional(),
        includeDividends: z.boolean().optional(),
        includeGoals: z.boolean().optional(),
      },
      annotations: MCP_READ_ONLY,
    },
    async (opts, extra) => {
      const gate = gateMcpTool(extra, "getPortfolioSummary");
      if (!gate.ok) return gate.response;
      return fromServiceResult(
        await getPortfolioSummaryForUser(gate.userId, {
          portfolioId: opts.portfolioId,
          baseCurrency: opts.baseCurrency,
          includeDividends: opts.includeDividends,
          includeGoals: opts.includeGoals,
        }),
      );
    },
  );

  server.registerTool(
    "getQuotes",
    {
      title: "Stock quotes",
      description: "Current quotes from Yahoo Finance for up to 10 tickers (price, day change %, 52-week range).",
      inputSchema: {
        tickers: z.array(z.string().min(1).max(20)).min(1).max(10),
      },
      annotations: MCP_READ_ONLY,
    },
    async ({ tickers }, extra) => {
      const gate = gateMcpTool(extra, "getQuotes");
      if (!gate.ok) return gate.response;

      const provider = createProvider("yahoo");
      const results = await Promise.all(
        tickers.map(async (t) => {
          try {
            const q = await provider.getQuote(t);
            return {
              ticker: t.toUpperCase(),
              price: q.regularMarketPrice,
              changePct: q.regularMarketChangePercent,
              currency: q.currency,
              fiftyTwoWeekHigh: q.fiftyTwoWeekHigh,
              fiftyTwoWeekLow: q.fiftyTwoWeekLow,
              name: q.shortName,
            };
          } catch {
            return { ticker: t.toUpperCase(), error: "Quote unavailable" };
          }
        }),
      );
      return jsonContent(results);
    },
  );
}
