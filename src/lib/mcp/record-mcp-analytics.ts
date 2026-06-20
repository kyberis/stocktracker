import type { McpAnalyticsEventType } from "@/lib/db/mcp-analytics";
import { trackMcpAnalyticsEvent } from "@/lib/db/mcp-analytics";

interface JsonRpcBody {
  method?: string;
  params?: { name?: string };
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
        await trackMcpAnalyticsEvent({
          userId,
          eventType: "tool_call",
          toolName: body.params.name,
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
): void {
  void trackMcpAnalyticsEvent({
    userId,
    eventType: "pat_created",
    tokenId,
    metadata: { name: name.slice(0, 80) },
  });
}

export function recordMcpPatRevoked(userId: string, tokenId: string): void {
  void trackMcpAnalyticsEvent({
    userId,
    eventType: "pat_revoked",
    tokenId,
  });
}
