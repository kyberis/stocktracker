import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { createMcpHandler } from "mcp-handler";
import { NextResponse } from "next/server";

import {
  extractBearer,
  mcpPatAuthFailureResponse,
  verifyTrefolioMcpBearerDetailed,
} from "@/lib/mcp/trefolio-pat-auth";
import { registerTrefolioUserMcp } from "@/lib/mcp/user-server";
import { mcpUserRateLimiter, mcpUserUnauthRateLimiter } from "@/lib/upstash";
import { CURRENT_VERSION } from "@/lib/release-version";

const baseHandler = createMcpHandler(
  (server) => {
    registerTrefolioUserMcp(server);
  },
  {
    serverInfo: {
      name: "trefolio-user",
      version: CURRENT_VERSION,
    },
  },
  {
    basePath: "/api/mcp/user",
    maxDuration: 60,
    verboseLogs: process.env.NODE_ENV !== "production",
  },
);

function attachMcpAuth(request: Request, bearer: string, userId: string, tokenId: string): void {
  const authInfo: AuthInfo = {
    token: bearer,
    clientId: tokenId,
    scopes: ["portfolio:read", "warren:moat"],
    extra: { userId, tokenId },
  };
  (request as Request & { auth?: AuthInfo }).auth = authInfo;
}

async function rateLimitedHandler(request: Request, context: unknown): Promise<Response> {
  const bearer = extractBearer(request.headers);
  const authResult = await verifyTrefolioMcpBearerDetailed(bearer);

  if (authResult.ok) {
    const lim = mcpUserRateLimiter();
    if (lim) {
      const { success } = await lim.limit(authResult.auth.userId);
      if (!success) {
        return NextResponse.json({ error: "rate_limited" }, { status: 429 });
      }
    }
  } else {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const lim = mcpUserUnauthRateLimiter();
    if (lim) {
      const { success } = await lim.limit(ip);
      if (!success) {
        return NextResponse.json({ error: "rate_limited" }, { status: 429 });
      }
    }
    return mcpPatAuthFailureResponse(authResult.reason);
  }

  attachMcpAuth(request, bearer!, authResult.auth.userId, authResult.auth.tokenId);
  return (baseHandler as unknown as (req: Request, ctx: unknown) => Promise<Response>)(request, context);
}

export const GET = rateLimitedHandler;
export const POST = rateLimitedHandler;
export const DELETE = rateLimitedHandler;

export const dynamic = "force-dynamic";
