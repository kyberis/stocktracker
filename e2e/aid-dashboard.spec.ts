import { test, expect } from "@playwright/test";
import { createTestUser, dismissOverlays, loginAsAdmin } from "./helpers";

test.describe("AID dashboard", () => {
  test.beforeEach(async ({ request }) => {
    const adminOk = await loginAsAdmin(request);
    expect(adminOk).toBe(true);
    const flagRes = await request.put("/api/admin/feature-flags", {
      data: { flag: "aid_beta", enabled: true },
    });
    expect(flagRes.status()).toBe(200);
    await createTestUser(request, true);
  });

  test("seeded user with aid_beta sees AID dashboard", async ({ page }) => {
    await page.goto("/aid");
    await dismissOverlays(page);

    await expect(page.getByRole("heading", { name: "AID" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Portfolio value|Valor del portafolio/i).first()).toBeVisible();
    await expect(page.locator("#aid-main")).toBeVisible();
  });

  test("allocation and dividends modals open", async ({ page }) => {
    await page.goto("/aid");
    await dismissOverlays(page);

    await page.getByRole("button", { name: /Allocation|Asignación/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: /Close|Cerrar/i }).click();

    await page.getByRole("button", { name: /Dividends|Dividendos/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("mobile shows Warren sheet opener", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/aid");
    await dismissOverlays(page);

    await expect(page.getByRole("button", { name: /Warren/i })).toBeVisible({ timeout: 15000 });
  });

  test("digest and insights APIs work with aid_beta", async ({ request }) => {
    const digest = await request.get("/api/aid/digest");
    expect(digest.status()).toBe(200);

    const insights = await request.get("/api/aid/insights");
    expect(insights.status()).toBe(200);
    const body = await insights.json();
    expect(body).toHaveProperty("clara");
    expect(body).toHaveProperty("will");
  });
});

test.describe("AID empty state", () => {
  test.beforeEach(async ({ request }) => {
    const adminOk = await loginAsAdmin(request);
    expect(adminOk).toBe(true);
    await request.put("/api/admin/feature-flags", { data: { flag: "aid_beta", enabled: true } });
    await createTestUser(request, false);
  });

  test("empty user sees welcome CTAs on AID", async ({ page }) => {
    await page.goto("/aid");
    await dismissOverlays(page);

    await expect(page.getByText(/Welcome to trefolio|Bienvenido a trefolio/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("link", { name: /View demo|Ver demo/i })).toBeVisible();
  });

  test("redirects to home when aid_beta is off", async ({ request, page }) => {
    await request.put("/api/admin/feature-flags", { data: { flag: "aid_beta", enabled: false } });
    await page.goto("/aid");
    await page.waitForURL((url) => !url.pathname.includes("/aid"), { timeout: 15000 });
  });
});
