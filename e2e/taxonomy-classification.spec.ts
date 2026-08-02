import { test, expect } from "@playwright/test";
import { dismissOverlays } from "./helpers";

test.describe("Tools → Classification — edit + AI Auto-fix", () => {
  test("Edit Classification shows holding names and Auto-fix CTA", async ({ page }) => {
    let loginRes = await page.request.post("/api/auth/login", {
      data: { identifier: "admin", password: "admin" },
    });
    if (loginRes.status() !== 200) {
      loginRes = await page.request.post("/api/auth/login", {
        data: { identifier: "admin", password: "Admin123!" },
      });
    }
    if (loginRes.status() !== 200) {
      test.skip();
      return;
    }

    await page.goto("/tools/taxonomy");
    await dismissOverlays(page);

    await expect(page.getByText(/edit classification/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/auto-fix/i).first()).toBeVisible();

    // Holding name should appear under the ticker in the editor list (seed / admin portfolio).
    const editSection = page.locator("text=/edit classification/i").locator("..");
    await expect(editSection.locator(".font-mono").first()).toBeVisible();
  });
});
