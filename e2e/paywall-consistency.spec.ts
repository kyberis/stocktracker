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
    // ProCompareCard lists paid plans for a free user
    await expect(page.getByTestId("pro-compare-card").or(page.getByRole("button", { name: /Basic|Pro|Wealth/i }).first())).toBeVisible({ timeout: 5000 });

    // Tax Reports
    await page.goto("/tools/tax");
    await dismissOverlays(page);
    await expect(page.getByText(/tax report/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /Basic|Pro|Wealth|View plans/i }).first()).toBeVisible({ timeout: 5000 });

    // Screener
    await page.goto("/tools/screener");
    await dismissOverlays(page);
    await expect(page.getByText(/stock screener/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /Basic|Pro|Wealth|View plans/i }).first()).toBeVisible({ timeout: 5000 });
  });
});
