import { test, expect } from "@playwright/test";
import { createTestUser, loginViaUI, dismissOverlays } from "./helpers";

const TEST_PASS = "TestPass123!";

test.describe("Phase 2 — Metrics and Growth Pro paywall", () => {
  let testEmail: string;

  test.beforeEach(async ({ request }) => {
    const user = await createTestUser(request, false);
    testEmail = user.email;
  });

  test("Free user sees Pro paywall on Metrics tab advanced metrics", async ({ page }) => {
    await loginViaUI(page, testEmail, TEST_PASS);
    await dismissOverlays(page);

    await page.getByRole("tab", { name: /metrics/i }).click();
    // ProCompareCard should be visible for locked metrics
    await expect(page.getByText(/upgrade|pro/i).first()).toBeVisible({ timeout: 10000 });
  });

  test("Free user sees paywall when clicking non-1m range on Growth tab", async ({ page }) => {
    await loginViaUI(page, testEmail, TEST_PASS);
    await dismissOverlays(page);

    await page.getByRole("tab", { name: /growth/i }).click();
    // Click 3M range button
    await page.getByRole("button", { name: "3M" }).click();
    // Paywall should appear
    await expect(page.getByText(/upgrade|pro/i).first()).toBeVisible({ timeout: 10000 });
  });
});
