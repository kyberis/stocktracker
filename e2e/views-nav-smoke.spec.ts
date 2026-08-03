import { test, expect } from "@playwright/test";
import { createTestUser, loginViaUI, dismissOverlays } from "./helpers";

const TEST_PASS = "TestPass123!";

/**
 * TRF-100 — Views menu and tools routes must cold-load distinct content (not Home).
 */
test.describe("TRF-100 / TRF-001 Views & tools smoke", () => {
  let testEmail: string;

  test.beforeEach(async ({ request }) => {
    const user = await createTestUser(request, false);
    testEmail = user.email;
  });

  test("Views menu items are real links to tools routes", async ({ page }) => {
    await loginViaUI(page, testEmail, TEST_PASS);
    await dismissOverlays(page);

    await page.getByTestId("dashboard-views-menu").isHidden().catch(() => undefined);
    await page.getByRole("button", { name: /views/i }).first().click();
    const menu = page.getByTestId("dashboard-views-menu");
    await expect(menu).toBeVisible();

    const diversification = menu.getByRole("menuitem", { name: /diversification/i });
    await expect(diversification).toHaveAttribute("href", "/tools/taxonomy");

    const dividends = menu.getByRole("menuitem", { name: /dividend/i });
    await expect(dividends).toHaveAttribute("href", "/tools/dividends");

    const performance = menu.getByRole("menuitem", { name: /performance/i });
    await expect(performance).toHaveAttribute("href", "/tools/performance");

    const growth = menu.getByRole("menuitem", { name: /growth/i });
    await expect(growth).toHaveAttribute("href", "/tools/projection");

    const events = menu.getByRole("menuitem", { name: /events/i });
    await expect(events).toHaveAttribute("href", "/tools/events");
  });

  test("cold load /tools/taxonomy is not Home", async ({ page }) => {
    await loginViaUI(page, testEmail, TEST_PASS);
    await dismissOverlays(page);
    await page.goto("/tools/taxonomy");
    await expect(page).toHaveURL(/\/tools\/taxonomy/);
    await expect(page.getByRole("heading", { level: 1 }).or(page.locator("h1, h2, h3").first())).toBeVisible();
    await expect(page.getByText(/movers|today.?s highlights/i)).toHaveCount(0);
  });

  test("cold load /tools/events renders events view", async ({ page }) => {
    await loginViaUI(page, testEmail, TEST_PASS);
    await dismissOverlays(page);
    await page.goto("/tools/events");
    await expect(page).toHaveURL(/\/tools\/events/);
    await expect(page.getByTestId("portfolio-events-view")).toBeVisible();
  });
});
