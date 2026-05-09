import { test, expect } from "@playwright/test";
import { createTestUser, ensureLoggedOut, loginViaUI, skipIfLegacyPasswordLoginUnavailable } from "./helpers";

/**
 * Email/password login when the IdP is not configured on the test server.
 * CI uses `E2E=1 npm start` without `IDP_CLIENT_SECRET` so local signup/login works.
 */

test.describe("Login UI", () => {
  test.beforeEach(async ({ request }) => {
    await ensureLoggedOut(request);
  });

  test("email and password login reaches dashboard", async ({ page, request }) => {
    const { email, password } = await createTestUser(request);
    await ensureLoggedOut(request);
    await loginViaUI(page, email, password);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("wrong password shows error and stays on login", async ({ page, request }) => {
    const { email, password } = await createTestUser(request);
    await ensureLoggedOut(request);
    await skipIfLegacyPasswordLoginUnavailable(page);
    await page.locator('input[autocomplete="username"]').fill(email);
    await page.locator('input[autocomplete="current-password"]').fill(`${password}_wrong`);
    await page.getByRole("button", { name: /^Sign in$/ }).click();
    await expect(page.getByText(/Invalid credentials/i)).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("unknown email shows error", async ({ page }) => {
    await skipIfLegacyPasswordLoginUnavailable(page);
    await page.locator('input[autocomplete="username"]').fill(`e2e_unknown_${Date.now()}@test.example.com`);
    await page.locator('input[autocomplete="current-password"]').fill("SomePass1!");
    await page.getByRole("button", { name: /^Sign in$/ }).click();
    await expect(page.getByText(/Invalid credentials/i)).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
