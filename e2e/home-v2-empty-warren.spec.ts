import { test, expect } from "@playwright/test";
import { dismissOverlays } from "./helpers";

test.describe("Home v2 empty Warren add-stock", () => {
  test("empty portfolio shows Warren add-stock hint and limit copy", async ({ page }) => {
    const slug = `e2e_warren_empty_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
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

    await page.request
      .get("/api/auth/verify-email?token=trefolio-test-verify-000", { maxRedirects: 0 })
      .catch(() => {});

    await page.request.post("/api/auth/login", {
      data: { identifier: email, password },
    });

    await page.request.post("/api/auth/onboarding", {
      data: { displayName: slug, defaultCurrency: "EUR", importMethod: "skip" },
    });

    await page.goto("/");
    await dismissOverlays(page);

    const warrenBox = page.getByTestId("empty-warren-chat");
    await expect(warrenBox).toBeVisible({ timeout: 20_000 });
    await expect(warrenBox.getByText(/only help add stocks|solo puede ayudarte a añadir/i)).toBeVisible();
    await expect(warrenBox.getByText(/10|15/)).toBeVisible();
  });
});
