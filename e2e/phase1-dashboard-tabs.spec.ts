import { test, expect } from "@playwright/test";
import { createTestUser, loginViaUI, dismissOverlays } from "./helpers";

const TEST_PASS = "TestPass123!";

/**
 * These views used to live behind an ARIA tablist on the default post-login
 * dashboard. Since the April 2026 nav refactor (`?tab=` URLs, tools
 * registry), the default post-login route is Home v2, which links out to
 * Diversification/Dividends via /tools/* instead of an in-page tablist —
 * that ARIA-tab markup now only exists on the opt-in /classic dashboard.
 * These tests were asserting on markup that no longer renders for ~100% of
 * users; updated to navigate to the real current routes instead.
 */
test.describe("Phase 1 — Diversification, Dividends, Stealth Mode", () => {
  let testEmail: string;

  test.beforeEach(async ({ request }) => {
    const user = await createTestUser(request, false);
    testEmail = user.email;
  });

  test("Diversification (/tools/taxonomy) renders the classification breakdown", async ({ page }) => {
    await loginViaUI(page, testEmail, TEST_PASS);
    await dismissOverlays(page);

    await page.goto("/tools/taxonomy", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Sector" })).toBeVisible();
  });

  test("Dividends (/tools/dividends) renders", async ({ page }) => {
    await loginViaUI(page, testEmail, TEST_PASS);
    await dismissOverlays(page);

    await page.goto("/tools/dividends", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("No dividends yet")).toBeVisible();
  });

  test("Stealth mode toggle exists in nav with aria-pressed", async ({ page }) => {
    await loginViaUI(page, testEmail, TEST_PASS);
    await dismissOverlays(page);

    const stealthBtn = page.getByRole("button", { name: /stealth mode/i }).first();
    await expect(stealthBtn).toBeVisible();
    const initialPressed = await stealthBtn.getAttribute("aria-pressed");
    expect(initialPressed).toBe("false");

    await stealthBtn.click();
    const pressedAfter = await stealthBtn.getAttribute("aria-pressed");
    expect(pressedAfter).toBe("true");
  });
});
