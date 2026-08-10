import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/session";
import { logUnauthorizedApi } from "@/lib/log-unauthorized";

const PUBLIC_ROUTES = new Set(["/login", "/signup", "/landing", "/privacy", "/terms", "/verify-email", "/blog", "/contact", "/demo", "/releasenotes", "/leaf", "/unsubscribe", "/about", "/docs", "/studio", "/delete-account/confirm"]);
const PUBLIC_API_ROUTES = new Set([
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/logout",
  "/api/auth/idp-logout",
  "/api/auth/google",
  "/api/auth/google/callback",
  "/api/auth/apple",
  "/api/auth/apple/callback",
  "/api/auth/oidc/start",
  "/api/auth/oidc/signup-start",
  "/api/auth/oidc/callback",
  "/api/auth/verify-email",
  "/api/auth/passkey/login-options",
  "/api/auth/passkey/login-verify",
  "/api/feature-flags",
  "/api/billing/webhook",
  "/api/billing/portal",
  "/api/analytics/landing",
  "/api/landing/stats",
  // Public market ticker (landing + demo); cached server-side, no user data
  "/api/ticker-bar",
  "/api/contact",
  "/api/metrics",
  "/api/cron/push-gauges",
  "/api/cron/event-sync",
  "/api/cron/check-alerts",
  "/api/cron/snaptrade-sync",
  "/api/cron/snaptrade-cleanup",
  "/api/cron/screener-sync",
  "/api/cron/tax-rules-review",
  "/api/cron/refresh-holdings",
  "/api/cron/portfolio-snapshots",
  "/api/cron/x-post",
  "/api/cron/trial-invitations",
  "/api/cron/trial-expiration",
  "/api/cron/lifecycle-activation",
  "/api/cron/lifecycle-winback",
  "/api/cron/weekly-digest",
  "/api/cron/digest-email",
  "/api/cron/moat-sync",
  "/api/cron/feedback-pipeline",
  "/api/cron/compact-snapshots",
  "/api/cron/prodops-dispatch",
  "/api/cron/commerce-complimentary-renewal",
  "/api/cron/portfolio-recommendations",
  "/api/cron/aid-digest",
  "/api/cron/aid-finpulse",
  "/api/cron/coverage-reconcile",
  "/api/cron/screening-recover",
  // ProdOps Telegram /start callback — HMAC auth is enforced inside the route.
  "/api/admin/prodops-config/link/complete",
  "/api/webhooks/linear",
  "/api/webhooks/telegram",
  "/api/portfolio/summary",
  "/api/device/ai-summary",
  "/api/device/firmware",
  "/api/device/config",
  "/api/device/heartbeat",
  "/api/device/notifications",
  "/api/notifications/push/vapid-key",
  "/api/email/unsubscribe",
  "/api/webhooks/resend",
  "/api/social/profile",
  "/api/social/posts",
  "/api/device-interest/count",
  // Public stock research: rate-limited in-route, paid-API sections redacted
  // for anonymous requests (see /api/company-analysis, /api/search).
  "/api/search",
  "/api/company-analysis",
  "/api/company-analysis/narrative",
]);

