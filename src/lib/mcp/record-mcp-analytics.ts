import type { McpAnalyticsEventType } from "@/lib/db/mcp-analytics";
import { trackMcpAnalyticsEvent } from "@/lib/db/mcp-analytics";
import {
  buildMcpToolCallMetadata,
  formatPatScopesMetadata,
} from "@/lib/mcp/mcp-analytics-metadata";

interface JsonRpcBody {
  method?: string;
  params?: { name?: string; arguments?: unknown };
}

function mcpAuthType(bearer: string): "pat" | "oauth" {
  return bearer.trim().startsWith("tfp_pat_") ? "pat" : "oauth";
}

/** Parse MCP JSON-RPC POST and record initialize / tool_call events (non-blocking). */
export function recordMcpRequestAnalytics(
  request: Request,
  userId: string,
  tokenId: string,
  bearer: string,
): void {
  if (request.method !== "POST") return;
  void (async () => {
    try {
      const body = (await request.clone().json()) as JsonRpcBody;
      const authType = mcpAuthType(bearer);
      const base = { authType, tokenId };
      if (body.method === "initialize") {
        await trackMcpAnalyticsEvent({ userId, eventType: "client_init", ...base });
      } else if (body.method === "tools/call" && body.params?.name) {
        const toolName = body.params.name;
        const metadata = buildMcpToolCallMetadata(toolName, body.params.arguments);
        await trackMcpAnalyticsEvent({
          userId,
          eventType: "tool_call",
          toolName,
          metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
          ...base,
        });
      }
    } catch {
      /* ignore non-JSON or malformed bodies */
    }
  })();
}

export function recordMcpClientEvent(userId: string, eventType: McpAnalyticsEventType): void {
  void trackMcpAnalyticsEvent({ userId, eventType });
}

export function recordMcpPatCreated(
  userId: string,
  tokenId: string,
  name: string,
  scopes?: string[],
): void {
  void trackMcpAnalyticsEvent({
    userId,
    eventType: "pat_created",
    tokenId,
    metadata: {
      name: name.slice(0, 80),
      ...formatPatScopesMetadata(scopes),
    },
  });
}

export function recordMcpPatRevoked(userId: string, tokenId: string): void {
  void trackMcpAnalyticsEvent({
    userId,
    eventType: "pat_revoked",
    tokenId,
  });
}
