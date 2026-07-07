import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { listCashEntries, listHoldings, listPortfolios } from "@/lib/db";
import { registerActivityMcp } from "@/lib/mcp/activity-tools";
import { registerAnalysisMcp } from "@/lib/mcp/analysis-tools";
import { MCP_READ_ONLY } from "@/lib/mcp/mcp-tool-annotations";
import { gateMcpTool, jsonContent, mapHoldingForMcp } from "@/lib/mcp/mcp-helpers";
import { registerWarrenMoatMcp } from "@/lib/mcp/moat-tools";
import { registerPlanningMcp } from "@/lib/mcp/planning-tools";
import { registerPortfolioMcp } from "@/lib/mcp/portfolio-tools";

/** Read-only portfolio MCP tools; live quotes via getPortfolioSummary / getQuotes. */
export function registerTrefolioUserMcp(server: McpServer): void {
  registerWarrenMoatMcp(server);
  registerPortfolioMcp(server);
  registerActivityMcp(server);
  registerAnalysisMcp(server);
  registerPlanningMcp(server);

  server.registerTool(
    "listPortfolios",
    {
      title: "List portfolios",
      description: "Portfolios for the authenticated user.",
      inputSchema: {},
      annotations: MCP_READ_ONLY,
    },
    async (_args, extra) => {
      const gate = gateMcpTool(extra, "listPortfolios");
      if (!gate.ok) return gate.response;
      const rows = await listPortfolios(gate.userId);
      return jsonContent(
        rows.map((p) => ({
          id: p.id,
          name: p.name,
          currency: p.currency,
          isDefault: p.isDefault,
        })),
      );
    },
  );

  server.registerTool(
    "listHoldings",
    {
      title: "List holdings",
      description: "Holdings with stored EUR values (optional portfolio filter).",
      inputSchema: {
        portfolioId: z.string().optional(),
      },
      annotations: MCP_READ_ONLY,
    },
    async ({ portfolioId }, extra) => {
      const gate = gateMcpTool(extra, "listHoldings");
      if (!gate.ok) return gate.response;
      const holdings = await listHoldings(gate.userId, portfolioId);
      return jsonContent(holdings.map(mapHoldingForMcp));
    },
  );

  server.registerTool(
    "listCash",
    {
      title: "List cash entries",
      description: "Cash positions (optional portfolio filter).",
      inputSchema: {
        portfolioId: z.string().optional(),
      },
      annotations: MCP_READ_ONLY,
    },
    async ({ portfolioId }, extra) => {
      const gate = gateMcpTool(extra, "listCash");
      if (!gate.ok) return gate.response;
      const cash = await listCashEntries(gate.userId, portfolioId);
      return jsonContent(
        cash.map((c) => ({
          id: c.id,
          name: c.name,
          amountEUR: c.amountEUR,
          displayCurrency: c.displayCurrency,
          type: c.type,
        })),
      );
    },
  );
}
