// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetLoginRedirectStateForTests,
  __setLoginRedirectNavigatorForTests,
  buildLoginRedirectHref,
  fetchWithAuthRedirect,
  maybeRedirectToLogin,
} from "./client-redirect";

describe("client auth redirect", () => {
  const originalFetch = globalThis.fetch;
  const navigateSpy = vi.fn();

  beforeEach(() => {
    __resetLoginRedirectStateForTests();
    __setLoginRedirectNavigatorForTests(navigateSpy);
    navigateSpy.mockReset();
    window.history.replaceState({}, "", "/dashboard?tab=holdings#chart");
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    __resetLoginRedirectStateForTests();
  });

  it("builds /login redirect href from current path", () => {
    expect(buildLoginRedirectHref()).toBe("/login?redirect=%2Fdashboard%3Ftab%3Dholdings%23chart");
  });

  it("redirects to login when an API response returns 401", () => {
    const redirected = maybeRedirectToLogin(new Response(null, { status: 401 }), "/api/holdings");

    expect(redirected).toBe(true);
    expect(navigateSpy).toHaveBeenCalledWith("/login?redirect=%2Fdashboard%3Ftab%3Dholdings%23chart");
  });

  it("deduplicates repeated 401 redirects", () => {
    maybeRedirectToLogin(new Response(null, { status: 401 }), "/api/holdings");
    maybeRedirectToLogin(new Response(null, { status: 401 }), "/api/cash");

    expect(navigateSpy).toHaveBeenCalledTimes(1);
  });

  it("does not redirect on non-401 responses", () => {
    const redirected = maybeRedirectToLogin(new Response(null, { status: 403 }), "/api/holdings");

    expect(redirected).toBe(false);
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it("does not redirect for non-api requests", () => {
    const redirected = maybeRedirectToLogin(new Response(null, { status: 401 }), "https://example.com/foo");

    expect(redirected).toBe(false);
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it("fetchWithAuthRedirect returns the response and triggers redirect on 401", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));

    const response = await fetchWithAuthRedirect("/api/transactions");

    expect(response.status).toBe(401);
    expect(navigateSpy).toHaveBeenCalledWith("/login?redirect=%2Fdashboard%3Ftab%3Dholdings%23chart");
  });

  it("fetchWithAuthRedirect sends X-Trefolio-Screen for API calls", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    globalThis.fetch = fetchMock;

    await fetchWithAuthRedirect("/api/holdings");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get("x-trefolio-screen")).toBe("screen:dashboard");
  });

  it("does not redirect on public demo route even when an api returns 401", () => {
    window.history.replaceState({}, "", "/demo");

    const redirected = maybeRedirectToLogin(new Response(null, { status: 401 }), "/api/notifications");

    expect(redirected).toBe(false);
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
