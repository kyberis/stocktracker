import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { listCashEntries, listHoldings, listPortfolios } from "@/lib/db";
import { MCP_READ_ONLY } from "@/lib/mcp/mcp-tool-annotations";
import { registerWarrenMoatMcp } from "@/lib/mcp/moat-tools";

function jsonContent(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

function errContent(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true as const,
  };
}

function getUserIdFromExtra(extra: { authInfo?: { extra?: Record<string, unknown> } }) {
  const userId = extra.authInfo?.extra?.userId;
  return typeof userId === "string" && userId.length > 0 ? userId : null;
}

/** Read-only portfolio MCP tools (no live quote fetch — uses stored EUR values). */
export function registerTrefolioUserMcp(server: McpServer): void {
  registerWarrenMoatMcp(server);

  server.registerTool(
    "listPortfolios",
    {
      title: "List portfolios",
      description: "Portfolios for the authenticated user.",
      inputSchema: {},
      annotations: MCP_READ_ONLY,
    },
    async (_args, extra) => {
      const userId = getUserIdFromExtra(extra);
      if (!userId) return errContent("Unauthorized.");
      const rows = await listPortfolios(userId);
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
      const userId = getUserIdFromExtra(extra);
      if (!userId) return errContent("Unauthorized.");
      const holdings = await listHoldings(userId, portfolioId);
      return jsonContent(
        holdings.map((h) => ({
          id: h.id,
          name: h.name,
          ticker: h.ticker,
          shares: h.shares,
          displayCurrency: h.displayCurrency,
          valueInEUR: h.valueInEUR,
          assetType: h.assetType,
        })),
      );
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
      const userId = getUserIdFromExtra(extra);
      if (!userId) return errContent("Unauthorized.");
      const cash = await listCashEntries(userId, portfolioId);
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
