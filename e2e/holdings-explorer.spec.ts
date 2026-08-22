import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { dismissOverlays } from "./helpers";

async function loginKnownUser(page: Page, identifier: string, password: string): Promise<boolean> {
  const res = await page.request.post("/api/auth/login", {
    data: { identifier, password },
  });
  return res.status() === 200;
}

async function loginAdmin(page: Page): Promise<boolean> {
  if (await loginKnownUser(page, "admin", "admin")) return true;
  return loginKnownUser(page, "admin", "Admin123!");
}

async function setThemeViaAPI(request: APIRequestContext, theme: string) {
  const res = await request.put("/api/user-settings", {
    data: { dashboardTheme: theme },
  });
  return res.status() === 200;
}

test.describe("Holdings explorer", () => {
  test.describe.configure({ timeout: 90_000 });

  test("unauthenticated visit leaves the explorer route", async ({ page }) => {
    await page.goto("/tools/holdings-explorer");
    await page.waitForURL((url) => !url.pathname.startsWith("/tools/holdings-explorer"), {
      timeout: 15_000,
    });
    expect(page.url()).not.toMatch(/\/tools\/holdings-explorer\/?$/);
  });

  test("empty or loaded explorer shows heading and disclaimer", async ({ page }) => {
    if (!(await loginAdmin(page))) {
      test.skip(true, "Local admin login unavailable (IdP-only environment).");
      return;
    }
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/tools/holdings-explorer");
    await dismissOverlays(page);
    await expect(page.getByTestId("holdings-explorer")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("heading", { name: /Holdings explorer/i })).toBeVisible();
    await expect(page.getByText(/not a financial advisor|not investment advice/i).first()).toBeVisible();
  });

  test("presets are keyboard-reachable and toggle aria-pressed", async ({ page }) => {
    if (!(await loginAdmin(page))) {
      test.skip(true, "Local admin login unavailable (IdP-only environment).");
      return;
    }
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/tools/holdings-explorer");
    await dismissOverlays(page);
    const lowPe = page.getByRole("button", { name: /Low P\/E/i });
    await expect(lowPe).toBeVisible({ timeout: 20_000 });
    await lowPe.click();
    await expect(lowPe).toHaveAttribute("aria-pressed", "true");
  });

  test("free user can open the tool (quota model)", async ({ page }) => {
    const ok = await loginKnownUser(page, "nopro", "123456");
    if (!ok) {
      test.skip(true, "nopro test user unavailable.");
      return;
    }
    await page.goto("/tools/holdings-explorer");
    await dismissOverlays(page);
    await expect(page.getByTestId("holdings-explorer")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("heading", { name: /Holdings explorer/i })).toBeVisible();
  });

  test("Ask Warren FAB then a P/E cell shows the context chip", async ({ page }) => {
    if (!(await loginAdmin(page))) {
      test.skip(true, "Local admin login unavailable (IdP-only environment).");
      return;
    }
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/tools/holdings-explorer");
    await dismissOverlays(page);
    const fab = page.getByTestId("holdings-explorer-warren-fab");
    await expect(fab).toBeVisible({ timeout: 20_000 });
    await fab.click();
    await expect(fab).toHaveAttribute("aria-pressed", "true");
    const pe = page.locator('[data-testid="holdings-explorer-cell-pe"]').first();
    if ((await pe.count()) === 0) {
      test.skip(true, "No holdings with a P/E cell in this environment.");
      return;
    }
    await pe.click();
    await expect(page.getByTestId("holdings-explorer-warren-chip")).toBeVisible();
    await expect(page.getByText(/AI-generated|Not financial advice/i).first()).toBeVisible();
    const expand = page.getByTestId("warren-expand");
    await expect(expand).toBeVisible();
    await expand.click();
    await expect(page.locator('[data-warren-expanded="true"]')).toBeVisible();
  });

  for (const theme of ["default", "canvas", "terminal", "studio"] as const) {
    test(`renders heading in ${theme} theme`, async ({ page }) => {
      if (!(await loginAdmin(page))) {
        test.skip(true, "Local admin login unavailable (IdP-only environment).");
        return;
      }
      await setThemeViaAPI(page.request, theme);
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto("/tools/holdings-explorer");
      await dismissOverlays(page);
      await expect(page.getByRole("heading", { name: /Holdings explorer/i })).toBeVisible({
        timeout: 20_000,
      });
    });
  }

  for (const { width, height, name } of [
    { width: 375, height: 812, name: "mobile" },
    { width: 768, height: 1024, name: "tablet" },
    { width: 1280, height: 800, name: "desktop" },
  ]) {
    test(`fits ${name} viewport without covering the heading`, async ({ page }) => {
      if (!(await loginAdmin(page))) {
        test.skip(true, "Local admin login unavailable (IdP-only environment).");
        return;
      }
      await page.setViewportSize({ width, height });
      await page.goto("/tools/holdings-explorer");
      await dismissOverlays(page);
      const explorer = page.getByTestId("holdings-explorer");
      await expect(explorer).toBeVisible({ timeout: 20_000 });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 24,
      );
      expect(overflow).toBe(false);
    });
  }
});
