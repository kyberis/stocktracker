import { NextResponse } from "next/server";

import { getPublicDocsSiteUrl } from "@/lib/public-api-docs/site";

export const dynamic = "force-static";

export async function GET() {
  const site = getPublicDocsSiteUrl();

  const body = {
    schema_version: "v1",
    name_for_human: "trefolio",
    name_for_model: "trefolio_portfolio",
    description_for_human:
      "trefolio — European multi-currency portfolio tracker with Warren AI and MOAT analysis.",
    description_for_model:
      "trefolio helps European investors track portfolios, run Warren Buffett-style MOAT evaluations, " +
      "and chat with Warren (portfolio AI). For read-only portfolio data in external agents, use MCP at " +
      `${site}/api/mcp/user with a user-issued tfp_pat_ bearer token (see ${site}/api/docs/mcp). ` +
      "For Warren MOAT REST endpoints (quantitative scoring + AI narrative), see " +
      `${site}/api/docs/warren-moat and ${site}/openapi.json — these require a browser session cookie. ` +
      "Start with GET /api/docs for the full integration index. Not financial advice.",
    auth: { type: "none" },
    api: {
      type: "openapi",
      url: `${site}/openapi.json`,
    },
    logo_url: `${site}/icon.svg`,
    contact_email: "hi@trefolio.com",
    legal_info_url: `${site}/privacy`,
  };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=3600",
    },
  });
}
