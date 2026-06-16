import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { NextResponse } from "next/server";

import { authenticateTrefolioMcpRequest, verifyTrefolioMcpBearer } from "@/lib/mcp/trefolio-pat-auth";
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
    basePath: "/api/mcp",
    maxDuration: 60,
    verboseLogs: process.env.NODE_ENV !== "production",
  },
);

const authenticatedHandler = withMcpAuth(
  baseHandler,
  async (_req, bearer) => {
    if (!bearer) return undefined;
    const auth = await verifyTrefolioMcpBearer(bearer);
    if (!auth) return undefined;
    return {
      token: bearer,
      clientId: auth.tokenId,
      scopes: ["portfolio:read", "warren:moat"],
      extra: { userId: auth.userId, tokenId: auth.tokenId },
    };
  },
  { required: true },
);

async function rateLimitedHandler(request: Request, context: unknown): Promise<Response> {
  const auth = await authenticateTrefolioMcpRequest(request);
  if (auth) {
    const lim = mcpUserRateLimiter();
    if (lim) {
      const { success } = await lim.limit(auth.userId);
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
  }
  return (authenticatedHandler as unknown as (req: Request, ctx: unknown) => Promise<Response>)(
    request,
    context,
  );
}

export const GET = rateLimitedHandler;
export const POST = rateLimitedHandler;
export const DELETE = rateLimitedHandler;

export const dynamic = "force-dynamic";
