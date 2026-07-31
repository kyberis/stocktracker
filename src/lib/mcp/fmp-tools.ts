import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { findUserById, getGlobalFmpApiKey, isFeatureEnabledForUser } from "@/lib/db";
import { listFmpCatalog } from "@/lib/mcp/fmp-endpoint-catalog";
import { FMP_DATA_DISCLAIMER, fmpStableGet } from "@/lib/mcp/fmp-proxy";
import { MCP_READ_ONLY } from "@/lib/mcp/mcp-tool-annotations";
import { errContent, gateMcpTool, jsonContent } from "@/lib/mcp/mcp-helpers";
import { checkFmpRateLimit } from "@/lib/rate-limit";
import { effectivePlan } from "@/lib/subscription";

type McpToolError = ReturnType<typeof errContent>;

async function assertFmpMcpAccess(
  userId: string,
  opts: { checkRateLimit: boolean },
): Promise<McpToolError | null> {
  const user = await findUserById(userId);
  if (!user) return errContent("Unauthorized.");

  const isAdmin = user.role === "admin";
  if (!isAdmin && effectivePlan(user.plan, user.plan_expires_at) !== "pro") {
    return errContent("Forbidden: FMP MCP tools require a Pro plan.");
  }

  if (!(await isFeatureEnabledForUser("mcp_fmp_proxy", userId))) {
    return errContent("FMP MCP proxy is disabled (feature flag mcp_fmp_proxy).");
  }

  if (!getGlobalFmpApiKey()) {
    return errContent("FMP is not configured on this server (missing FMP_API_KEY).");
  }

  if (opts.checkRateLimit && !isAdmin) {
    const rl = await checkFmpRateLimit(userId);
    if (!rl.allowed) {
      return errContent(
        `Rate limit exceeded for FMP (${rl.limit}/min). Retry after ${rl.resetAt || "about 60s"}.`,
      );
    }
  }

  return null;
}

/** Pro + market:fmp FMP stable API proxy tools. */
export function registerFmpMcp(server: McpServer): void {
  server.registerTool(
    "listFmpEndpoints",
    {
      title: "List FMP endpoints",
      description:
        "Curated catalog of Financial Modeling Prep stable API endpoints for discovery. Not an allowlist — fmpRequest may call any valid stable path. Informational only; not investment advice.",
      inputSchema: {
        category: z
          .enum([
            "quote_search",
            "company",
            "statements",
            "calendar",
            "news_insider",
            "crypto_fx",
            "macro",
            "lists",
            "other",
          ])
          .optional()
          .describe("Optional category filter"),
      },
      annotations: MCP_READ_ONLY,
    },
    async ({ category }, extra) => {
      const gate = gateMcpTool(extra, "listFmpEndpoints");
      if (!gate.ok) return gate.response;
      const accessErr = await assertFmpMcpAccess(gate.userId, { checkRateLimit: false });
      if (accessErr) return accessErr;
      return jsonContent({
        ...listFmpCatalog(category),
        disclaimer: FMP_DATA_DISCLAIMER,
      });
    },
  );

  server.registerTool(
    "fmpRequest",
    {
      title: "FMP API request",
      description:
        "GET proxy to Financial Modeling Prep stable API (https://financialmodelingprep.com/stable/{path}). Server injects the API key; do not pass apikey. Pro + market:fmp scope required. Rate limited. Use listFmpEndpoints for common paths. Informational only; not investment advice. Past performance does not guarantee future results.",
      inputSchema: {
        path: z
          .string()
          .min(1)
          .max(200)
          .describe("Relative stable path, e.g. quote, income-statement, news/stock"),
        params: z
          .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
          .optional()
          .describe("Query parameters (apikey is stripped if present)"),
        limitBytes: z
          .number()
          .int()
          .min(1024)
          .max(2_097_152)
          .optional()
          .describe("Max response size in bytes (default 1MB, max 2MB)"),
      },
      annotations: MCP_READ_ONLY,
    },
    async ({ path, params, limitBytes }, extra) => {
      const gate = gateMcpTool(extra, "fmpRequest");
      if (!gate.ok) return gate.response;
      const accessErr = await assertFmpMcpAccess(gate.userId, { checkRateLimit: true });
      if (accessErr) return accessErr;

      const stringParams =
        params == null
          ? undefined
          : Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]));

      const result = await fmpStableGet({ path, params: stringParams, limitBytes });
      if (!result.ok) {
        return errContent(result.error);
      }
      return jsonContent({
        path: result.path,
        status: result.status,
        truncated: result.truncated,
        bytes: result.bytes,
        disclaimer: result.disclaimer,
        data: result.data,
      });
    },
  );
}
