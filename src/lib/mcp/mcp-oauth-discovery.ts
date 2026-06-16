import { generateProtectedResourceMetadata } from "mcp-handler";

import { getIdpIssuer } from "@/lib/idp/config";
import { getPublicDocsSiteUrl } from "@/lib/public-api-docs/site";

/** Public MCP Streamable HTTP URL — must match what users enter in Claude Connectors. */
export function getMcpStreamableHttpUrl(): string {
  const site = getPublicDocsSiteUrl();
  return `${site}/api/mcp/user/mcp`;
}

export function getMcpOAuthProtectedResourceMetadataUrl(): string {
  return `${getPublicDocsSiteUrl()}/.well-known/oauth-protected-resource`;
}

export function buildMcpOAuthProtectedResourceMetadata() {
  const issuer = getIdpIssuer() || "https://user.trefolio.com";
  return generateProtectedResourceMetadata({
    authServerUrls: [issuer],
    resourceUrl: getMcpStreamableHttpUrl(),
    additionalMetadata: {
      scopes_supported: ["openid", "profile", "email", "mcp:ecosystem"],
      bearer_methods_supported: ["header"],
      resource_documentation: `${getPublicDocsSiteUrl()}/docs/claude-connectors`,
    },
  });
}

/** RFC 9728-style 401 for Claude OAuth discovery (Connectors Directory requirement). */
export function mcpOAuthUnauthorizedResponse(description = "Authentication required"): Response {
  const resourceMetadataUrl = getMcpOAuthProtectedResourceMetadataUrl();
  return new Response(
    JSON.stringify({ error: "invalid_token", error_description: description }),
    {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "WWW-Authenticate": `Bearer error="invalid_token", error_description="${description}", resource_metadata="${resourceMetadataUrl}"`,
      },
    },
  );
}
