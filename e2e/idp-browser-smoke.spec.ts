import { test, expect } from "@playwright/test";

/**
 * Browser check for IdP-first login (no legacy password form).
 *
 * This file is **ignored** by Playwright unless `E2E_IDP_BROWSER=1` (see
 * `playwright.config.ts` `testIgnore`), so the default `webServer` bundle is
 * not started just for this spec.
 *
 * Run against a live IdP-first origin (Caddy + accounts + trefolio), e.g.:
 *
 *   E2E_IDP_BROWSER=1 E2E_BASE_URL=https://app.trefolio-dev.com npx playwright test e2e/idp-browser-smoke.spec.ts
 */
test("/login reaches the IdP authorize URL", async ({ page }) => {
  test.setTimeout(45_000);
  if (!process.env.E2E_BASE_URL) {
    test.skip(true, "Set E2E_BASE_URL to your IdP-first trefolio origin (unified dev stack).");
  }
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/oauth2\/authorize\?/, { timeout: 25_000 });
  const url = page.url();
  expect(url).toMatch(/\/oauth2\/authorize\?/);
  expect(url).toMatch(/client_id=/);
  expect(url).toMatch(/code_challenge=/);
});
