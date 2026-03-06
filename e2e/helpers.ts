import { type Page, type APIRequestContext, expect } from "@playwright/test";

export async function apiLogin(
  request: APIRequestContext,
  identifier: string,
  password: string,
) {
  return request.post("/api/auth/login", {
    data: { identifier, password },
  });
}

export async function apiSignup(
  request: APIRequestContext,
  email: string,
  password: string,
  seedWithData = false,
) {
  return request.post("/api/auth/signup", {
    data: { email, password, seedWithData },
  });
}

export async function loginViaUI(page: Page, identifier: string, password: string) {
  await page.goto("/login");
  await page.locator('input[autocomplete="username"]').fill(identifier);
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
  const slug = `e2e_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const email = `${slug}@test.example.com`;
  const password = "TestPass123!";
  const res = await apiSignup(request, email, password, seed);
  expect(res.status()).toBe(201);
  return { email, username: slug, password };
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
    data: { identifier: username, password: initialPass },
  });

  if (login.status() !== 200) {
    login = await request.post("/api/auth/login", {
      data: { identifier: username, password: stablePass },
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
