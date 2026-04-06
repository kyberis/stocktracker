import { test, expect } from "@playwright/test";
import {
  createTestUser,
  loginViaUI,
  dismissOverlays,
  setupSocialProfile,
} from "./helpers";

test.describe("Social Feed", () => {
  test("feed page renders with sidebar and compose prompt", async ({
    page,
    request,
  }) => {
    const user = await createTestUser(request);
    await setupSocialProfile(request, `feed-${user.username}`, "Bio", "Headline");
    await loginViaUI(page, user.email, user.password);

    await page.goto("/network");
    await dismissOverlays(page);

    // Sidebar profile card should be visible on desktop
    await expect(page.getByText(`@feed-${user.username}`)).toBeVisible({ timeout: 10000 });

    // Compose prompt bar
    await expect(page.getByText("Share an insight, analysis, or update...")).toBeVisible();
    await expect(page.getByText("Write")).toBeVisible();
  });

  test("compose prompt links to /network/compose", async ({
    page,
    request,
  }) => {
    const user = await createTestUser(request);
    await setupSocialProfile(request, `comp-${user.username}`, "Bio", "Headline");
    await loginViaUI(page, user.email, user.password);

    await page.goto("/network");
    await dismissOverlays(page);

    // Click the "Write" button
    await page.getByRole("link", { name: /write/i }).click();
    await page.waitForURL(/\/network\/compose/, { timeout: 10000 });
    await expect(page.getByText("Create Post")).toBeVisible();
  });

  test("empty feed shows helpful message", async ({ page, request }) => {
    const user = await createTestUser(request);
    await setupSocialProfile(request, `empty-feed-${user.username}`, "Bio", "Headline");
    await loginViaUI(page, user.email, user.password);

    await page.goto("/network");
    await dismissOverlays(page);

    // New user with no connections → empty feed
    await expect(page.getByText("Your feed is empty")).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText("Connect with others or publish your first post"),
    ).toBeVisible();

    // CTA buttons
    await expect(page.getByRole("link", { name: "Find People" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Create Post" })).toBeVisible();
  });

  test("sidebar shows correct connection and post counts", async ({
    page,
    request,
  }) => {
    const user = await createTestUser(request);
    await setupSocialProfile(request, `stats-${user.username}`, "Bio", "Headline");
    await loginViaUI(page, user.email, user.password);

    await page.goto("/network");
    await dismissOverlays(page);

    // The sidebar should show Connections and Posts counts
    const sidebar = page.locator("aside");
    await expect(sidebar.getByText("Connections")).toBeVisible({ timeout: 10000 });
    await expect(sidebar.getByText("Posts")).toBeVisible();

    // For a new user, both should be 0
    await expect(sidebar.getByText("0").first()).toBeVisible();
  });
});
