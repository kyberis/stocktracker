import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/session";

const PUBLIC_ROUTES = new Set(["/login", "/signup", "/landing", "/privacy", "/terms", "/verify-email", "/blog", "/contact", "/demo", "/releasenotes", "/leaf", "/unsubscribe", "/about"]);
const PUBLIC_API_ROUTES = new Set([
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/logout",
  "/api/auth/google",
  "/api/auth/google/callback",
  "/api/auth/apple",
  "/api/auth/apple/callback",
  "/api/auth/verify-email",
  "/api/auth/passkey/login-options",
  "/api/auth/passkey/login-verify",
  "/api/feature-flags",
  "/api/billing/webhook",
  "/api/analytics/landing",
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
  "/api/cron/weekly-digest",
  "/api/cron/digest-email",
  "/api/cron/moat-sync",
  "/api/cron/feedback-pipeline",
  "/api/cron/compact-snapshots",
  "/api/webhooks/linear",
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
]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_ROUTES.has(pathname)) return true;
  if (pathname.startsWith("/blog")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname === "/favicon.ico") return true;
  if (pathname === "/robots.txt") return true;
  if (pathname === "/sitemap.xml") return true;
  if (pathname === "/llms.txt") return true;
  if (pathname === "/llms-full.txt") return true;
  if (pathname === "/manifest.json") return true;
  // Public portfolio share pages
  if (pathname.startsWith("/p/")) return true;
  // Public social profile pages
  if (pathname.startsWith("/u/")) return true;
  // Trial activation page is public so email links work before login
  if (pathname.startsWith("/trial/")) return true;
  if (/\.(png|jpg|jpeg|gif|svg|webp|ico|mp4|webm|css|js|woff2?)$/.test(pathname)) return true;
  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname) || PUBLIC_API_ROUTES.has(pathname)) {
    return NextResponse.next();
  }

  // Public portfolio share API (dynamic route)
  if (pathname.startsWith("/api/p/")) {
    return NextResponse.next();
  }
  // Public social APIs (dynamic routes)
  if (pathname.startsWith("/api/social/profile/")) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/api/social/posts/") && req.method === "GET") {
    return NextResponse.next();
  }

  const token = req.cookies.get("trefolio_session")?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (pathname === "/") {
      return NextResponse.rewrite(new URL("/landing", req.url));
    }
    return NextResponse.redirect(new URL("/", req.url));
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
    "/api/billing/checkout",
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
    "/api/auth/me",
    "/api/auth/logout",
    "/api/auth/verify-email",
    "/api/user-settings",
    "/api/auth/passkey/register-options",
    "/api/auth/passkey/register-verify",
    "/api/auth/passkey/list",
    "/api/auth/google",
    "/api/auth/google/callback",
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
