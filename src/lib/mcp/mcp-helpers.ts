import type { Holding } from "@/lib/types";
import type { ServiceResult } from "@/lib/services/service-result";
import {
  DEFAULT_MCP_PAT_SCOPES,
  hasMcpScope,
  isTrefolioMcpScope,
  requiredScopeForMcpTool,
  LEGACY_MCP_PAT_SCOPES,
  type TrefolioMcpScope,
} from "@/lib/mcp/pat-scopes";

export function jsonContent(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

export function errContent(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true as const,
  };
}

export function getUserIdFromExtra(extra: { authInfo?: { extra?: Record<string, unknown> } }) {
  const userId = extra.authInfo?.extra?.userId;
  return typeof userId === "string" && userId.length > 0 ? userId : null;
}

export function fromServiceResult<T>(result: ServiceResult<T>) {
  if (result.ok) return jsonContent(result.data);
  return errContent(`${result.code}: ${result.error}`);
}

export function getScopesFromExtra(extra: { authInfo?: { extra?: Record<string, unknown> } }): TrefolioMcpScope[] {
  const raw = extra.authInfo?.extra?.scopes;
  if (Array.isArray(raw)) {
    const filtered = raw.filter((s): s is TrefolioMcpScope => typeof s === "string" && isTrefolioMcpScope(s));
    if (raw.length > 0 && filtered.length === 0) return [];
    return filtered.length > 0 ? filtered : DEFAULT_MCP_PAT_SCOPES;
  }
  return LEGACY_MCP_PAT_SCOPES.filter(isTrefolioMcpScope);
}

export function requireMcpToolScope(
  extra: { authInfo?: { extra?: Record<string, unknown> } },
  toolName: string,
) {
  const required = requiredScopeForMcpTool(toolName);
  if (!required) return null;
  const granted = getScopesFromExtra(extra);
  if (!hasMcpScope(granted, required)) {
    return errContent(
      `Forbidden: missing PAT scope "${required}" for tool ${toolName}. Add it when minting the token at user.trefolio.com → Developer.`,
    );
  }
  return null;
}

type McpToolError = ReturnType<typeof errContent>;

export function gateMcpTool(
  extra: { authInfo?: { extra?: Record<string, unknown> } },
  toolName: string,
): { ok: true; userId: string } | { ok: false; response: McpToolError } {
  const userId = getUserIdFromExtra(extra);
  if (!userId) return { ok: false, response: errContent("Unauthorized.") };
  const scopeErr = requireMcpToolScope(extra, toolName);
  if (scopeErr) return { ok: false, response: scopeErr };
  return { ok: true, userId };
}

/** Stable MCP projection for a holding row. */
export function mapHoldingForMcp(h: Holding) {
  return {
    id: h.id,
    name: h.name,
    ticker: h.ticker,
    shares: h.shares,
    purchasePrice: h.purchasePrice,
    displayCurrency: h.displayCurrency,
    valueInEUR: h.valueInEUR,
    assetType: h.assetType,
    sector: h.sector,
    region: h.region,
    exchange: h.exchange,
  };
}
