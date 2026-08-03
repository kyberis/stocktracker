import { type Page, type APIRequestContext, type BrowserContext, expect, test } from "@playwright/test";

/**
 * Hand the session held by an `APIRequestContext` to the browser.
 *
 * The `request` fixture keeps its own cookie jar, so a spec that authenticates
 * over the API and then drives `page` would browse as an anonymous visitor.
 * Driving `/login` instead is not an option: since the unified IdP took over,
 * that page is a redirect bridge with no password form.
 */
export async function adoptApiSessionInBrowser(
  request: APIRequestContext,
  context: BrowserContext,
) {
  const { cookies } = await request.storageState();
  await context.addCookies(cookies);
}

/**
 * When the IdP is configured, `/login` shows the unified-account bridge (no local
 * password form). Call from specs that need the legacy email/password UI.
 */
export async function skipIfLegacyPasswordLoginUnavailable(page: Page) {
  await page.goto("/login", { waitUntil: "domcontentloaded", timeout: 20_000 });
  const userField = page.locator('input[autocomplete="username"]');
  const ok = await userField.isVisible({ timeout: 12_000 }).catch(() => false);
  if (!ok) {
    test.skip(
      true,
      "Local email/password login is unavailable when the unified IdP is enabled. Use the default Playwright webServer (E2E=1) without IDP_* set, or point E2E at an environment without IdP client credentials.",
    );
  }
}

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
  await page.goto("/login", { waitUntil: "domcontentloaded", timeout: 20_000 });
  const userField = page.locator('input[autocomplete="username"]');
  if (!(await userField.isVisible({ timeout: 12_000 }).catch(() => false))) {
    test.skip(
      true,
      "Local email/password login is unavailable when the unified IdP is enabled. Use the default Playwright webServer (E2E=1) without IDP_* set.",
    );
  }
  await userField.fill(identifier);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole("button", { name: /^Sign in$/ }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 });
  await dismissOverlays(page);
  await expect(
    page.getByText(/Welcome to trefolio|Portfolio Value|Total Net Worth|Portfolio Performance|Import Portfolio/i).first()
  ).toBeVisible({ timeout: 20_000 });
}

export async function dismissOverlays(page: Page) {
  // Cookie banner has z-[9999] and sits on top of everything — dismiss first
  const cookieAccept = page.getByRole("button", { name: "Accept" });
  if (await cookieAccept.isVisible({ timeout: 2000 }).catch(() => false)) {
    await cookieAccept.click({ force: true, timeout: 5_000 }).catch(() => undefined);
    await page.waitForTimeout(300);
  }

  // What's New modal sits above the dashboard
  const whatsNewClose = page.getByRole("button", { name: "Got it" });
  if (await whatsNewClose.isVisible({ timeout: 2000 }).catch(() => false)) {
    await whatsNewClose.click({ force: true });
    await page.waitForTimeout(500);
  }

  // Theme tour wizard (can appear after the first paint on AID)
  const themeTour = page.getByRole("dialog", { name: /Theme tour/i });
  if (await themeTour.isVisible({ timeout: 2000 }).catch(() => false)) {
    const skipTour = page.getByRole("button", { name: /Skip tour|Saltar/i });
    if (await skipTour.isVisible({ timeout: 1000 }).catch(() => false)) {
      await skipTour.click({ force: true });
    } else {
      await page.keyboard.press("Escape");
    }
    await page.waitForTimeout(500);
  } else {
    const skipTour = page.getByRole("button", { name: "Skip tour" });
    if (await skipTour.isVisible({ timeout: 1000 }).catch(() => false)) {
      await skipTour.click({ force: true });
      await page.waitForTimeout(500);
    }
  }

  // Secure Your Account prompt
  const maybeLater = page.getByRole("button", { name: "Maybe later" });
  if (await maybeLater.isVisible({ timeout: 1000 }).catch(() => false)) {
    await maybeLater.click({ force: true });
    await page.waitForTimeout(500);
  }
}

export async function ensureLoggedOut(request: APIRequestContext) {
  await request.post("/api/auth/logout");
}

/**
 * Static verification token shared by all test+*@trefolio.com accounts.
 * The verify-email route resolves the user from the session when this token is used.
 */
export const TEST_VERIFICATION_TOKEN = "trefolio-test-verify-000";

/**
 * Create a fresh test user via API signup, auto-verify email, and complete onboarding.
 * Uses test+slug@trefolio.com with deterministic verification tokens.
 * The request context will carry the session cookie after this call.
 */
export async function createTestUser(request: APIRequestContext, seed = false) {
  const slug = `e2e_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const email = `test+${slug}@trefolio.com`;
  const password = "TestPass123!";
  const res = await apiSignup(request, email, password, seed);
  const raw = await res.text();
  if (res.status() !== 201) {
    throw new Error(
      `POST /api/auth/signup expected 201, got ${res.status()}. Run the app with E2E=1 (Playwright webServer does this). Body: ${raw.slice(0, 600)}`,
    );
  }
  const body = JSON.parse(raw) as { user?: { id?: string } };
  const userId = body.user?.id || "";

  // Auto-verify email via static test token (session resolves the user)
  await request.get(`/api/auth/verify-email?token=${TEST_VERIFICATION_TOKEN}`, {
    maxRedirects: 0,
  }).catch(() => {});

  // Re-login to get a session with emailVerified: true
  await request.post("/api/auth/login", {
    data: { identifier: email, password },
  });

  // Complete onboarding so tests land on the dashboard
  await request.post("/api/auth/onboarding", {
    data: {
      displayName: slug,
      defaultCurrency: "EUR",
      importMethod: seed ? undefined : "skip",
    },
  });

  return { email, username: slug, password, userId };
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

/**
 * Set up a social profile for the current session via API.
 * Requires the user to be logged in (session cookie on `request`).
 */
export async function setupSocialProfile(
  request: APIRequestContext,
  slug: string,
  bio: string,
  headline: string,
  visibility: "public" | "private" = "public",
) {
  const res = await request.put("/api/social/profile", {
    data: {
      profileSlug: slug,
      bio,
      headline,
      socialVisibility: visibility,
      experienceLevel: "intermediate",
    },
  });
  expect(res.status()).toBe(200);
  return res.json();
}

/**
 * Create a social post for the current session via API.
 */
export async function createSocialPost(
  request: APIRequestContext,
  title: string,
  content: string,
  postType = "article",
  visibility = "public",
  isDraft = false,
) {
  const res = await request.post("/api/social/posts", {
    data: {
      title,
      content: `<p>${content}</p>`,
      contentFormat: "html",
      visibility,
      postType,
      isDraft,
    },
  });
  expect(res.status()).toBe(201);
  return res.json();
}

/**
 * Send a connection request from the current session to `targetUserId`.
 */
export async function sendConnectionRequest(
  request: APIRequestContext,
  targetUserId: string,
) {
  const res = await request.post("/api/social/connections", {
    data: { targetUserId },
  });
  expect(res.status()).toBe(201);
  return res.json();
}

/**
 * Accept a pending connection request.
 */
export async function acceptConnection(
  request: APIRequestContext,
  connectionId: string,
) {
  const res = await request.put(`/api/social/connections/${connectionId}`, {
    data: { action: "accept" },
  });
  expect(res.status()).toBe(200);
}
