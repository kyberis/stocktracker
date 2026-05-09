import { NextResponse } from "next/server";

function getSiteUrl(): string {
  return process.env.APP_BASE_URL?.trim().replace(/\/+$/g, "") || "https://trefolio.com";
}

export async function GET() {
  const site = getSiteUrl();
  const body = {
    name: "trefolio",
    description: "European multi-currency portfolio tracker (trefolio ecosystem).",
    homepage: site,
    contact: {
      name: "Trefolio",
      url: "https://trefolio.com",
    },
    servers: [
      {
        id: "trefolio-user",
        name: "trefolio (per user)",
        description:
          "Read-only portfolio tools via MCP. Bearer token `tfp_pat_…` from user.trefolio.com → Developer.",
        url: `${site}/api/mcp/user`,
        transport: "http",
        protocol: "modelcontextprotocol",
        version: "2025-06-18",
        authentication: {
          type: "bearer",
          token_format: "tfp_pat_<64-hex>",
          documentation: "https://user.trefolio.com/account/developer",
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
