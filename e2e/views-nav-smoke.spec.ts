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

/**
 * TRF-100 — full route matrix from REQ §0.3: every menu/tools route must cold-load
 * its own content (not another route's, not a blank shell), with no 404 and no
 * silent redirect. This is the harness that would have caught TRF-026 (per the
 * REQ's own process note, §7): a page that quietly renders the wrong data looks
 * identical to a healthy page unless something asserts on its actual content.
 */
interface ToolRouteCase {
  path: string;
  /** Expected breadcrumb / h1 label (English, matches src/locales/en.ts). */
  label: RegExp;
  /** True only for /tools itself, which has an <h1> instead of the ToolsBreadcrumb trail. */
  isHub?: boolean;
}

const TOOL_ROUTES: ToolRouteCase[] = [
  { path: "/tools", label: /^tools$/i, isHub: true },
  { path: "/tools/strategies", label: /strategies/i },
  { path: "/tools/dividends", label: /dividends/i },
  { path: "/tools/evaluation", label: /moat evaluation/i },
  { path: "/tools/screener", label: /screener/i },
  { path: "/tools/warren-screener", label: /warren screener/i },
  { path: "/tools/watchlist", label: /watchlist/i },
  { path: "/tools/transactions", label: /transaction history/i },
  { path: "/tools/alerts", label: /price alerts/i },
  { path: "/tools/taxonomy", label: /classification/i },
  { path: "/tools/performance", label: /return metrics/i },
  { path: "/tools/projection", label: /goal planner/i },
  { path: "/tools/rebalancing", label: /rebalancing/i },
  { path: "/tools/score", label: /portfolio score/i },
  { path: "/tools/events", label: /events/i },
];

test.describe("TRF-100 full /tools route matrix", () => {
  let testEmail: string;

  test.beforeEach(async ({ request }) => {
    // Seeded (not empty) so "real data rendered" has something real to find —
    // an empty portfolio's legitimate empty-states would otherwise be
    // indistinguishable from the blank-shell bug this suite exists to catch.
    const user = await createTestUser(request, true);
    testEmail = user.email;
  });

  for (const route of TOOL_ROUTES) {
    test(`cold load ${route.path}: correct section, real data, no 404/redirect`, async ({ page }) => {
      await loginViaUI(page, testEmail, TEST_PASS);
      await dismissOverlays(page);

      const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });
      expect(response?.status(), `${route.path} should respond 200`).toBe(200);
      expect(page.url(), `${route.path} should not silently redirect elsewhere`).toContain(route.path);

      const heading = route.isHub
        ? page.getByRole("heading", { level: 1 })
        : page.locator('nav[aria-label="Breadcrumb"] span').last();
      await expect(heading, `${route.path} heading/breadcrumb should match its own section`).toHaveText(route.label);

      // Blank-shell detection: a page with only a title + subtitle has very
      // little text beyond the breadcrumb/nav chrome. Real content (a table,
      // a list, cards, an empty-state message with substance) pushes this well
      // past a couple hundred characters.
      const bodyText = (await page.locator("main, #main-content").first().innerText()) ?? "";
      expect(
        bodyText.replace(/\s+/g, " ").trim().length,
        `${route.path} should render more than a title/subtitle shell`,
      ).toBeGreaterThan(200);

      // No separate cross-render check: PortfolioTools.tsx gates both the
      // breadcrumb label and the mounted panel off the same `activeTab`
      // (`activeTab === "x" && <ComponentX />`), so the heading assertion
      // above already rules out one route rendering another's component tree.
    });
  }
});
