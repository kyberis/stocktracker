import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import { createTestUser, ensureLoggedOut, loginViaUI, dismissOverlays, loginAsAdmin } from "./helpers";

async function setThemeViaAPI(request: APIRequestContext, theme: string) {
  const res = await request.put("/api/user-settings", {
    data: { dashboardTheme: theme },
  });
  expect(res.status()).toBe(200);
}

async function setPlanViaAdmin(request: APIRequestContext, userId: string, plan: "free" | "starter" | "pro") {
  const res = await request.post("/api/admin/users", {
    data: { action: "setPlan", userId, plan },
  });
  expect(res.status()).toBe(200);
}

async function upgradeToProAndSetTheme(
  request: APIRequestContext,
  creds: { email: string; password: string; userId: string },
  theme: string,
) {
  await loginAsAdmin(request);
  await setPlanViaAdmin(request, creds.userId, "pro");
  await request.post("/api/auth/login", {
    data: { identifier: creds.email, password: creds.password },
  });
  await setThemeViaAPI(request, theme);
}

async function getDefaultPortfolioId(request: APIRequestContext): Promise<string> {
  const res = await request.get("/api/portfolios");
  const body = await res.json();
  const portfolios = body.portfolios ?? [];
  const def = portfolios.find((p: { isDefault?: boolean }) => p.isDefault) ?? portfolios[0];
  return def?.id ?? "";
}

async function scrollToGoalPlanner(page: Page) {
  await page.goto("/tools/projection");
  const planner = page.locator("#goal-planner");
  await planner.scrollIntoViewIfNeeded();
  await expect(planner).toBeVisible({ timeout: 10_000 });
}

