import { test, expect, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";
import { adoptApiSessionInBrowser, dismissOverlays } from "./helpers";

async function skipAgentIntro(page: Page) {
  const skip = page.getByRole("button", { name: /^Skip$/i });
  if (await skip.isVisible({ timeout: 3000 }).catch(() => false)) {
    await skip.click({ force: true });
    await page.waitForTimeout(400);
  }
}

async function signupOrSkip(request: APIRequestContext, context: BrowserContext) {
  const slug = `e2e_dock_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const email = `test+${slug}@trefolio.com`;
  const password = "TestPass123!";
  const signupRes = await request.post("/api/auth/signup", {
    data: { email, password, seedWithData: false },
  });
  if (signupRes.status() === 429 || signupRes.status() === 410) {
    test.skip(true, `API signup unavailable (${signupRes.status()})`);
    return;
  }
  expect(signupRes.status()).toBe(201);
  await request
    .get("/api/auth/verify-email?token=trefolio-test-verify-000", { maxRedirects: 0 })
    .catch(() => {});
  await request.post("/api/auth/login", { data: { identifier: email, password } });
  await request.post("/api/auth/onboarding", {
    data: { displayName: slug, defaultCurrency: "EUR", importMethod: "skip" },
  });
  await adoptApiSessionInBrowser(request, context);
}

test.describe("Agent dock", () => {
  test.describe.configure({ timeout: 90_000 });

  test("desktop dock opens Warren and Feedback", async ({ page, request, context }) => {
    await signupOrSkip(request, context);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await dismissOverlays(page);
    await skipAgentIntro(page);

    const dock = page.getByTestId("agent-dock");
    await expect(dock).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("agent-dock-warren")).toBeVisible();
    await expect(page.getByTestId("agent-dock-clara")).toBeVisible();
    await expect(page.getByTestId("agent-dock-feedback")).toBeVisible();
    await expect(page.getByTestId("agent-dock-support")).toHaveCount(0);

    await page.getByTestId("agent-dock-warren").click();
    await expect(page.getByRole("dialog", { name: /Warren/i }).first()).toBeVisible({ timeout: 15_000 });
    await page.keyboard.press("Escape");

    await page.getByTestId("agent-dock-feedback").click();
    await expect(page.getByRole("dialog", { name: /Feedback/i })).toBeVisible({ timeout: 10_000 });
  });

  test("mobile FAB expands then opens Feedback", async ({ page, request, context }) => {
    await signupOrSkip(request, context);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await dismissOverlays(page);
    await skipAgentIntro(page);

    await expect(page.getByTestId("agent-dock-fab")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("agent-dock")).toBeHidden();

    await page.getByTestId("agent-dock-fab").click();
    const sheet = page.getByTestId("agent-dock-sheet");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("button", { name: /Warren/i })).toBeVisible();
    await expect(sheet.getByRole("button", { name: /Clara/i })).toBeVisible();

    await sheet.getByRole("button", { name: /Feedback/i }).click();
    await expect(page.getByRole("dialog", { name: /Feedback/i })).toBeVisible({ timeout: 10_000 });
  });

  test("demo dock sends Warren to signup", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/demo");
    await dismissOverlays(page);
    await expect(page.getByTestId("agent-dock")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("agent-dock-feedback")).toHaveCount(0);
    await page.getByTestId("agent-dock-warren").click();
    await expect(page).toHaveURL(/\/signup/);
  });
});
