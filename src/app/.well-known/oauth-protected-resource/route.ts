import { NextResponse } from "next/server";

import { buildMcpOAuthProtectedResourceMetadata } from "@/lib/mcp/mcp-oauth-discovery";

export const dynamic = "force-static";

/** RFC 9728 — OAuth protected resource metadata for Claude Connectors OAuth discovery. */
export async function GET() {
  return NextResponse.json(buildMcpOAuthProtectedResourceMetadata(), {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Max-Age": "86400",
    },
  });
}