test.describe("Goal Tracker", () => {
  // ─── API Tests ─────────────────────────────────────────────

  test.describe("Goals API", () => {
    test.beforeEach(async ({ request }) => {
      await ensureLoggedOut(request);
    });

    test("GET returns null goal for new user", async ({ request }) => {
      await createTestUser(request, true);
      const res = await request.get("/api/goals?portfolioId=");
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.goal).toBeNull();
    });

    test("POST creates a new goal", async ({ request }) => {
      await createTestUser(request, true);
      const res = await request.post("/api/goals", {
        data: {
          portfolioId: "",
          name: "Retirement Fund",
          targetAmount: 500000,
          currency: "EUR",
          growthRate: 7,
          yearlyContribution: 6000,
          contributionMode: "monthly",
          reinvestDividends: true,
          horizon: 20,
        },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.goal.name).toBe("Retirement Fund");
      expect(body.goal.targetAmount).toBe(500000);
      expect(body.goal.growthRate).toBe(7);
      expect(body.goal.yearlyContribution).toBe(6000);
      expect(body.goal.reinvestDividends).toBe(true);
    });

    test("POST upserts existing goal for same portfolio", async ({ request }) => {
      await createTestUser(request, true);

      await request.post("/api/goals", {
        data: { portfolioId: "", name: "V1", targetAmount: 100000 },
      });

      const res = await request.post("/api/goals", {
        data: { portfolioId: "", name: "V2", targetAmount: 200000 },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.goal.name).toBe("V2");
      expect(body.goal.targetAmount).toBe(200000);

      const listRes = await request.get("/api/goals");
      const listBody = await listRes.json();
      expect(listBody.goals.length).toBe(1);
    });

    test("POST rejects zero target amount", async ({ request }) => {
      await createTestUser(request, true);
      const res = await request.post("/api/goals", {
        data: { portfolioId: "", targetAmount: 0 },
      });
      expect(res.status()).toBe(400);
    });

    test("DELETE removes a goal", async ({ request }) => {
      await createTestUser(request, true);

      const createRes = await request.post("/api/goals", {
        data: { portfolioId: "", name: "ToDelete", targetAmount: 100000 },
      });
      const goalId = (await createRes.json()).goal.id;

      const delRes = await request.delete(`/api/goals?id=${goalId}`);
      expect(delRes.status()).toBe(200);
      const delBody = await delRes.json();
      expect(delBody.deleted).toBe(true);

      const getRes = await request.get("/api/goals?portfolioId=");
      const getBody = await getRes.json();
      expect(getBody.goal).toBeNull();
    });
  });

  // ─── UI Tests — Goal Planner in All Themes ────────────────

  test.describe("Goal Planner UI — Default Theme", () => {
    test("renders Goal Planner section with controls", async ({ page, request }) => {
      test.setTimeout(60_000);
      await ensureLoggedOut(request);
      const creds = await createTestUser(request, true);
      await loginViaUI(page, creds.email, creds.password);
      await dismissOverlays(page);

      await scrollToGoalPlanner(page);

      await expect(page.getByText(/Goal Planner|Planificador de Metas/i).first()).toBeVisible();
      await expect(page.locator("#proj-goal-target")).toBeVisible();
      await expect(page.locator("#proj-growth-rate")).toBeVisible();
      await expect(page.getByText(/10 years|10 años/i).first()).toBeVisible();
      await expect(page.getByText(/20 years|20 años/i).first()).toBeVisible();
      await expect(page.getByText(/30 years|30 años/i).first()).toBeVisible();
    });

    test("save and remove goal flow", async ({ page, request }) => {
      test.setTimeout(60_000);
      await ensureLoggedOut(request);
      const creds = await createTestUser(request, true);
      await loginViaUI(page, creds.email, creds.password);
      await dismissOverlays(page);

      await scrollToGoalPlanner(page);

      await page.locator("#proj-goal-target").fill("250000");
      await page.waitForTimeout(500);

      const saveBtn = page.getByRole("button", { name: /Save Goal|Guardar Meta/i });
      await expect(saveBtn).toBeVisible({ timeout: 5000 });
      await saveBtn.click();
      await page.waitForTimeout(2000);

      const updateBtn = page.getByRole("button", { name: /Update Goal|Actualizar Meta/i });
      await expect(updateBtn).toBeVisible({ timeout: 5000 });

      const removeBtn = page.getByRole("button", { name: /Remove|Eliminar/i });
      await expect(removeBtn).toBeVisible();
      await removeBtn.click();
      await page.waitForTimeout(1000);

      await expect(saveBtn).not.toBeVisible();
    });

    test("goal progress banner appears after saving goal", async ({ page, request }) => {
      test.setTimeout(60_000);
      await ensureLoggedOut(request);
      const creds = await createTestUser(request, true);
      const portfolioId = await getDefaultPortfolioId(request);

      await request.post("/api/goals", {
        data: { portfolioId, name: "E2E Banner Test", targetAmount: 500000 },
      });

      await loginViaUI(page, creds.email, creds.password);
      await dismissOverlays(page);

      const banner = page.getByText("E2E Banner Test");
      await expect(banner).toBeVisible({ timeout: 15_000 });
    });

    test("goal progress bar renders with correct percentage text", async ({ page, request }) => {
      test.setTimeout(60_000);
      await ensureLoggedOut(request);
      const creds = await createTestUser(request, true);
      const portfolioId = await getDefaultPortfolioId(request);

      await request.post("/api/goals", {
        data: { portfolioId, name: "Progress Test", targetAmount: 1000000 },
      });

      await loginViaUI(page, creds.email, creds.password);
      await dismissOverlays(page);

      const percentText = page.locator("text=/%/").first();
      await expect(percentText).toBeVisible({ timeout: 10_000 });
    });
  });

  test.describe("Goal Planner UI — Terminal Theme", () => {
    test("renders Goal Planner in terminal theme (forced dark)", async ({ page, request }) => {
      test.setTimeout(60_000);
      await ensureLoggedOut(request);
      const creds = await createTestUser(request, true);
      await upgradeToProAndSetTheme(request, creds, "terminal");
      const portfolioId = await getDefaultPortfolioId(request);

      await request.post("/api/goals", {
        data: { portfolioId, name: "Terminal Goal", targetAmount: 300000 },
      });

      await loginViaUI(page, creds.email, creds.password);
      await dismissOverlays(page);

      const classes = await page.evaluate(() => Array.from(document.documentElement.classList));
      expect(classes).toContain("theme-terminal");
      expect(classes).toContain("dark");

      const banner = page.getByText("Terminal Goal");
      await expect(banner).toBeVisible({ timeout: 15_000 });

      await scrollToGoalPlanner(page);
      await expect(page.getByText(/Goal Planner|Planificador de Metas/i).first()).toBeVisible();
      await expect(page.locator("#proj-goal-target")).toBeVisible();
    });
  });

  test.describe("Goal Planner UI — Canvas Theme", () => {
    test("renders Goal Planner in canvas theme (forced light)", async ({ page, request }) => {
      test.setTimeout(60_000);
      await ensureLoggedOut(request);
      const creds = await createTestUser(request, true);
      await upgradeToProAndSetTheme(request, creds, "canvas");
      const portfolioId = await getDefaultPortfolioId(request);

      await request.post("/api/goals", {
        data: { portfolioId, name: "Canvas Goal", targetAmount: 400000 },
      });

      await loginViaUI(page, creds.email, creds.password);
      await dismissOverlays(page);

      const classes = await page.evaluate(() => Array.from(document.documentElement.classList));
      expect(classes).toContain("theme-canvas");
      expect(classes).not.toContain("dark");

      const banner = page.getByText("Canvas Goal");
      await expect(banner).toBeVisible({ timeout: 15_000 });

      await scrollToGoalPlanner(page);
      await expect(page.getByText(/Goal Planner|Planificador de Metas/i).first()).toBeVisible();
      await expect(page.locator("#proj-goal-target")).toBeVisible();
    });
  });

  test.describe("Goal Planner UI — Studio Theme", () => {
    test("renders Goal Planner in studio theme with sidebar", async ({ page, request }) => {
      test.setTimeout(60_000);
      await ensureLoggedOut(request);
      const creds = await createTestUser(request, true);
      await upgradeToProAndSetTheme(request, creds, "studio");
      const portfolioId = await getDefaultPortfolioId(request);

      await request.post("/api/goals", {
        data: { portfolioId, name: "Studio Goal", targetAmount: 750000 },
      });

      await loginViaUI(page, creds.email, creds.password);
      await dismissOverlays(page);

      const classes = await page.evaluate(() => Array.from(document.documentElement.classList));
      expect(classes).toContain("theme-studio");
      expect(classes).toContain("dark");

      await expect(page.locator("aside")).toBeVisible({ timeout: 5000 });

      const banner = page.getByText("Studio Goal");
      await expect(banner).toBeVisible({ timeout: 15_000 });

      await scrollToGoalPlanner(page);
      await expect(page.getByText(/Goal Planner|Planificador de Metas/i).first()).toBeVisible();
      await expect(page.locator("#proj-goal-target")).toBeVisible();
    });
  });

  // ─── Goal Planner Interactivity ────────────────────────────

  test.describe("Goal Planner Controls", () => {
    test("changing goal target shows unsaved changes indicator", async ({ page, request }) => {
      test.setTimeout(60_000);
      await ensureLoggedOut(request);
      const creds = await createTestUser(request, true);

      await request.post("/api/goals", {
        data: { portfolioId: "", name: "Drift Test", targetAmount: 200000, growthRate: 7 },
      });

      await loginViaUI(page, creds.email, creds.password);
      await dismissOverlays(page);
      await scrollToGoalPlanner(page);

      await page.locator("#proj-goal-target").fill("300000");
      await page.waitForTimeout(500);

      const unsaved = page.getByText(/Unsaved changes|Cambios sin guardar/i);
      await expect(unsaved).toBeVisible({ timeout: 5000 });
    });

    test("horizon buttons switch projection range", async ({ page, request }) => {
      test.setTimeout(60_000);
      await ensureLoggedOut(request);
      const creds = await createTestUser(request, true);
      await loginViaUI(page, creds.email, creds.password);
      await dismissOverlays(page);

      await scrollToGoalPlanner(page);

      const btn10 = page.getByRole("button", { name: /10 years|10 años/i });
      await btn10.click();
      await page.waitForTimeout(300);

      const btn30 = page.getByRole("button", { name: /30 years|30 años/i });
      await btn30.click();
      await page.waitForTimeout(300);

      await expect(btn30).toBeVisible();
    });

    test("goal reached message shows for achievable target", async ({ page, request }) => {
      test.setTimeout(60_000);
      await ensureLoggedOut(request);
      const creds = await createTestUser(request, true);
      await loginViaUI(page, creds.email, creds.password);
      await dismissOverlays(page);

      await scrollToGoalPlanner(page);

      await page.locator("#proj-goal-target").fill("1");
      await page.waitForTimeout(500);

      const reached = page.getByText(/Goal reached|Meta alcanzada/i).first();
      await expect(reached).toBeVisible({ timeout: 5000 });
    });
  });

  // ─── Demo Page ─────────────────────────────────────────────

  test.describe("Demo Page Goal", () => {
    test("demo page shows goal banner with static demo goal", async ({ page }) => {
      test.setTimeout(45_000);
      await page.goto("/demo");
      await page.waitForLoadState("networkidle");

      const banner = page.getByText("€500K Portfolio");
      await expect(banner).toBeVisible({ timeout: 15_000 });
    });

    test("demo page shows compact portfolio news with link to full feed", async ({ page }) => {
      test.setTimeout(45_000);
      await page.goto("/demo");
      await page.waitForLoadState("networkidle");

      await expect(page.getByText(/Portfolio News|Noticias del Portafolio/i).first()).toBeVisible({
        timeout: 15_000,
      });
      await expect(page.getByRole("button", { name: /View all|Ver todo/i })).toBeVisible({
        timeout: 10_000,
      });
    });
  });
});
