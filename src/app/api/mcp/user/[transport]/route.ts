import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { createMcpHandler } from "mcp-handler";
import { NextResponse } from "next/server";

import {
  extractBearer,
  mcpPatAuthFailureResponse,
  verifyMcpRequestAuthDetailed,
} from "@/lib/mcp/trefolio-pat-auth";
import { mcpCorsPreflightResponse, withMcpCors } from "@/lib/mcp/mcp-cors";
import { mcpOAuthUnauthorizedResponse } from "@/lib/mcp/mcp-oauth-discovery";
import { registerTrefolioUserMcp } from "@/lib/mcp/user-server";
import { recordMcpRequestAnalytics } from "@/lib/mcp/record-mcp-analytics";
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
  const authResult = await verifyMcpRequestAuthDetailed(bearer);

  if (authResult.ok) {
    const lim = mcpUserRateLimiter();
    if (lim) {
      const { success } = await lim.limit(authResult.auth.userId);
      if (!success) {
        return withMcpCors(NextResponse.json({ error: "rate_limited" }, { status: 429 }));
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
        return withMcpCors(NextResponse.json({ error: "rate_limited" }, { status: 429 }));
      }
    }
    if (
      authResult.reason === "missing_bearer" ||
      authResult.reason === "invalid_token_format" ||
      (authResult.reason === "inactive" && bearer && !bearer.trim().startsWith("tfp_pat_"))
    ) {
      return withMcpCors(
        mcpOAuthUnauthorizedResponse(
          authResult.reason === "missing_bearer"
            ? "Authentication required"
            : "Invalid or expired OAuth access token",
        ),
      );
    }
    return withMcpCors(mcpPatAuthFailureResponse(authResult.reason));
  }

  attachMcpAuth(request, bearer!, authResult.auth.userId, authResult.auth.tokenId);
  recordMcpRequestAnalytics(request, authResult.auth.userId, authResult.auth.tokenId, bearer!);
  const response = await (baseHandler as unknown as (req: Request, ctx: unknown) => Promise<Response>)(
    request,
    context,
  );
  return withMcpCors(response);
}

export const GET = rateLimitedHandler;
export const POST = rateLimitedHandler;
export const DELETE = rateLimitedHandler;
export const OPTIONS = () => mcpCorsPreflightResponse();

export const dynamic = "force-dynamic";
