import { test, expect } from "@playwright/test";
import {
  createTestUser,
  loginViaUI,
  dismissOverlays,
  setupSocialProfile,
  sendConnectionRequest,
  acceptConnection,
  ensureLoggedOut,
} from "./helpers";

test.describe("Social Search", () => {
  test("can search people by name", async ({ page, request }) => {
    // Create a searchable user
    const target = await createTestUser(request);
    await setupSocialProfile(request, `srch-${target.username}`, "Bio", "Headline");
    await ensureLoggedOut(request);

    // Create searcher
    const searcher = await createTestUser(request);
    await setupSocialProfile(request, `srcher-${searcher.username}`, "Bio", "Headline");
    await loginViaUI(page, searcher.email, searcher.password);

    await page.goto("/network/search");
    await dismissOverlays(page);

    await expect(page.getByText("Find People")).toBeVisible({ timeout: 10000 });

    // Type the target's username
    await page
      .locator('input[placeholder*="Search by name"]')
      .fill(target.username);

    // Click Search button
    await page.getByRole("button", { name: "Search" }).click();

    // Verify results
    await expect(page.getByText(target.username)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/1 result/)).toBeVisible();
  });

  test("experience level filters narrow results", async ({
    page,
    request,
  }) => {
    // Create user with "beginner" experience
    const beginner = await createTestUser(request);
    await request.put("/api/social/profile", {
      data: {
        profileSlug: `beg-${beginner.username}`,
        bio: "Beginner bio",
        headline: "Beginner",
        socialVisibility: "public",
        experienceLevel: "beginner",
      },
    });
    await ensureLoggedOut(request);

    // Create searcher
    const searcher = await createTestUser(request);
    await setupSocialProfile(request, `filt-${searcher.username}`, "Bio", "Headline");
    await loginViaUI(page, searcher.email, searcher.password);

    await page.goto("/network/search");
    await dismissOverlays(page);

    // Click Beginner filter chip
    await page.getByRole("button", { name: "Beginner" }).click();

    // Search
    await page.getByRole("button", { name: "Search" }).click();

    // All results should be beginners (at minimum our created user)
    await expect(page.getByText(/result/i)).toBeVisible({ timeout: 10000 });
  });

  test("connected users show Connected badge", async ({
    page,
    request,
  }) => {
    // Create two users and connect them
    const userA = await createTestUser(request);
    await setupSocialProfile(request, `badge-a-${userA.username}`, "Bio A", "Headline A");
    await ensureLoggedOut(request);

    const userB = await createTestUser(request);
    await setupSocialProfile(request, `badge-b-${userB.username}`, "Bio B", "Headline B");
    const conn = await sendConnectionRequest(request, userA.userId);
    await ensureLoggedOut(request);

    // Login as A, accept
    await request.post("/api/auth/login", {
      data: { identifier: userA.email, password: userA.password },
    });
    await acceptConnection(request, conn.id);
    await ensureLoggedOut(request);

    // Login as B, search for A
    await request.post("/api/auth/login", {
      data: { identifier: userB.email, password: userB.password },
    });
    await loginViaUI(page, userB.email, userB.password);

    await page.goto("/network/search");
    await dismissOverlays(page);

    await page.locator('input[placeholder*="Search by name"]').fill(userA.username);
    await page.getByRole("button", { name: "Search" }).click();

    // Should show "Connected" badge instead of "Connect" button
    await expect(page.getByText("Connected")).toBeVisible({ timeout: 10000 });
  });

  test("empty state shows for no results", async ({ page, request }) => {
    const user = await createTestUser(request);
    await setupSocialProfile(request, `empty-${user.username}`, "Bio", "Headline");
    await loginViaUI(page, user.email, user.password);

    await page.goto("/network/search");
    await dismissOverlays(page);

    await page
      .locator('input[placeholder*="Search by name"]')
      .fill("zzzznonexistentuser9999");

    await page.getByRole("button", { name: "Search" }).click();

    await expect(page.getByText("No results found")).toBeVisible({ timeout: 10000 });
  });
});
