import { test, expect } from "@playwright/test";

/**
 * Demo dashboard ships seed holdings — verify Analysis / Moat quick links per position.
 */
test.describe("Holding research links on home", () => {
  test("demo portfolio rows expose Analysis and Moat links", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/demo");

    const links = page.getByTestId("holding-research-links").first();
    await expect(links).toBeVisible({ timeout: 30_000 });

    const analysis = links.getByTestId("holding-open-analysis");
    const moat = links.getByTestId("holding-open-moat");
    await expect(analysis).toBeVisible();
    await expect(moat).toBeVisible();

    await expect(analysis).toHaveAttribute("href", /\/analisis\/.+/);
    await expect(moat).toHaveAttribute("href", /\/stock\/.+\/evaluation/);
  });
});
