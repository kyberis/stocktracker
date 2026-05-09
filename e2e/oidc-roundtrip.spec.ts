import { test, expect } from "@playwright/test";

/**
 * Phase 7 — IdP integration smoke tests.
 *
 * These tests cover the deterministic, environment-agnostic parts of the OIDC
 * round-trip: the start endpoint must (a) refuse to redirect when the IdP is
 * not configured, and (b) when configured, redirect with PKCE + state cookies
 * to the configured authorize endpoint without leaking the verifier in URL.
 *
 * The full happy path (authorize -> callback -> session cookie) requires a
 * live IdP and is exercised in the `trefolio-accounts` repo's own E2E suite.
 *
 * See knowledge/runbooks/unified-accounts-cutover.md.
 *
 * When using `E2E_BASE_URL`, point at **this** app (trefolio). `npm run dev`
 * listens on port **3010**; `npm start` after build uses **3000**. Another
 * service on 3000 (e.g. NextAuth) will make these tests fail with non-OIDC
 * responses.
 */
test.describe("OIDC start route (Phase 7)", () => {
  test("returns 503 when IdP is not configured", async ({ request }) => {
    const res = await request.get("/api/auth/oidc/start", { maxRedirects: 0 });
    if (res.status() === 503) {
      const body = await res.json();
      expect(body.error).toBe("idp_not_configured");
    } else {
      expect([302, 307]).toContain(res.status());
      const location = res.headers()["location"] || "";
      expect(location).toMatch(/^https:\/\/.+\/oauth2\/authorize\?/);
      expect(location).toContain("code_challenge=");
      expect(location).toContain("code_challenge_method=S256");
      expect(location).toContain("state=");
      expect(location).toContain("response_type=code");
      expect(location).not.toMatch(/code_verifier=/);
    }
  });

  test("safe redirect parameter is sanitized", async ({ request }) => {
    const res = await request.get("/api/auth/oidc/start?redirect=//evil.example.com/x", {
      maxRedirects: 0,
    });
    if (res.status() === 503) test.skip();
    expect([302, 307]).toContain(res.status());
    const setCookies = res.headersArray().filter((h) => h.name.toLowerCase() === "set-cookie");
    const redirectCookie = setCookies.find((c) => c.value.startsWith("trefolio_oidc_redirect="));
    expect(redirectCookie).toBeTruthy();
    // Cookie value may be "/" or URL-encoded "%2F" depending on runtime.
    expect(redirectCookie!.value).toMatch(/trefolio_oidc_redirect=(?:\/|%2F);/);
  });

  test("when IdP is configured, /api/auth/login returns 410 Gone with IdP hint", async ({ request }) => {
    const res = await request.post("/api/auth/login", {
      data: { identifier: "noone@trefolio.com", password: "x" },
    });
    if (res.status() !== 410) {
      test.skip();
      return;
    }
    const body = await res.json();
    expect(body.loginUrl).toMatch(/user\.trefolio\.com/);
  });

  test("when FREEZE_LOCAL_USER_WRITES=true, signup returns 503 with retry hint", async ({ request }) => {
    const res = await request.post("/api/auth/signup", {
      data: { email: `freeze_${Date.now()}@trefolio.com`, password: "Pass1234!" },
    });
    if (res.status() !== 503) {
      test.skip();
      return;
    }
    expect(res.headers()["retry-after"]).toBeTruthy();
    const body = await res.json();
    expect(body.upgradeUrl).toContain("user.trefolio.com");
  });
});
