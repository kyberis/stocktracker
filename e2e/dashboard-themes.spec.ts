import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import { createTestUser, ensureLoggedOut, loginViaUI, dismissOverlays } from "./helpers";

/**
 * Set the dashboard theme for the current session via API.
 */
async function setThemeViaAPI(request: APIRequestContext, theme: string) {
  const res = await request.put("/api/user-settings", {
    data: { dashboardTheme: theme },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.dashboardTheme).toBe(theme);
}

/**
 * Set the user's subscription plan via the admin API.
 */
async function setPlanViaAdmin(
  request: APIRequestContext,
  userId: string,
  plan: "free" | "starter" | "pro",
) {
  const res = await request.post("/api/admin/users", {
    data: { action: "setPlan", userId, plan },
  });
  expect(res.status()).toBe(200);
}

/**
 * Get the current user info.
 */
async function getMe(request: APIRequestContext) {
  const res = await request.get("/api/auth/me");
  expect(res.status()).toBe(200);
  return (await res.json()).user;
}

/**
 * Get the current theme class applied on <html>.
 */
async function getHtmlClasses(page: Page): Promise<string[]> {
  return page.evaluate(() => Array.from(document.documentElement.classList));
}

/**
 * Open the settings modal from the dashboard.
 */
async function openSettings(page: Page) {
  const settingsBtn = page.locator('button[title="Settings"], button[title="Configuración"]');
  await settingsBtn.click();
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
}

test.describe("Dashboard Themes", () => {
  test.describe("Theme API", () => {
    test.beforeEach(async ({ request }) => {
      await ensureLoggedOut(request);
    });

    test("GET returns default theme for new user", async ({ request }) => {
      await createTestUser(request);
      const res = await request.get("/api/user-settings");
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.dashboardTheme).toBe("default");
    });

    test("PUT persists theme preference", async ({ request }) => {
      await createTestUser(request);

      await setThemeViaAPI(request, "terminal");

      const res = await request.get("/api/user-settings");
      const body = await res.json();
      expect(body.dashboardTheme).toBe("terminal");
    });

    test("PUT rejects invalid theme value", async ({ request }) => {
      await createTestUser(request);

      const res = await request.put("/api/user-settings", {
        data: { dashboardTheme: "nonexistent" },
      });
      expect(res.status()).not.toBe(200);
    });
  });

  test.describe("Default Theme", () => {
    test("renders dashboard with no theme class on html", async ({
      page,
      request,
    }) => {
      test.setTimeout(45_000);
      await ensureLoggedOut(request);
      const creds = await createTestUser(request, true);
      await loginViaUI(page, creds.email, creds.password);
      await dismissOverlays(page);

      const classes = await getHtmlClasses(page);
      expect(classes).not.toContain("theme-terminal");
      expect(classes).not.toContain("theme-canvas");
      expect(classes).not.toContain("theme-studio");
    });

    test("dark/light toggle is visible", async ({ page, request }) => {
      test.setTimeout(45_000);
      await ensureLoggedOut(request);
      const creds = await createTestUser(request, true);
      await loginViaUI(page, creds.email, creds.password);
      await dismissOverlays(page);

      const toggleBtn = page.locator(
        'button[aria-label="Dark mode"], button[aria-label="Light mode"]',
      );
      await expect(toggleBtn).toBeVisible({ timeout: 5000 });
    });

    test("app navigation bar is present (no sidebar)", async ({ page, request }) => {
      test.setTimeout(45_000);
      await ensureLoggedOut(request);
      const creds = await createTestUser(request, true);
      await loginViaUI(page, creds.email, creds.password);
      await dismissOverlays(page);

      await expect(page.locator("header").first()).toBeVisible();
      await expect(page.locator("aside")).not.toBeVisible();
    });

    test("core dashboard elements render", async ({ page, request }) => {
      test.setTimeout(45_000);
      await ensureLoggedOut(request);
      const creds = await createTestUser(request, true);
      await loginViaUI(page, creds.email, creds.password);
      await dismissOverlays(page);

      await expect(page.getByText(/Portfolio|Cartera/i).first()).toBeVisible();
      await expect(page.getByText(/holdings/i).first()).toBeVisible();
    });
  });

  test.describe("Terminal Theme", () => {
    test("applies theme-terminal class on html and forces dark", async ({
      page,
      request,
    }) => {
      test.setTimeout(45_000);
      await ensureLoggedOut(request);
      const creds = await createTestUser(request, true);
      await setThemeViaAPI(request, "terminal");
      await loginViaUI(page, creds.email, creds.password);
      await dismissOverlays(page);

      const classes = await getHtmlClasses(page);
      expect(classes).toContain("theme-terminal");
      expect(classes).toContain("dark");
    });

    test("dark/light toggle is hidden (forced dark)", async ({ page, request }) => {
      test.setTimeout(45_000);
      await ensureLoggedOut(request);
      const creds = await createTestUser(request, true);
      await setThemeViaAPI(request, "terminal");
      await loginViaUI(page, creds.email, creds.password);
      await dismissOverlays(page);

      const toggleBtn = page.locator(
        'button[aria-label="Dark mode"], button[aria-label="Light mode"]',
      );
      await expect(toggleBtn).not.toBeVisible({ timeout: 3000 });
    });

    test("font family is IBM Plex Mono", async ({ page, request }) => {
      test.setTimeout(45_000);
      await ensureLoggedOut(request);
      const creds = await createTestUser(request, true);
      await setThemeViaAPI(request, "terminal");
      await loginViaUI(page, creds.email, creds.password);
      await dismissOverlays(page);

      const fontPrimary = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue("--font-primary").trim(),
      );
      expect(fontPrimary).toContain("IBM Plex Mono");
    });

    test("core dashboard elements still render", async ({ page, request }) => {
      test.setTimeout(45_000);
      await ensureLoggedOut(request);
      const creds = await createTestUser(request, true);
      await setThemeViaAPI(request, "terminal");
      await loginViaUI(page, creds.email, creds.password);
      await dismissOverlays(page);

      await expect(page.getByText(/Portfolio|Cartera/i).first()).toBeVisible();
      await expect(page.getByText(/holdings/i).first()).toBeVisible();
    });

    test("no sidebar — uses top navigation", async ({ page, request }) => {
      test.setTimeout(45_000);
      await ensureLoggedOut(request);
      const creds = await createTestUser(request, true);
      await setThemeViaAPI(request, "terminal");
      await loginViaUI(page, creds.email, creds.password);
      await dismissOverlays(page);

      await expect(page.locator("header").first()).toBeVisible();
      await expect(page.locator("aside")).not.toBeVisible();
    });
  });

  test.describe("Canvas Theme", () => {
    test("applies theme-canvas class on html and forces light", async ({
      page,
      request,
    }) => {
      test.setTimeout(45_000);
      await ensureLoggedOut(request);
      const creds = await createTestUser(request, true);
      await setThemeViaAPI(request, "canvas");
      await loginViaUI(page, creds.email, creds.password);
      await dismissOverlays(page);

      const classes = await getHtmlClasses(page);
      expect(classes).toContain("theme-canvas");
      expect(classes).not.toContain("dark");
    });

    test("dark/light toggle is hidden (forced light)", async ({ page, request }) => {
      test.setTimeout(45_000);
      await ensureLoggedOut(request);
      const creds = await createTestUser(request, true);
      await setThemeViaAPI(request, "canvas");
      await loginViaUI(page, creds.email, creds.password);
      await dismissOverlays(page);

      const toggleBtn = page.locator(
        'button[aria-label="Dark mode"], button[aria-label="Light mode"]',
      );
      await expect(toggleBtn).not.toBeVisible({ timeout: 3000 });
    });

    test("font family is DM Sans", async ({ page, request }) => {
      test.setTimeout(45_000);
      await ensureLoggedOut(request);
      const creds = await createTestUser(request, true);
      await setThemeViaAPI(request, "canvas");
      await loginViaUI(page, creds.email, creds.password);
      await dismissOverlays(page);

      const fontPrimary = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue("--font-primary").trim(),
      );
      expect(fontPrimary).toContain("DM Sans");
    });

    test("core dashboard elements still render", async ({ page, request }) => {
      test.setTimeout(45_000);
      await ensureLoggedOut(request);
      const creds = await createTestUser(request, true);
      await setThemeViaAPI(request, "canvas");
      await loginViaUI(page, creds.email, creds.password);
      await dismissOverlays(page);

      await expect(page.getByText(/Portfolio|Cartera/i).first()).toBeVisible();
      await expect(page.getByText(/holdings/i).first()).toBeVisible();
    });
  });

  test.describe("Studio Theme", () => {
    test("applies theme-studio class on html and forces dark", async ({
      page,
      request,
    }) => {
      test.setTimeout(45_000);
      await ensureLoggedOut(request);
      const creds = await createTestUser(request, true);
      await setThemeViaAPI(request, "studio");
      await loginViaUI(page, creds.email, creds.password);
      await dismissOverlays(page);

      const classes = await getHtmlClasses(page);
      expect(classes).toContain("theme-studio");
      expect(classes).toContain("dark");
    });

    test("sidebar navigation is visible on desktop", async ({ page, request }) => {
      test.setTimeout(45_000);
      await ensureLoggedOut(request);
      const creds = await createTestUser(request, true);
      await setThemeViaAPI(request, "studio");
      await loginViaUI(page, creds.email, creds.password);
      await dismissOverlays(page);

      await expect(page.locator("aside")).toBeVisible({ timeout: 5000 });
      await expect(page.locator("aside").getByText(/Portfolio|Cartera/i).first()).toBeVisible();
    });

    test("sidebar has expected navigation links", async ({ page, request }) => {
      test.setTimeout(45_000);
      await ensureLoggedOut(request);
      const creds = await createTestUser(request, true);
      await setThemeViaAPI(request, "studio");
      await loginViaUI(page, creds.email, creds.password);
      await dismissOverlays(page);

      const aside = page.locator("aside");
      await expect(aside.getByText(/Import|Importar/i).first()).toBeVisible();
      await expect(aside.getByText(/Tools|Herramientas/i).first()).toBeVisible();
    });

    test("font family is Plus Jakarta Sans", async ({ page, request }) => {
      test.setTimeout(45_000);
      await ensureLoggedOut(request);
      const creds = await createTestUser(request, true);
      await setThemeViaAPI(request, "studio");
      await loginViaUI(page, creds.email, creds.password);
      await dismissOverlays(page);

      const fontPrimary = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue("--font-primary").trim(),
      );
      expect(fontPrimary).toContain("Plus Jakarta Sans");
    });

    test("core dashboard elements still render", async ({ page, request }) => {
      test.setTimeout(45_000);
      await ensureLoggedOut(request);
      const creds = await createTestUser(request, true);
      await setThemeViaAPI(request, "studio");
      await loginViaUI(page, creds.email, creds.password);
      await dismissOverlays(page);

      await expect(page.getByText(/holdings/i).first()).toBeVisible();
    });
  });

  test.describe("Theme Persistence", () => {
    test("theme persists across page navigation", async ({ page, request }) => {
      test.setTimeout(45_000);
      await ensureLoggedOut(request);
      const creds = await createTestUser(request, true);
      await setThemeViaAPI(request, "terminal");
      await loginViaUI(page, creds.email, creds.password);
      await dismissOverlays(page);

      let classes = await getHtmlClasses(page);
      expect(classes).toContain("theme-terminal");

      await page.goto("/import");
      await page.waitForLoadState("networkidle");

      classes = await getHtmlClasses(page);
      expect(classes).toContain("theme-terminal");
    });

    test("theme persists after full page reload", async ({ page, request }) => {
      test.setTimeout(45_000);
      await ensureLoggedOut(request);
      const creds = await createTestUser(request, true);
      await setThemeViaAPI(request, "canvas");
      await loginViaUI(page, creds.email, creds.password);
      await dismissOverlays(page);

      let classes = await getHtmlClasses(page);
      expect(classes).toContain("theme-canvas");

      await page.reload();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      classes = await getHtmlClasses(page);
      expect(classes).toContain("theme-canvas");
    });
  });

  test.describe("Theme Selector in Settings", () => {
    test("shows theme selector with 4 options", async ({ page, request }) => {
      test.setTimeout(45_000);
      await ensureLoggedOut(request);
      const creds = await createTestUser(request, true);
      await loginViaUI(page, creds.email, creds.password);
      await dismissOverlays(page);

      await openSettings(page);

      const dialog = page.getByRole("dialog");
      await expect(dialog.getByText(/Dashboard Theme|Tema del Panel/i)).toBeVisible();

      await expect(dialog.getByText(/Default|Predeterminado/).first()).toBeVisible();
      await expect(dialog.getByText("Canvas").first()).toBeVisible();
      await expect(dialog.getByText("Terminal").first()).toBeVisible();
      await expect(dialog.getByText("Studio").first()).toBeVisible();
    });

    test("default theme card shows active checkmark", async ({ page, request }) => {
      test.setTimeout(45_000);
      await ensureLoggedOut(request);
      const creds = await createTestUser(request, true);
      await loginViaUI(page, creds.email, creds.password);
      await dismissOverlays(page);

      await openSettings(page);

      const defaultBtn = page.getByRole("button", {
        name: /Default.*theme|Predeterminado.*theme/i,
      });
      await expect(defaultBtn).toHaveAttribute("aria-pressed", "true");
    });

    test("free user sees locked themes", async ({ page, request }) => {
      test.setTimeout(45_000);
      await ensureLoggedOut(request);
      const creds = await createTestUser(request, true);
      await loginViaUI(page, creds.email, creds.password);
      await dismissOverlays(page);

      await openSettings(page);

      const dialog = page.getByRole("dialog");
      const upgradeTexts = dialog.getByText(/Upgrade to|Mejorar a/i);
      const count = await upgradeTexts.count();
      expect(count).toBeGreaterThanOrEqual(2);
    });
  });

  test.describe("Theme CSS Variables", () => {
    test("default theme has emerald accent", async ({ page, request }) => {
      test.setTimeout(45_000);
      await ensureLoggedOut(request);
      const creds = await createTestUser(request, true);
      await loginViaUI(page, creds.email, creds.password);
      await dismissOverlays(page);

      const accent = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue("--accent").trim(),
      );
      expect(accent).toBe("#10b981");
    });

    test("terminal theme overrides accent to #22c55e", async ({ page, request }) => {
      test.setTimeout(45_000);
      await ensureLoggedOut(request);
      const creds = await createTestUser(request, true);
      await setThemeViaAPI(request, "terminal");
      await loginViaUI(page, creds.email, creds.password);
      await dismissOverlays(page);

      const accent = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue("--accent").trim(),
      );
      expect(accent).toBe("#22c55e");
    });

    test("canvas theme overrides background to light", async ({ page, request }) => {
      test.setTimeout(45_000);
      await ensureLoggedOut(request);
      const creds = await createTestUser(request, true);
      await setThemeViaAPI(request, "canvas");
      await loginViaUI(page, creds.email, creds.password);
      await dismissOverlays(page);

      const bg = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue("--background").trim(),
      );
      expect(bg).toBe("#f8f9fb");
    });

    test("studio theme overrides border radius", async ({ page, request }) => {
      test.setTimeout(45_000);
      await ensureLoggedOut(request);
      const creds = await createTestUser(request, true);
      await setThemeViaAPI(request, "studio");
      await loginViaUI(page, creds.email, creds.password);
      await dismissOverlays(page);

      const radius = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue("--radius-card").trim(),
      );
      expect(radius).toBe("16px");
    });
  });

  test.describe("Cross-Page Theme Application", () => {
    test("theme applies on the import page", async ({ page, request }) => {
      test.setTimeout(45_000);
      await ensureLoggedOut(request);
      const creds = await createTestUser(request, true);
      await setThemeViaAPI(request, "terminal");
      await loginViaUI(page, creds.email, creds.password);
      await dismissOverlays(page);

      await page.goto("/import");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1500);

      const classes = await getHtmlClasses(page);
      expect(classes).toContain("theme-terminal");
      expect(classes).toContain("dark");
    });

    test("theme applies on the tools page", async ({ page, request }) => {
      test.setTimeout(45_000);
      await ensureLoggedOut(request);
      const creds = await createTestUser(request, true);
      await setThemeViaAPI(request, "canvas");
      await loginViaUI(page, creds.email, creds.password);
      await dismissOverlays(page);

      await page.goto("/tools");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1500);

      const classes = await getHtmlClasses(page);
      expect(classes).toContain("theme-canvas");
      expect(classes).not.toContain("dark");
    });

    test("theme applies on the profile page", async ({ page, request }) => {
      test.setTimeout(45_000);
      await ensureLoggedOut(request);
      const creds = await createTestUser(request, true);
      await setThemeViaAPI(request, "studio");
      await loginViaUI(page, creds.email, creds.password);
      await dismissOverlays(page);

      await page.goto("/profile");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1500);

      const classes = await getHtmlClasses(page);
      expect(classes).toContain("theme-studio");
      expect(classes).toContain("dark");
    });

    test("studio sidebar renders on import page", async ({ page, request }) => {
      test.setTimeout(45_000);
      await ensureLoggedOut(request);
      const creds = await createTestUser(request, true);
      await setThemeViaAPI(request, "studio");
      await loginViaUI(page, creds.email, creds.password);
      await dismissOverlays(page);

      await page.goto("/import");
      await page.waitForLoadState("networkidle");

      await expect(page.locator("aside")).toBeVisible({ timeout: 5000 });
    });
  });
});
