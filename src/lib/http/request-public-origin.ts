import type { NextRequest } from "next/server";

/** Hostnames used for local HTTPS behind Caddy (`dev/Caddyfile`). */
function isTrefolioDevHostname(host: string): boolean {
  const h = host.replace(/:\d+$/, "").toLowerCase();
  return h === "trefolio-dev.com" || h.endsWith(".trefolio-dev.com");
}

/**
 * Browser-facing origin for redirects and OAuth `redirect_uri`.
 *
 * Behind Caddy/Vercel/etc., `Host` / `req.nextUrl` may not match the URL the
 * user typed (e.g. direct `localhost` vs `https://trefolio-dev.com`). Prefer
 * `X-Forwarded-Host` + `X-Forwarded-Proto` when present so OIDC start/callback
 * use the same origin the browser sees.
 *
 * **Caddy dev:** Some setups forward `Host: *.trefolio-dev.com` to Node but omit
 * `X-Forwarded-Proto`. The app sees an HTTP `nextUrl` while the browser used
 * HTTPS — we treat `*.trefolio-dev.com` as HTTPS so `redirect_uri` matches on
 * `/api/auth/oidc/token` exchange.
 */
export function getRequestPublicOrigin(req: NextRequest): string {
  let host = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (!host) {
    const raw = req.headers.get("host")?.split(",")[0]?.trim();
    if (raw && isTrefolioDevHostname(raw)) {
      host = raw.replace(/:\d+$/, "");
    }
  }
  if (host) {
    const protoHeader = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    let proto =
      protoHeader || (req.nextUrl.protocol === "https:" ? "https" : "http");
    if (!protoHeader && isTrefolioDevHostname(host)) {
      proto = "https";
    }
    return `${proto}://${host}`.replace(/\/+$/g, "");
  }

  const env = process.env.APP_BASE_URL?.trim().replace(/\/+$/g, "");
  if (env) return env;

  return req.nextUrl.origin.replace(/\/+$/g, "");
}

export function isRequestPublicHttps(req: NextRequest): boolean {
  return getRequestPublicOrigin(req).startsWith("https:");
}
