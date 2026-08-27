import { test, expect } from "@playwright/test";

test.describe("real-estate zone screening", () => {
  test("entry is flag-gated (404 shell or redirect when off)", async ({ page }) => {
    await page.goto("/real-estate/screening", { waitUntil: "domcontentloaded" });
    const heading = page.getByRole("heading", { name: /zone|zona/i });
    const visible = await heading.isVisible({ timeout: 8_000 }).catch(() => false);
    if (!visible) {
      await expect(page).toHaveURL(/\/($|\?)/);
      return;
    }
    await expect(page.getByRole("button", { name: /analizar zona|analyze zone/i })).toBeVisible();
    await expect(page.getByText(/330|entrada|down payment/i).first()).toBeVisible();
  });
});