function buildLoginRedirectUrl(req: NextRequest): URL {
  const loginUrl = new URL("/login", req.url);
  const redirectTarget = `${req.nextUrl.pathname}${req.nextUrl.search}`;
  loginUrl.searchParams.set("redirect", redirectTarget);
  return loginUrl;
}

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_ROUTES.has(pathname)) return true;
  if (pathname.startsWith("/landing")) return true;
  if (pathname.startsWith("/blog")) return true;
  if (pathname === "/docs" || pathname.startsWith("/docs/")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname === "/favicon.ico") return true;
  if (pathname === "/robots.txt") return true;
  if (pathname === "/sitemap.xml") return true;
  if (pathname === "/llms.txt") return true;
  if (pathname === "/llms-full.txt") return true;
  if (pathname === "/openapi.json") return true;
  if (pathname === "/manifest.json") return true;
  if (pathname === "/.well-known/mcp.json") return true;
  if (pathname === "/.well-known/ai-plugin.json") return true;
  if (pathname === "/.well-known/oauth-protected-resource") return true;
  // Public portfolio share pages
  if (pathname.startsWith("/p/")) return true;
  // Public social profile pages
  if (pathname.startsWith("/u/")) return true;
  // Trial activation page is public so email links work before login
  if (pathname.startsWith("/trial/")) return true;
  // Public stock research: search + report page (free data; paid-API sections
  // are redacted server-side for anonymous requests, see /api/company-analysis)
  if (pathname === "/analisis" || pathname.startsWith("/analisis/")) return true;
  if (/\.(png|jpg|jpeg|gif|svg|webp|ico|mp4|webm|css|js|woff2?)$/.test(pathname)) return true;
  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Recover mistaken navigations to `/l` (often a truncated display of `/landing`
  // or a bad relative link). No legitimate route uses this path.
  if (pathname === "/l") {
    return NextResponse.redirect(new URL("/landing", req.url));
  }

  if (isPublicPath(pathname) || PUBLIC_API_ROUTES.has(pathname)) {
    return NextResponse.next();
  }

  // Public portfolio share API (dynamic route)
  if (pathname.startsWith("/api/p/")) {
    return NextResponse.next();
  }
  // Public LLM integration docs (OpenAPI + section guides)
  if (pathname === "/api/docs" || pathname.startsWith("/api/docs/")) {
    return NextResponse.next();
  }
  // Public social APIs (dynamic routes)
  if (pathname.startsWith("/api/social/profile/")) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/api/social/posts/") && req.method === "GET") {
    return NextResponse.next();
  }
  // Telegram webhook (dynamic secret segment) — auth is enforced inside the route.
  if (pathname.startsWith("/api/webhooks/telegram/")) {
    return NextResponse.next();
  }
  // IdP service-plane endpoints — Bearer-token auth is enforced inside each route.
  if (pathname.startsWith("/api/v1/users/by-sub/")) {
    return NextResponse.next();
  }
  // Per-user MCP: Bearer `tfp_pat_…` validated via IdP introspection inside the route.
  if (pathname.startsWith("/api/mcp/user")) {
    return NextResponse.next();
  }
  // Service-to-service internal APIs — Bearer or HMAC auth is enforced inside each route.
  if (pathname.startsWith("/api/internal/")) {
    return NextResponse.next();
  }

  const token = req.cookies.get("trefolio_session")?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    if (pathname.startsWith("/api/")) {
      logUnauthorizedApi(req, {
        source: "middleware",
        reason: token ? "invalid_or_expired_session_jwt" : "missing_session_cookie",
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (pathname === "/") {
      return NextResponse.rewrite(new URL("/landing", req.url));
    }
    return NextResponse.redirect(buildLoginRedirectUrl(req));
  }

  if (
    session.mustChangePassword &&
    !session.impersonatorUserId &&
    pathname !== "/change-password" &&
    pathname !== "/api/auth/change-password" &&
    pathname !== "/api/auth/logout"
  ) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Password change required" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/change-password", req.url));
  }

  const EMAIL_GATED_API_ROUTES = new Set([
    "/api/billing/device-checkout",
    "/api/billing/portal",
    "/api/auth/delete-account",
  ]);
  if (
    session.role !== "admin" &&
    !session.emailVerified &&
    !session.mustChangePassword &&
    EMAIL_GATED_API_ROUTES.has(pathname)
  ) {
    return NextResponse.json({ error: "Email verification required" }, { status: 403 });
  }

  const ONBOARDING_ALLOWED = new Set([
    "/onboarding",
    "/api/auth/onboarding",
    "/api/auth/onboarding/trial-shown",
    "/api/auth/me",
    "/api/auth/logout",
    "/api/auth/verify-email",
    "/api/user-settings",
    "/api/auth/passkey/register-options",
    "/api/auth/passkey/register-verify",
    "/api/auth/passkey/list",
    "/api/auth/google",
    "/api/auth/google/callback",
    "/api/auth/oidc/start",
    "/api/auth/oidc/signup-start",
    "/api/auth/oidc/callback",
  ]);
  if (
    !session.onboardingCompleted &&
    session.role !== "admin" &&
    !session.impersonatorUserId &&
    !ONBOARDING_ALLOWED.has(pathname)
  ) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Onboarding required" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  if (["/login", "/signup", "/landing"].includes(pathname) && session) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth/login|api/auth/signup|api/auth/logout).*)"],
};
