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
/** Claude Code CLI one-liner (token placeholder). */
export function buildClaudeCodeMcpCliSnippet(mcpUrl: string): string {
  return `claude mcp add --transport http trefolio ${mcpUrl}/mcp --header "Authorization: Bearer tfp_pat_YOUR_TOKEN_HERE"`;
}

export function getProfileMcpUrl(): string {
  const base = process.env.APP_BASE_URL?.trim().replace(/\/+$/g, "") || "https://trefolio.com";
  return `${base}/profile?section=mcp`;
}

/** @deprecated Prefer {@link getProfileMcpUrl} — PAT management lives in trefolio Profile. */
export function getIdpDeveloperTokensUrl(): string {
  return getProfileMcpUrl();
}

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
