import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/session";

const PUBLIC_ROUTES = new Set(["/login", "/signup", "/landing", "/privacy", "/terms", "/verify-email", "/blog", "/contact", "/demo"]);
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
  "/api/portfolio/summary",
  "/api/device/ai-summary",
  "/api/device/firmware",
  "/api/device/config",
  "/api/device/heartbeat",
  "/api/device/notifications",
  "/api/notifications/push/vapid-key",
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
  // Public portfolio share pages
  if (pathname.startsWith("/p/")) return true;
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
    pathname !== "/change-password" &&
    pathname !== "/api/auth/change-password" &&
    pathname !== "/api/auth/logout"
  ) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Password change required" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/change-password", req.url));
  }

  const EMAIL_VERIFY_ALLOWED = new Set([
    "/verify-email",
    "/api/auth/verify-email",
    "/api/auth/logout",
    "/api/auth/me",
  ]);
  const skipEmailVerify = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
  if (
    !skipEmailVerify &&
    session.role !== "admin" &&
    !session.emailVerified &&
    !session.mustChangePassword &&
    !EMAIL_VERIFY_ALLOWED.has(pathname)
  ) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Email verification required" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/verify-email", req.url));
  }

  if (["/login", "/signup", "/landing"].includes(pathname) && session) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth/login|api/auth/signup|api/auth/logout).*)"],
};
