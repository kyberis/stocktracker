import { test, expect } from "@playwright/test";
import { dismissOverlays } from "./helpers";

test.describe("Daily move last-update time", () => {
  test("demo dashboard shows as-of time next to daily G/L", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/demo");
    await dismissOverlays(page);

    const asOf = page.getByTestId("day-move-as-of").first();
    await expect(asOf).toBeVisible({ timeout: 30_000 });
    await expect(asOf).toHaveText(/·/);
    await expect(asOf).toHaveAttribute("datetime", /\d{4}-\d{2}-\d{2}T/);
  });

  test("mobile demo shows as-of time next to daily G/L", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/demo");
    await dismissOverlays(page);

    const asOf = page.getByTestId("day-move-as-of").first();
    await expect(asOf).toBeVisible({ timeout: 30_000 });
    await expect(asOf).toHaveText(/·/);
  });

  test("advanced hero still shows as-of time", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/demo");
    await dismissOverlays(page);

    const advanced = page.getByRole("button", { name: /advanced|avanzado/i }).first();
    if (await advanced.isVisible().catch(() => false)) {
      await advanced.click();
    }

    const asOf = page.getByTestId("day-move-as-of").first();
    await expect(asOf).toBeVisible({ timeout: 30_000 });
    await expect(asOf).toHaveText(/·/);
  });
});
