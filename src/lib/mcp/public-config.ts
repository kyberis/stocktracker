/** Public MCP endpoint URL for per-user portfolio tools. */
export function getMcpUserEndpointUrl(): string {
  const base = process.env.APP_BASE_URL?.trim().replace(/\/+$/g, "") || "https://trefolio.com";
  return `${base}/api/mcp/user`;
}

/** Cursor / Claude Desktop `mcp.json` snippet (token placeholder). */
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
