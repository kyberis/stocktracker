import { test, expect } from "@playwright/test";
import { createTestUser, ensureLoggedOut, loginViaUI, dismissOverlays } from "./helpers";

test.describe("Subscription tiering", () => {
  test.beforeEach(async ({ request }) => {
    await ensureLoggedOut(request);
  });

  test("free users are blocked from pro-only fundamentals endpoint", async ({ request }) => {
    await createTestUser(request);
    const res = await request.get("/api/fundamentals?symbol=AAPL&type=income");
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.reason).toMatch(/upgrade_required|rate_limited/);
    expect(body.feature).toBe("fundamentals");
  });

  test("profile shows upgrade CTAs for free users", async ({ page, request }) => {
    const creds = await createTestUser(request);
    await loginViaUI(page, creds.email, creds.password);
    await dismissOverlays(page);
    await page.goto("/profile");
    await expect(page.getByText("Free vs Pro").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Upgrade.*€4\.99/)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Upgrade.*€39\.99|€39\.99.*year/)).toBeVisible({ timeout: 5000 });
  });

  test("economic indicators shows contextual compare for free users", async ({ page, request }) => {
    const creds = await createTestUser(request);
    await loginViaUI(page, creds.email, creds.password);
    await dismissOverlays(page);
    await page.goto("/economic-indicators");
    await expect(page.getByText("Free vs Pro").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Explore premium economic indicators/)).toBeVisible({ timeout: 5000 });
  });
});
