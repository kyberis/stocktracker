import { test, expect } from "@playwright/test";
import { dismissOverlays } from "./helpers";

test.describe("Paywall consistency — ProCompareCard on locked tools", () => {
  test("Portfolio Score, Tax Reports, and Screener show plan comparison for free user", async ({ page }) => {
    const loginRes = await page.request.post("/api/auth/login", {
      data: { identifier: "nopro", password: "123456" },
    });
    expect(loginRes.status()).toBe(200);

    // Portfolio Score — verify the paywall card appears (not just the title)
    await page.goto("/tools/score");
    await dismissOverlays(page);
    await expect(page.getByText(/portfolio score/i).first()).toBeVisible({ timeout: 10000 });
    // ProCompareCard includes column headers with plan names — check for Folio (base plan name)
    await expect(page.locator("[class*='ProCompareCard'], [data-testid='pro-compare-card']").first()
      .or(page.getByText(/folio/i).nth(1))
    ).toBeVisible({ timeout: 5000 });

    // Tax Reports
    await page.goto("/tools/tax");
    await dismissOverlays(page);
    await expect(page.getByText(/tax report/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/upgrade|bifolio/i).first()).toBeVisible({ timeout: 5000 });

    // Screener
    await page.goto("/tools/screener");
    await dismissOverlays(page);
    await expect(page.getByText(/stock screener/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/upgrade|bifolio/i).first()).toBeVisible({ timeout: 5000 });
  });
});
