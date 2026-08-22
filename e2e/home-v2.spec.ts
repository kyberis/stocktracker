import { test, expect } from "@playwright/test";
import { dismissOverlays } from "./helpers";

test.describe("Home v2 recommendations", () => {
  test("empty portfolio does not show recommendation card", async ({ page }) => {
    const slug = `e2e_rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
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

    await expect(page.getByTestId("home-recommendation-card")).toHaveCount(0);
    await expect(page.getByTestId("home-holdings-explorer-cta")).toHaveCount(0);
  });

  test("demo mode does not show recommendation card", async ({ page }) => {
    await page.goto("/demo");
    await dismissOverlays(page);
    await expect(page.getByTestId("home-recommendation-card")).toHaveCount(0);
    await expect(page.getByTestId("home-holdings-explorer-cta")).toHaveCount(0);
  });

  test("seeded user can load recommendations API", async ({ page }) => {
    const slug = `e2e_rec2_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const email = `test+${slug}@trefolio.com`;
    const password = "TestPass123!";

    const signupRes = await page.request.post("/api/auth/signup", {
      data: { email, password, seedWithData: true },
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

    const recRes = await page.request.get("/api/home-v2/recommendations");
    expect(recRes.ok()).toBeTruthy();
    const body = await recRes.json();
    expect(body).toHaveProperty("queue");
    expect(Array.isArray(body.queue)).toBe(true);

    await page.goto("/");
    await dismissOverlays(page);

    if (body.current) {
      await expect(page.getByTestId("home-recommendation-card")).toBeVisible({
        timeout: 20_000,
      });
    }
  });

  test("holdings list CTA opens holdings explorer", async ({ page }) => {
    const login = await page.request.post("/api/auth/login", {
      data: { identifier: "admin", password: "admin" },
    });
    if (login.status() !== 200) {
      const alt = await page.request.post("/api/auth/login", {
        data: { identifier: "admin", password: "Admin123!" },
      });
      if (alt.status() !== 200) {
        test.skip(true, "Local admin login unavailable (IdP-only environment).");
        return;
      }
    }
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await dismissOverlays(page);
    const cta = page.getByTestId("home-holdings-explorer-cta");
    await expect(cta).toBeVisible({ timeout: 20_000 });
    await expect(cta).toHaveAttribute("href", "/tools/holdings-explorer");
    await cta.click();
    await page.waitForURL(/\/tools\/holdings-explorer/);
    await expect(page.getByTestId("holdings-explorer")).toBeVisible({ timeout: 20_000 });
  });
});
