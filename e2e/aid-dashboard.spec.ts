import { test, expect, type Page } from "@playwright/test";
import { createTestUser, dismissOverlays, loginAsAdmin } from "./helpers";

async function waitForAidDashboard(page: Page) {
  await page.waitForResponse(
    (resp) => resp.url().includes("/api/aid/layout") && resp.status() === 200,
    { timeout: 45_000 },
  ).catch(() => {});
  await expect(page.locator("#aid-main")).toBeVisible({ timeout: 45_000 });
}

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
    await waitForAidDashboard(page);

    await expect(page.getByRole("heading", { name: /Investor Briefing|Briefing de inversor/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Portfolio value|Valor del portafolio/i).first()).toBeVisible();
    await expect(page.locator("#aid-main")).toBeVisible();
  });

  test("allocation and dividends modals open", async ({ page }) => {
    await page.goto("/aid");
    await dismissOverlays(page);
    await waitForAidDashboard(page);

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
    await waitForAidDashboard(page);

    await expect(page.getByRole("button", { name: /Warren/i })).toBeVisible({ timeout: 15000 });
  });

  test("digest, feed, status and insights APIs work with aid_beta", async ({ request }) => {
    const digest = await request.get("/api/aid/digest");
    expect(digest.status()).toBe(200);

    const feed = await request.get("/api/aid/feed");
    expect(feed.status()).toBe(200);
    const feedBody = await feed.json();
    expect(feedBody).toHaveProperty("priority");

    const status = await request.get("/api/aid/status");
    expect(status.status()).toBe(200);

    const finpulse = await request.get("/api/aid/finpulse?tab=market_voices");
    expect(finpulse.status()).toBe(200);

    const insights = await request.get("/api/aid/insights");
    expect(insights.status()).toBe(200);
    const body = await insights.json();
    expect(body).toHaveProperty("clara");
    expect(body).toHaveProperty("will");
  });

  test("briefing and priority sections render for seeded user", async ({ page }) => {
    await page.goto("/aid");
    await dismissOverlays(page);
    await waitForAidDashboard(page);

    await expect(page.locator("#aid-finpulse")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("#aid-news")).toBeVisible();
  });

  test("layout customize toggle is visible", async ({ page }) => {
    await page.goto("/aid");
    await dismissOverlays(page);
    await waitForAidDashboard(page);

    await expect(page.getByRole("button", { name: /Customize layout|Personalizar layout/i })).toBeVisible({
      timeout: 15000,
    });
  });

  test("layout API get and put work with aid_beta", async ({ request }) => {
    const getRes = await request.get("/api/aid/layout");
    expect(getRes.status()).toBe(200);
    const getBody = await getRes.json();
    expect(getBody.layout).toHaveProperty("main");
    expect(getBody.layout).toHaveProperty("sidebar");

    const putRes = await request.put("/api/aid/layout", {
      data: getBody.layout,
    });
    expect(putRes.status()).toBe(200);
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
    await waitForAidDashboard(page);

    await expect(page.getByText(/Welcome to trefolio|Bienvenido a trefolio/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("link", { name: /View demo|Ver demo/i })).toBeVisible();
  });

  test("redirects to home when aid_beta is off", async ({ request, page }) => {
    await request.put("/api/admin/feature-flags", { data: { flag: "aid_beta", enabled: false } });
    await page.goto("/aid");
    await page.waitForURL((url) => !url.pathname.includes("/aid"), { timeout: 15000 });
  });
});
