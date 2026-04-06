import { test, expect } from "@playwright/test";
import {
  createTestUser,
  loginViaUI,
  dismissOverlays,
  setupSocialProfile,
  ensureLoggedOut,
} from "./helpers";

test.describe("Social Profile", () => {
  test("can set up social profile with slug, bio, headline", async ({
    page,
    request,
  }) => {
    const user = await createTestUser(request);
    await loginViaUI(page, user.email, user.password);

    await page.goto("/profile");
    await dismissOverlays(page);

    // Navigate to Social tab
    const socialTab = page.getByRole("button", { name: /social/i });
    await socialTab.click();
    await expect(page.getByText("Social Profile")).toBeVisible({ timeout: 10000 });

    // Fill slug
    const slugInput = page.locator('input[placeholder="your-name"]');
    await slugInput.fill(`test-${user.username}`);

    // Fill headline
    const headlineInput = page.locator('input[placeholder*="Long-term ETF"]');
    await headlineInput.fill("Passive index investor");

    // Fill bio
    const bioTextarea = page.locator('textarea[placeholder*="Tell us about yourself"]');
    await bioTextarea.fill("I focus on long-term diversified ETF investing.");

    // Save
    const saveBtn = page.getByRole("button", { name: /save/i }).last();
    await saveBtn.click();
    await expect(page.getByText(/saved/i)).toBeVisible({ timeout: 5000 });
  });

  test("can toggle profile visibility between public and private", async ({
    page,
    request,
  }) => {
    const user = await createTestUser(request);
    const slug = `vis-${user.username}`;
    await setupSocialProfile(request, slug, "Bio text", "My headline", "public");
    await loginViaUI(page, user.email, user.password);

    // Public profile should be accessible
    await page.goto(`/u/${slug}`);
    await expect(page.getByText(user.username)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("My headline")).toBeVisible();

    // Switch to private via API
    await request.put("/api/social/profile", {
      data: { socialVisibility: "private" },
    });

    // Log out and verify private message shown for anonymous visitor
    await ensureLoggedOut(request);
    await page.goto(`/u/${slug}`);
    await expect(page.getByText("This profile is private")).toBeVisible({ timeout: 10000 });
  });

  test("public profile shows correct data at /u/slug", async ({
    page,
    request,
  }) => {
    const user = await createTestUser(request);
    const slug = `pub-${user.username}`;
    await setupSocialProfile(request, slug, "I invest in tech stocks", "Tech Investor");

    await page.goto(`/u/${slug}`);
    await expect(page.getByText(user.username)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(`@${slug}`)).toBeVisible();
    await expect(page.getByText("Tech Investor")).toBeVisible();
    await expect(page.getByText("I invest in tech stocks")).toBeVisible();

    // Verify stats section
    await expect(page.getByText(/connections/i)).toBeVisible();
    await expect(page.getByText(/posts/i)).toBeVisible();
  });

  test("private profile shows lock message to non-connected user", async ({
    page,
    request,
  }) => {
    // Create user A with a private profile
    const userA = await createTestUser(request);
    const slug = `priv-${userA.username}`;
    await setupSocialProfile(request, slug, "Secret bio", "Secret headline", "private");
    await ensureLoggedOut(request);

    // Create user B and navigate to A's profile
    const userB = await createTestUser(request);
    await loginViaUI(page, userB.email, userB.password);

    await page.goto(`/u/${slug}`);
    await expect(page.getByText("This profile is private")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Connect")).toBeVisible();

    // Bio and headline should NOT be visible
    await expect(page.getByText("Secret bio")).not.toBeVisible();
    await expect(page.getByText("Secret headline")).not.toBeVisible();
  });

  test("profile owner sees Edit Profile button", async ({
    page,
    request,
  }) => {
    const user = await createTestUser(request);
    const slug = `own-${user.username}`;
    await setupSocialProfile(request, slug, "My bio", "My headline");
    await loginViaUI(page, user.email, user.password);

    await page.goto(`/u/${slug}`);
    await expect(page.getByText("Edit Profile")).toBeVisible({ timeout: 10000 });
  });
});
