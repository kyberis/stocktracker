import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { TREEFOLIO_SESSION_COOKIE } from "@/lib/auth/session";

export type Json401Meta = {
  source: string;
  reason: string;
  tags?: Record<string, string | boolean | number | undefined>;
};

/**
 * Log + JSON 401. Prefer this over ad-hoc returns so every 401 is searchable as `[http:401]`.
 */
export function json401(
  req: NextRequest,
  meta: Json401Meta,
  body: Record<string, unknown> = { error: "Unauthorized" },
): NextResponse {
  logUnauthorizedApi(req, meta);
  return NextResponse.json(body, { status: 401 });
}

/**
 * Structured warning log for 401 responses. Does not log cookie values, Bearer tokens, or passwords.
 * Use from middleware, auth guards, and route handlers when returning Unauthorized.
 */
export function logUnauthorizedApi(
  req: NextRequest,
  meta: {
    source: string;
    reason: string;
    /** Small safe labels (job names, route ids). Do not put secrets here. */
    tags?: Record<string, string | boolean | number | undefined>;
  },
): void {
  const url = req.nextUrl;
  const fwd = req.headers?.get("x-forwarded-for");
  const clientIp =
    fwd?.split(",")[0]?.trim() || req.headers?.get("x-real-ip") || undefined;

  const base = {
      source: meta.source,
      reason: meta.reason,
      method: req.method,
      path: url?.pathname ?? "(unknown)",
      query: url?.search && url.search.length > 1 ? url.search.slice(0, 500) : undefined,
      hasSessionCookie: Boolean(req.cookies?.get(TREEFOLIO_SESSION_COOKIE)?.value),
      host: req.headers?.get("host") || undefined,
      cfRay: req.headers?.get("cf-ray") || undefined,
      vercelId: req.headers?.get("x-vercel-id") || undefined,
      requestId: req.headers?.get("x-request-id") || undefined,
      clientIp,
      ua: req.headers?.get("user-agent")?.slice(0, 200) || undefined,
      referer: req.headers?.get("referer")?.slice(0, 400) || undefined,
      ...meta.tags,
  };

  console.warn("[http:401]", JSON.stringify(base));
}
