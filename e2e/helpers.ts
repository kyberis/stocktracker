import { type Page, type APIRequestContext, expect } from "@playwright/test";

export async function apiLogin(
  request: APIRequestContext,
  username: string,
  password: string,
) {
  return request.post("/api/auth/login", {
    data: { username, password },
  });
}

export async function apiSignup(
  request: APIRequestContext,
  username: string,
  password: string,
  seedWithData = false,
) {
  return request.post("/api/auth/signup", {
    data: { username, password, seedWithData },
  });
}

export async function loginViaUI(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.locator('input[autocomplete="username"]').fill(username);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.click('button[type="submit"]');
}

export async function ensureLoggedOut(request: APIRequestContext) {
  await request.post("/api/auth/logout");
}

/**
 * Create a fresh test user via API signup (returns 201).
 * The request context will carry the session cookie after this call.
 */
export async function createTestUser(request: APIRequestContext, seed = false) {
  const username = `e2e_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const password = "TestPass123!";
  const res = await apiSignup(request, username, password, seed);
  expect(res.status()).toBe(201);
  return { username, password };
}

/**
 * Login as admin. Handles the mustChangePassword flow transparently:
 * if the admin must change password, it changes it to ADMIN_NEW_PASS
 * and re-logs in so the session is clean.
 */
export async function loginAsAdmin(request: APIRequestContext) {
  const username = process.env.ADMIN_USERNAME || "admin";
  const initialPass = process.env.ADMIN_PASSWORD || "admin";
  const stablePass = "Admin123!";

  let login = await request.post("/api/auth/login", {
    data: { username, password: initialPass },
  });

  if (login.status() !== 200) {
    login = await request.post("/api/auth/login", {
      data: { username, password: stablePass },
    });
  }

  if (login.status() !== 200) return false;

  const body = await login.json();
  if (body.mustChangePassword || body.user?.mustChangePassword) {
    const currentPass = body.user?.mustChangePassword ? initialPass : stablePass;
    const chRes = await request.post("/api/auth/change-password", {
      data: { currentPassword: currentPass, newPassword: stablePass },
    });
    if (chRes.status() !== 200) return false;
  }

  return true;
}
