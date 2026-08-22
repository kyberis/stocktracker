"use client";

import { TRAFFIC_SCREEN_HEADER, normalizeClientPath } from "@/lib/traffic/normalize";

let loginRedirectStarted = false;
let navigateToLogin = (href: string) => window.location.replace(href);
const PUBLIC_CLIENT_ROUTES = new Set([
  "/login",
  "/signup",
  "/landing",
  "/privacy",
  "/terms",
  "/verify-email",
  "/demo",
  "/releasenotes",
  "/leaf",
  "/unsubscribe",
  "/about",
  "/contact",
]);

function getCurrentAppPath(): string {
  if (typeof window === "undefined") return "/";
  const { pathname, search, hash } = window.location;
  return `${pathname}${search}${hash}`;
}

function isPublicClientPath(pathname: string): boolean {
  if (PUBLIC_CLIENT_ROUTES.has(pathname)) return true;
  if (pathname.startsWith("/blog")) return true;
  if (pathname.startsWith("/p/")) return true;
  if (pathname.startsWith("/u/")) return true;
  if (pathname.startsWith("/trial/")) return true;
  if (pathname === "/analisis" || pathname.startsWith("/analisis/")) return true;
  return false;
}

function normalizeRedirectTarget(target?: string | null): string {
  if (!target) return "/";
  if (!target.startsWith("/") || target.startsWith("//")) return "/";
  return target;
}

function getRequestPathname(input: RequestInfo | URL): string | null {
  if (typeof input === "string") {
    if (input.startsWith("/")) return input;
    try {
      return new URL(input, window.location.origin).pathname;
    } catch {
      return null;
    }
  }

  if (input instanceof URL) return input.pathname;

  if (typeof Request !== "undefined" && input instanceof Request) {
    try {
      return new URL(input.url, window.location.origin).pathname;
    } catch {
      return null;
    }
  }

  return null;
}

export function buildLoginRedirectHref(target?: string | null): string {
  const params = new URLSearchParams();
  params.set("redirect", normalizeRedirectTarget(target ?? getCurrentAppPath()));
  return `/login?${params.toString()}`;
}

export function redirectToLogin(target?: string | null): boolean {
  if (typeof window === "undefined") return false;
  if (window.location.pathname === "/login") return false;
  if (loginRedirectStarted) return false;

  loginRedirectStarted = true;
  navigateToLogin(buildLoginRedirectHref(target));
  return true;
}

export function shouldRedirectToLogin(response: Response, input: RequestInfo | URL): boolean {
  if (response.status !== 401) return false;
  if (typeof window === "undefined") return false;
  if (window.location.pathname === "/login") return false;
  if (isPublicClientPath(window.location.pathname)) return false;

  const pathname = getRequestPathname(input);
  return Boolean(pathname?.startsWith("/api/"));
}

export function maybeRedirectToLogin(response: Response, input: RequestInfo | URL): boolean {
  if (!shouldRedirectToLogin(response, input)) return false;
  return redirectToLogin();
}

function isApiRequest(input: RequestInfo | URL): boolean {
  const pathname = getRequestPathname(input);
  return Boolean(pathname?.startsWith("/api/"));
}

function withTrafficScreenHeader(input: RequestInfo | URL, init?: RequestInit): RequestInit | undefined {
  if (typeof window === "undefined" || !isApiRequest(input)) return init;

  const screen = normalizeClientPath(window.location.pathname);
  const headers = new Headers(
    init?.headers ??
      (typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined),
  );
  headers.set(TRAFFIC_SCREEN_HEADER, screen);

  return { ...init, headers };
}

export async function fetchWithAuthRedirect(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, withTrafficScreenHeader(input, init));
  maybeRedirectToLogin(response, input);
  return response;
}

export function __resetLoginRedirectStateForTests() {
  loginRedirectStarted = false;
  navigateToLogin = (href: string) => window.location.replace(href);
}

export function __setLoginRedirectNavigatorForTests(navigate: (href: string) => void) {
  navigateToLogin = navigate;
}
