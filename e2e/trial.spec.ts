import { test, expect } from "@playwright/test";
import { createTestUser, ensureLoggedOut, loginViaUI, dismissOverlays } from "./helpers";

test.describe("7-Day Pro Trial", () => {
  test.beforeEach(async ({ request }) => {
    await ensureLoggedOut(request);
  });

  test("trial activation page renders with valid token", async ({ page, request }) => {
    const creds = await createTestUser(request);

    // Seed a trial token directly via DB
    const seedRes = await request.post("/api/admin/run-sql", {
      data: {
        sql: `UPDATE users SET trial_token = 'e2e-test-token-abc123' WHERE id = '${creds.userId}'`,
      },
    });
    // If admin SQL endpoint isn't available, we can still test the page renders
    if (seedRes.status() !== 200) {
      test.skip();
      return;
    }

    await loginViaUI(page, creds.email, creds.password);
    await dismissOverlays(page);

    await page.goto("/trial/activate?token=e2e-test-token-abc123");

    // Verify comparison table is visible
    await expect(page.getByText("Your Pro Trial Awaits")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Unlimited").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Activate Trefolio Pro/i })).toBeVisible();
    await expect(page.getByText(/No credit card required/i)).toBeVisible();
  });

  test("invalid token shows error state", async ({ page, request }) => {
    const creds = await createTestUser(request);
    await loginViaUI(page, creds.email, creds.password);
    await dismissOverlays(page);

    await page.goto("/trial/activate?token=invalid-token-xyz");
    await expect(page.getByText("Your Pro Trial Awaits")).toBeVisible({ timeout: 10000 });

    // Click activate with bad token
    await page.getByRole("button", { name: /Activate Trefolio Pro/i }).click();
    await expect(page.getByText(/Invalid or expired trial token/i)).toBeVisible({ timeout: 10000 });
  });

  test("trial activation flow completes end-to-end", async ({ page, request }) => {
    const creds = await createTestUser(request);

    const seedRes = await request.post("/api/admin/run-sql", {
      data: {
        sql: `UPDATE users SET trial_token = 'e2e-flow-token-def456' WHERE id = '${creds.userId}'`,
      },
    });
    if (seedRes.status() !== 200) {
      test.skip();
      return;
    }

    await loginViaUI(page, creds.email, creds.password);
    await dismissOverlays(page);

    await page.goto("/trial/activate?token=e2e-flow-token-def456");
    await expect(page.getByRole("button", { name: /Activate Trefolio Pro/i })).toBeVisible({ timeout: 10000 });

    // Click activate
    await page.getByRole("button", { name: /Activate Trefolio Pro/i }).click();

    // Should redirect to welcome page
    await page.waitForURL("**/trial/welcome", { timeout: 15000 });
    await expect(page.getByText("Welcome to Trefolio Pro!")).toBeVisible({ timeout: 10000 });

    // Welcome page should show progress steps
    await expect(page.getByText(/Setting up your portfolio history/i)).toBeVisible();

    // Should eventually redirect to dashboard
    await page.waitForURL("/", { timeout: 30000 });
  });

  test("already-activated trial shows error", async ({ page, request }) => {
    const creds = await createTestUser(request);

    const seedRes = await request.post("/api/admin/run-sql", {
      data: {
        sql: `UPDATE users SET trial_token = 'e2e-dup-token', trial_activated_at = datetime('now') WHERE id = '${creds.userId}'`,
      },
    });
    if (seedRes.status() !== 200) {
      test.skip();
      return;
    }

    await loginViaUI(page, creds.email, creds.password);
    await dismissOverlays(page);

    await page.goto("/trial/activate?token=e2e-dup-token");
    await page.getByRole("button", { name: /Activate Trefolio Pro/i }).click();
    await expect(page.getByText(/Trial already activated/i)).toBeVisible({ timeout: 10000 });
  });

  test("dashboard shows trial countdown banner after activation", async ({ page, request }) => {
    const creds = await createTestUser(request);

    // Set up an active trial: plan=pro, trial_activated_at set, plan_expires_at in future
    const expiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const seedRes = await request.post("/api/admin/run-sql", {
      data: {
        sql: `UPDATE users SET plan = 'pro', trial_activated_at = datetime('now'), plan_expires_at = '${expiresAt}' WHERE id = '${creds.userId}'`,
      },
    });
    if (seedRes.status() !== 200) {
      test.skip();
      return;
    }

    await loginViaUI(page, creds.email, creds.password);
    await dismissOverlays(page);

    // The subtle trial strip should be visible
    await expect(page.getByText("Pro Trial")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/remaining/i)).toBeVisible();
    await expect(page.getByText(/Subscribe to keep Pro/i)).toBeVisible();
  });

  test("dashboard shows expired trial banner", async ({ page, request }) => {
    const creds = await createTestUser(request);

    // Set up an expired trial
    const expiredAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const seedRes = await request.post("/api/admin/run-sql", {
      data: {
        sql: `UPDATE users SET plan = 'free', trial_activated_at = datetime('now', '-8 days'), plan_expires_at = '${expiredAt}' WHERE id = '${creds.userId}'`,
      },
    });
    if (seedRes.status() !== 200) {
      test.skip();
      return;
    }

    await loginViaUI(page, creds.email, creds.password);
    await dismissOverlays(page);

    // The expired banner should be visible
    await expect(page.getByText("Trial Ended")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/trial has ended/i)).toBeVisible();
    await expect(page.getByText(/Subscribe to Trefolio Pro/i).first()).toBeVisible();
  });
});
