import { NextResponse } from "next/server";

import { getMcpOAuthProtectedResourceMetadataUrl, getMcpStreamableHttpUrl } from "@/lib/mcp/mcp-oauth-discovery";
import { getPublicDocsSiteUrl } from "@/lib/public-api-docs/site";

export async function GET() {
  const site = getPublicDocsSiteUrl();
  const body = {
    name: "trefolio",
    description:
      "European multi-currency portfolio tracker with Warren MOAT analysis (trefolio ecosystem).",
    homepage: site,
    documentation: `${site}/docs`,
    claude_connectors_directory: `${site}/docs/claude-connectors`,
    contact: {
      name: "Trefolio",
      url: `${site}/contact`,
    },
    servers: [
      {
        id: "trefolio-user",
        name: "trefolio (per user)",
        description:
          "Portfolio read + Warren MOAT tools. OAuth via user.trefolio.com for Claude Connectors; PAT (tfp_pat_…) for Cursor and Claude Desktop config file.",
        url: `${site}/api/mcp/user`,
        streamable_http_url: getMcpStreamableHttpUrl(),
        transport: "http",
        protocol: "modelcontextprotocol",
        version: "2025-06-18",
        authentication: {
          oauth2: {
            authorization_server: "https://user.trefolio.com",
            protected_resource_metadata: getMcpOAuthProtectedResourceMetadataUrl(),
            client_id: "claude-mcp",
          },
          bearer_pat: {
            type: "bearer",
            token_format: "tfp_pat_<64-hex>",
            documentation: "https://user.trefolio.com/account/developer",
          },
        },
        capabilities: {
          tools: true,
          resources: false,
          prompts: false,
        },
      },
    ],
  };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=3600",
    },
  });
}

export const dynamic = "force-static";
