/** CORS for browser OAuth preflight from claude.ai → trefolio MCP (Connectors Directory). */
export const MCP_CORS_ALLOW_ORIGIN = "*";

export function withMcpCors(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", MCP_CORS_ALLOW_ORIGIN);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function mcpCorsPreflightResponse(): Response {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": MCP_CORS_ALLOW_ORIGIN,
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Max-Age": "86400",
    },
  });
}
