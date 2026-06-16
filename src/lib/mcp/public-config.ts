/** Public MCP endpoint URL for per-user portfolio tools. */
export function getMcpUserEndpointUrl(): string {
  const base = process.env.APP_BASE_URL?.trim().replace(/\/+$/g, "") || "https://trefolio.com";
  return `${base}/api/mcp/user`;
}

/** Cursor `mcp.json` snippet (token placeholder). */
export function buildCursorMcpConfigSnippet(mcpUrl: string): string {
  return JSON.stringify(
    {
      mcpServers: {
        trefolio: {
          url: `${mcpUrl}/mcp`,
          headers: {
            Authorization: "Bearer tfp_pat_YOUR_TOKEN_HERE",
          },
        },
      },
    },
    null,
    2,
  );
}

/**
 * Claude Desktop config file snippet (`claude_desktop_config.json`).
 * Use this — NOT Settings → Connectors → Custom connector (OAuth Client ID).
 */
export function buildClaudeDesktopMcpConfigSnippet(mcpUrl: string): string {
  return JSON.stringify(
    {
      mcpServers: {
        trefolio: {
          type: "http",
          url: `${mcpUrl}/mcp`,
          headers: {
            Authorization: "Bearer tfp_pat_YOUR_TOKEN_HERE",
          },
        },
      },
    },
    null,
    2,
  );
}
