import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { getDividendSummaryForUser } from "@/lib/services/dividend-summary";
import { listTransactionsForUser } from "@/lib/services/transactions-list";
import { MCP_READ_ONLY } from "@/lib/mcp/mcp-tool-annotations";
import { fromServiceResult, gateMcpTool } from "@/lib/mcp/mcp-helpers";

export function registerActivityMcp(server: McpServer): void {
  server.registerTool(
    "listTransactions",
    {
      title: "List transactions",
      description: "Portfolio transactions (buy, sell, dividend, fee) with optional filters.",
      inputSchema: {
        portfolioId: z.string().optional(),
        holdingId: z.string().optional(),
        type: z.enum(["buy", "sell", "dividend", "fee"]).optional(),
        since: z.string().optional().describe("ISO timestamp — only txs created on or after"),
        limit: z.number().int().min(1).max(500).optional(),
      },
      annotations: MCP_READ_ONLY,
    },
    async (opts, extra) => {
      const gate = gateMcpTool(extra, "listTransactions");
      if (!gate.ok) return gate.response;
      return fromServiceResult(await listTransactionsForUser(gate.userId, opts));
    },
  );

  server.registerTool(
    "getDividendSummary",
    {
      title: "Dividend summary",
      description:
        "Estimated forward dividend income from holdings (Yahoo) plus received dividend transactions by year. Not tax advice.",
      inputSchema: {
        portfolioId: z.string().optional(),
        baseCurrency: z.string().max(4).optional(),
      },
      annotations: MCP_READ_ONLY,
    },
    async (opts, extra) => {
      const gate = gateMcpTool(extra, "getDividendSummary");
      if (!gate.ok) return gate.response;
      return fromServiceResult(await getDividendSummaryForUser(gate.userId, opts));
    },
  );
}
