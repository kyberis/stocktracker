import type { NextRequest } from "next/server";

/**
 * Browser-facing origin for redirects and OAuth `redirect_uri`.
 *
 * Behind Caddy/Vercel/etc., `Host` / `req.nextUrl` may not match the URL the
 * user typed (e.g. direct `localhost` vs `https://trefolio-dev.com`). Prefer
 * `X-Forwarded-Host` + `X-Forwarded-Proto` when present so OIDC start/callback
 * use the same origin the browser sees.
 */
export function getRequestPublicOrigin(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (host) {
    const protoHeader = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const proto =
      protoHeader || (req.nextUrl.protocol === "https:" ? "https" : "http");
    return `${proto}://${host}`.replace(/\/+$/g, "");
  }

  const env = process.env.APP_BASE_URL?.trim().replace(/\/+$/g, "");
  if (env) return env;

  return req.nextUrl.origin.replace(/\/+$/g, "");
}

export function isRequestPublicHttps(req: NextRequest): boolean {
  return getRequestPublicOrigin(req).startsWith("https:");
}
