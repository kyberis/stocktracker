import { test, expect } from "@playwright/test";

test.describe("Landing holdings explorer feature", () => {
  test("shows the Warren holdings-explorer block and signup CTA", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/landing");
    await expect(
      page.getByRole("heading", { name: /Rank your positions\. Ask Warren about any number/i }),
    ).toBeVisible({ timeout: 20_000 });
    const cta = page.getByRole("link", { name: /Start with your portfolio/i });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "/signup");
    await expect(page.getByRole("img", { name: /Rank your positions/i })).toBeVisible();
  });
});
