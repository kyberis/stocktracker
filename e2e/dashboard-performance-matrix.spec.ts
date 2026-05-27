import { test, expect } from "@playwright/test";
import { createTestUser, loginViaUI, dismissOverlays } from "./helpers";

test.describe("Portfolio performance matrix", () => {
  test.beforeEach(async ({ page, request }) => {
    const user = await createTestUser(request);
    await loginViaUI(page, user.email, user.password);
    await dismissOverlays(page);
    await page.goto("/");
  });

  test("dashboard hero shows performance matrix and view chart link", async ({ page }) => {
    await expect(page.getByRole("region", { name: /performance by period|rendimiento por periodo/i })).toBeVisible({
      timeout: 15000,
    });
    const viewChart = page.getByRole("link", { name: /view chart|ver gráfico/i });
    await expect(viewChart).toBeVisible();
    await expect(viewChart).toHaveAttribute("href", /\/portfolio\?view=chart#chart/);
  });

  test("/portfolio page includes evolution chart section", async ({ page }) => {
    await page.goto("/portfolio");
    await expect(page.getByRole("region", { name: /performance by period|rendimiento por periodo/i })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator("#chart")).toBeVisible({ timeout: 15000 });
  });
});
