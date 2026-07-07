import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { listAlerts, listWatchlist } from "@/lib/db";
import { getPortfolioNewsForUser } from "@/lib/services/portfolio-news";
import { screenStocksForUser } from "@/lib/services/screener-query";
import { MCP_READ_ONLY } from "@/lib/mcp/mcp-tool-annotations";
import { fromServiceResult, gateMcpTool, jsonContent } from "@/lib/mcp/mcp-helpers";

export function registerAnalysisMcp(server: McpServer): void {
  server.registerTool(
    "screenStocks",
    {
      title: "Stock screener",
      description:
        "Filter the cached stock universe (~600 symbols) by sector, P/E, dividend yield, market cap, etc. Consumes screener quota.",
      inputSchema: {
        sector: z.string().optional(),
        industry: z.string().optional(),
        divYieldMin: z.number().optional(),
        divYieldMax: z.number().optional(),
        peMin: z.number().optional(),
        peMax: z.number().optional(),
        marketCap: z.enum(["mega", "large", "mid", "small", "micro"]).optional(),
        exchange: z.string().optional(),
        country: z.string().optional(),
        sortBy: z.string().optional(),
        sortDir: z.enum(["asc", "desc"]).optional(),
        page: z.number().int().min(1).optional(),
        limit: z.number().int().min(1).max(50).optional(),
      },
      annotations: MCP_READ_ONLY,
    },
    async (filters, extra) => {
      const gate = gateMcpTool(extra, "screenStocks");
      if (!gate.ok) return gate.response;
      return fromServiceResult(await screenStocksForUser(gate.userId, filters));
    },
  );

  server.registerTool(
    "listAlerts",
    {
      title: "Price alerts",
      description: "Active price alerts for the authenticated user.",
      inputSchema: {},
      annotations: MCP_READ_ONLY,
    },
    async (_args, extra) => {
      const gate = gateMcpTool(extra, "listAlerts");
      if (!gate.ok) return gate.response;
      return jsonContent(await listAlerts(gate.userId));
    },
  );

  server.registerTool(
    "listWatchlist",
    {
      title: "Watchlist",
      description: "Tickers on the user's watchlist.",
      inputSchema: {},
      annotations: MCP_READ_ONLY,
    },
    async (_args, extra) => {
      const gate = gateMcpTool(extra, "listWatchlist");
      if (!gate.ok) return gate.response;
      return jsonContent(await listWatchlist(gate.userId));
    },
  );

  server.registerTool(
    "getPortfolioNews",
    {
      title: "Portfolio news",
      description:
        "Recent headlines linked to portfolio holdings (same cache as Portfolio News in the app). Summarize themes; not investment advice.",
      inputSchema: {
        portfolioId: z.string().optional(),
        maxArticles: z.number().int().min(5).max(25).optional(),
      },
      annotations: MCP_READ_ONLY,
    },
    async (opts, extra) => {
      const gate = gateMcpTool(extra, "getPortfolioNews");
      if (!gate.ok) return gate.response;
      return fromServiceResult(await getPortfolioNewsForUser(gate.userId, opts));
    },
  );
}
