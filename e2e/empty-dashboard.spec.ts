import { test, expect } from "@playwright/test";
import { dismissOverlays } from "./helpers";

test.describe("Empty dashboard — no premature upgrade prompts", () => {
  test("new user with 0 holdings sees empty state, no Compare Plans", async ({ page }) => {
    // Create a fresh test user via page.request
    const slug = `e2e_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const email = `test+${slug}@trefolio.com`;
    const password = "TestPass123!";

    const signupRes = await page.request.post("/api/auth/signup", {
      data: { email, password, seedWithData: false },
    });
    if (signupRes.status() === 429) {
      test.skip();
      return;
    }
    expect(signupRes.status()).toBe(201);

    // Verify email with static test token
    await page.request.get("/api/auth/verify-email?token=trefolio-test-verify-000", {
      maxRedirects: 0,
    }).catch(() => {});

    // Re-login to get verified session
    await page.request.post("/api/auth/login", {
      data: { identifier: email, password },
    });

    // Complete onboarding
    await page.request.post("/api/auth/onboarding", {
      data: { displayName: slug, defaultCurrency: "EUR", importMethod: "skip" },
    });

    await page.goto("/");
    await dismissOverlays(page);

    // Should see the empty portfolio view
    await expect(
      page.getByText(/start building your portfolio|import portfolio/i).first()
    ).toBeVisible({ timeout: 15000 });

    // ProCompareCard / "Compare Plans" should NOT be visible
    const comparePlans = page.getByText("Compare Plans");
    await expect(comparePlans).toHaveCount(0);
  });
});
