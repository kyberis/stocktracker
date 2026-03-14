import { test, expect } from "@playwright/test";
import { createTestUser, loginViaUI, dismissOverlays } from "./helpers";

const TEST_PASS = "TestPass123!";

test.describe("Phase 1 — Diversification, Dividends, Stealth Mode", () => {
  let testEmail: string;

  test.beforeEach(async ({ request }) => {
    const user = await createTestUser(request, false);
    testEmail = user.email;
  });

  test("Dashboard tabs include Diversification and Dividends", async ({ page }) => {
    await loginViaUI(page, testEmail, TEST_PASS);
    await dismissOverlays(page);

    const tabs = page.getByRole("tab");
    await expect(tabs.filter({ hasText: /diversification/i })).toBeVisible();
    await expect(tabs.filter({ hasText: /dividend/i })).toBeVisible();
  });

  test("Diversification tab renders tabpanel", async ({ page }) => {
    await loginViaUI(page, testEmail, TEST_PASS);
    await dismissOverlays(page);

    await page.getByRole("tab", { name: /diversification/i }).click();
    await expect(page.getByRole("tabpanel")).toBeVisible();
  });

  test("Dividends tab renders tabpanel", async ({ page }) => {
    await loginViaUI(page, testEmail, TEST_PASS);
    await dismissOverlays(page);

    const dividendTab = page.getByRole("tab", { name: /dividend/i });
    await dividendTab.scrollIntoViewIfNeeded();
    await dividendTab.click();
    await expect(page.getByRole("tabpanel")).toBeVisible();
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
