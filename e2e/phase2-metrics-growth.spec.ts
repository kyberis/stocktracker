import { test, expect } from "@playwright/test";
import { createTestUser, loginViaUI, dismissOverlays } from "./helpers";

const TEST_PASS = "TestPass123!";

test.describe("Phase 2 — Metrics and Growth Bifolio paywall", () => {
  let testEmail: string;

  test.beforeEach(async ({ request }) => {
    const user = await createTestUser(request, false);
    testEmail = user.email;
  });

  test("Free user sees Bifolio paywall on Metrics tab advanced metrics", async ({ page }) => {
    await loginViaUI(page, testEmail, TEST_PASS);
    await dismissOverlays(page);

    await page.getByRole("tab", { name: /metrics/i }).click();
    await expect(page.getByText(/upgrade.*bifolio/i).first()).toBeVisible({ timeout: 10000 });
  });

  test("Free user sees paywall when clicking non-1m range on Growth tab", async ({ page }) => {
    await loginViaUI(page, testEmail, TEST_PASS);
    await dismissOverlays(page);

    await page.getByRole("tab", { name: /growth/i }).click();
    await page.getByRole("button", { name: "3M" }).click();
    await expect(page.getByText(/upgrade.*bifolio/i).first()).toBeVisible({ timeout: 10000 });
  });
});
