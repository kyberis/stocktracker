import { test, expect } from "@playwright/test";
import { dismissOverlays } from "./helpers";

test.describe.serial("Tools page — tier-based card layout", () => {
  test("pro/admin user sees all tools under Included, no upgrade sections", async ({ page }) => {
    // Login via page.request so cookies are shared with browser
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

    await page.goto("/tools");
    await dismissOverlays(page);

    await expect(page.getByText(/included in your plan/i).first()).toBeVisible({ timeout: 10000 });

    // No "Upgrade" links should be visible
    const upgradeButtons = page.getByRole("link", { name: /upgrade/i });
    await expect(upgradeButtons).toHaveCount(0);
  });

  test("free user sees Bifolio and Trefolio upgrade sections", async ({ page }) => {
    const loginRes = await page.request.post("/api/auth/login", {
      data: { identifier: "nopro", password: "123456" },
    });
    expect(loginRes.status()).toBe(200);

    await page.goto("/tools");
    await dismissOverlays(page);

    await expect(page.getByText(/included in your plan/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Bifolio").first()).toBeVisible();
    await expect(page.getByText("Trefolio").first()).toBeVisible();

    // Upgrade links present
    const upgradeLinks = page.getByRole("link", { name: /upgrade/i });
    expect(await upgradeLinks.count()).toBeGreaterThanOrEqual(2);
  });
});
