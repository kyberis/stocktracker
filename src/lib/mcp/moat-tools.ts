import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import {
  generateWarrenMoatNarrative,
  getWarrenMoatEvaluation,
  listWarrenMoatReports,
  saveWarrenMoatReport,
  screenWarrenMoat,
  type WarrenMoatResult,
} from "@/lib/services/warren-moat";
import { MCP_READ_ONLY, MCP_WRITE } from "@/lib/mcp/mcp-tool-annotations";

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

function fromResult<T>(result: WarrenMoatResult<T>) {
  if (result.ok) return jsonContent(result.data);
  return errContent(`${result.code}: ${result.error}`);
}

/** Warren MOAT tools — same PAT auth as portfolio tools; Pro quotas on fresh eval + AI narrative. */
export function registerWarrenMoatMcp(server: McpServer): void {
  server.registerTool(
    "getMoatEvaluation",
    {
      title: "Warren MOAT evaluation",
      description:
        "Buffett-framework competitive advantage score for a ticker. Uses cache by default; set fresh=true to fetch new fundamentals (consumes stock_evaluation quota).",
      inputSchema: {
        symbol: z.string().min(1).max(16),
        fresh: z.boolean().optional(),
      },
      annotations: MCP_READ_ONLY,
    },
    async ({ symbol, fresh }, extra) => {
      const userId = getUserIdFromExtra(extra);
      if (!userId) return errContent("Unauthorized.");
      return fromResult(await getWarrenMoatEvaluation(userId, symbol, { fresh: fresh === true }));
    },
  );

  server.registerTool(
    "generateMoatNarrative",
    {
      title: "Warren MOAT AI narrative",
      description:
        "Generate a Warren Buffett-style markdown narrative for a MOAT evaluation (consumes ai_consult quota). Pass evaluation from getMoatEvaluation or symbol-only to use cache.",
      inputSchema: {
        symbol: z.string().min(1).max(16).optional(),
        evaluation: z.record(z.string(), z.unknown()).optional(),
        language: z.string().max(8).optional(),
      },
      annotations: MCP_READ_ONLY,
    },
    async ({ symbol, evaluation, language }, extra) => {
      const userId = getUserIdFromExtra(extra);
      if (!userId) return errContent("Unauthorized.");

      let evalData = evaluation;
      if (!evalData && symbol) {
        const fetched = await getWarrenMoatEvaluation(userId, symbol, { fresh: false });
        if (!fetched.ok) return fromResult(fetched);
        evalData = fetched.data;
      }
      if (!evalData) {
        return errContent("Provide evaluation or symbol.");
      }

      return fromResult(
        await generateWarrenMoatNarrative(userId, evalData, language || "en"),
      );
    },
  );

  server.registerTool(
    "listMoatReports",
    {
      title: "List saved MOAT reports",
      description: "User's saved Warren MOAT reports (optional tag filter).",
      inputSchema: {
        tags: z.array(z.string()).optional(),
      },
      annotations: MCP_READ_ONLY,
    },
    async ({ tags }, extra) => {
      const userId = getUserIdFromExtra(extra);
      if (!userId) return errContent("Unauthorized.");
      return fromResult(await listWarrenMoatReports(userId, tags));
    },
  );

  server.registerTool(
    "screenMoat",
    {
      title: "MOAT screener",
      description: "Filter cached MOAT evaluations (read-only universe cache).",
      inputSchema: {
        scoreMin: z.number().optional(),
        scoreMax: z.number().optional(),
        verdict: z.string().optional(),
        sector: z.string().optional(),
        peMax: z.number().optional(),
        marketCapMax: z.number().optional(),
        page: z.number().int().min(1).optional(),
        limit: z.number().int().min(1).max(50).optional(),
      },
      annotations: MCP_READ_ONLY,
    },
    async (filters, extra) => {
      const userId = getUserIdFromExtra(extra);
      if (!userId) return errContent("Unauthorized.");
      return fromResult(
        await screenWarrenMoat(userId, {
          ...filters,
          sortBy: "score",
          sortDir: "desc",
          page: filters.page ?? 1,
          limit: filters.limit ?? 20,
        }),
      );
    },
  );

  server.registerTool(
    "saveMoatReport",
    {
      title: "Save MOAT report",
      description: "Persist a MOAT evaluation to the user's saved reports.",
      inputSchema: {
        symbol: z.string().min(1).max(16),
        evaluation: z.record(z.string(), z.unknown()),
        companyName: z.string().optional(),
        tags: z.array(z.string()).optional(),
      },
      annotations: MCP_WRITE,
    },
    async ({ symbol, evaluation, companyName, tags }, extra) => {
      const userId = getUserIdFromExtra(extra);
      if (!userId) return errContent("Unauthorized.");
      return fromResult(
        await saveWarrenMoatReport(userId, { symbol, evaluation, companyName, tags }),
      );
    },
  );
}
