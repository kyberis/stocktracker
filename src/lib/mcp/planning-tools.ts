import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { getPortfolioScoreForUser } from "@/lib/services/portfolio-score-read";
import { getTaxReportForUser } from "@/lib/services/tax-report";
import { TAX_COUNTRIES, type TaxCountry } from "@/lib/tax/types";
import { MCP_READ_ONLY } from "@/lib/mcp/mcp-tool-annotations";
import { fromServiceResult, gateMcpTool } from "@/lib/mcp/mcp-helpers";

export function registerPlanningMcp(server: McpServer): void {
  server.registerTool(
    "getTaxReport",
    {
      title: "Tax report",
      description:
        "Generate a year-end tax report for a supported country (uses tax_report quota). Educational estimate — not filing advice. Requires PAT scope tax:read.",
      inputSchema: {
        country: z.string().min(2).max(2),
        taxYear: z.number().int().min(2000).max(new Date().getFullYear()),
        portfolioId: z.string().optional(),
        filingStatus: z.enum(["single", "joint"]).optional(),
        italyRegime: z.enum(["dichiarativo", "amministrato"]).optional(),
        swedenAccountType: z.enum(["isk", "kf", "regular"]).optional(),
        portugalNhr: z.boolean().optional(),
        swissCanton: z.string().max(4).optional(),
      },
      annotations: MCP_READ_ONLY,
    },
    async (opts, extra) => {
      const gate = gateMcpTool(extra, "getTaxReport");
      if (!gate.ok) return gate.response;
      const country = opts.country.toUpperCase() as TaxCountry;
      if (!TAX_COUNTRIES.includes(country)) {
        return fromServiceResult({
          ok: false,
          error: `Unsupported country. Supported: ${TAX_COUNTRIES.join(", ")}`,
          code: "invalid_input",
        });
      }
      return fromServiceResult(
        await getTaxReportForUser(gate.userId, {
          country,
          taxYear: opts.taxYear,
          portfolioId: opts.portfolioId,
          filingStatus: opts.filingStatus,
          italyRegime: opts.italyRegime,
          swedenAccountType: opts.swedenAccountType,
          portugalNhr: opts.portugalNhr,
          swissCanton: opts.swissCanton,
        }),
      );
    },
  );

  server.registerTool(
    "getPortfolioScore",
    {
      title: "Portfolio score",
      description:
        "Read the cached AI portfolio score (if generated in the app). Set history=true for past scores. Not investment advice.",
      inputSchema: {
        portfolioId: z.string().optional(),
        history: z.boolean().optional(),
      },
      annotations: MCP_READ_ONLY,
    },
    async (opts, extra) => {
      const gate = gateMcpTool(extra, "getPortfolioScore");
      if (!gate.ok) return gate.response;
      return fromServiceResult(
        await getPortfolioScoreForUser(gate.userId, {
          portfolioId: opts.portfolioId,
          history: opts.history === true,
        }),
      );
    },
  );
}
