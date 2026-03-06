import { test, expect } from "@playwright/test";
import { ensureLoggedOut, createTestUser } from "./helpers";

test.describe("Authentication", () => {
  test.beforeEach(async ({ request }) => {
    await ensureLoggedOut(request);
  });

  test("shows landing page for unauthenticated users", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/");
    await expect(page.getByText("Simple and Powerful")).toBeVisible();
  });

  test("rejects invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[autocomplete="username"]').fill("nonexistent@example.com");
    await page.locator('input[autocomplete="current-password"]').fill("badpassword");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/login/);
  });

  test("signup creates account and redirects", async ({ page }) => {
    const email = `e2e_signup_${Date.now()}@test.example.com`;
    const password = "SecurePass1!";

    await page.goto("/signup");
    await page.locator('input[autocomplete="email"]').fill(email);
    const pwInputs = page.locator('input[autocomplete="new-password"]');
    await pwInputs.nth(0).fill(password);
    await pwInputs.nth(1).fill(password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(verify-email)?$/, { timeout: 10_000 });
    await expect(page).not.toHaveURL(/\/signup/);
  });

  test("signup rejects duplicate email via API", async ({ request }) => {
    const { email } = await createTestUser(request);
    await ensureLoggedOut(request);

    const dup = await request.post("/api/auth/signup", {
      data: { email, password: "AnotherPass1!" },
    });
    expect(dup.status()).not.toBe(201);
  });

  test("logout clears session via API", async ({ request }) => {
    await createTestUser(request);

    const me1 = await request.get("/api/auth/me");
    expect(me1.status()).toBe(200);

    await ensureLoggedOut(request);

    const me2 = await request.get("/api/auth/me");
    expect(me2.status()).toBe(401);
  });

  test("change password via API works", async ({ request }) => {
    const { email, password } = await createTestUser(request);
    const newPassword = "NewPass2!";

    const chRes = await request.post("/api/auth/change-password", {
      data: { currentPassword: password, newPassword },
    });
    expect(chRes.status()).toBe(200);

    await ensureLoggedOut(request);

    const loginOld = await request.post("/api/auth/login", {
      data: { identifier: email, password },
    });
    expect(loginOld.status()).not.toBe(200);

    const loginNew = await request.post("/api/auth/login", {
      data: { identifier: email, password: newPassword },
    });
    expect(loginNew.status()).toBe(200);
  });

  test("delete account removes user and prevents login", async ({ request }) => {
    const { email, password } = await createTestUser(request);

    const delRes = await request.post("/api/auth/delete-account", {
      data: { password },
    });
    expect(delRes.status()).toBe(200);

    const loginRes = await request.post("/api/auth/login", {
      data: { identifier: email, password },
    });
    expect(loginRes.status()).not.toBe(200);
  });

  test("/api/auth/me returns current user info", async ({ request }) => {
    await createTestUser(request);

    const me = await request.get("/api/auth/me");
    expect(me.status()).toBe(200);
    const body = await me.json();
    expect(body.user.email).toBeTruthy();
  });
});
