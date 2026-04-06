import { test, expect } from "@playwright/test";
import {
  createTestUser,
  loginViaUI,
  dismissOverlays,
  setupSocialProfile,
  createSocialPost,
} from "./helpers";

test.describe("Social Posts", () => {
  test("can create and publish a post", async ({ page, request }) => {
    const user = await createTestUser(request);
    const slug = `post-${user.username}`;
    await setupSocialProfile(request, slug, "Bio", "Headline");
    await loginViaUI(page, user.email, user.password);

    await page.goto("/network/compose");
    await dismissOverlays(page);

    await expect(page.getByText("Create Post")).toBeVisible({ timeout: 10000 });

    // Select post type
    await page.getByRole("button", { name: "Analysis" }).click();

    // Fill title
    await page.locator('input[placeholder="Post title..."]').fill("My Analysis Post");

    // Fill content
    await page
      .locator('textarea[placeholder*="Share your insight"]')
      .fill("This is a detailed analysis of the current market conditions.");

    // Select visibility — Public is default, click to confirm
    await page.getByText("Public").first().click();

    // Publish
    await page.getByRole("button", { name: /publish/i }).click();

    // Should redirect back to /network
    await page.waitForURL(/\/network/, { timeout: 10000 });
  });

  test("can save a draft", async ({ page, request }) => {
    const user = await createTestUser(request);
    const slug = `draft-${user.username}`;
    await setupSocialProfile(request, slug, "Bio", "Headline");
    await loginViaUI(page, user.email, user.password);

    await page.goto("/network/compose");
    await dismissOverlays(page);

    await page
      .locator('textarea[placeholder*="Share your insight"]')
      .fill("Draft content that should not be published.");

    await page.getByRole("button", { name: /save draft/i }).click();

    // Should redirect back to /network
    await page.waitForURL(/\/network/, { timeout: 10000 });

    // Draft should NOT appear on public profile
    await page.goto(`/u/${slug}`);
    await expect(page.getByText("Draft content")).not.toBeVisible({ timeout: 5000 });
  });

  test("post detail page renders correctly", async ({ page, request }) => {
    const user = await createTestUser(request);
    const slug = `detail-${user.username}`;
    await setupSocialProfile(request, slug, "Bio", "Headline");
    const post = await createSocialPost(
      request,
      "Detailed Post Title",
      "This is the body of a detailed analysis post.",
      "analysis",
    );

    await page.goto(`/u/${slug}/posts/${post.id}`);
    await expect(page.getByText("Detailed Post Title")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("This is the body of a detailed analysis post.")).toBeVisible();
    await expect(page.getByText(user.username)).toBeVisible();
  });

  test("post type tabs filter posts on profile", async ({ page, request }) => {
    const user = await createTestUser(request);
    const slug = `tabs-${user.username}`;
    await setupSocialProfile(request, slug, "Bio", "Headline");

    // Create posts of different types
    await createSocialPost(request, "Analysis Alpha", "Analysis content here", "analysis");
    await createSocialPost(request, "Trade Idea Beta", "Trade idea content", "trade_idea");

    await page.goto(`/u/${slug}`);
    await expect(page.getByText("Analysis Alpha")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Trade Idea Beta")).toBeVisible();

    // Click Analysis tab
    await page.getByRole("button", { name: "Analysis" }).click();
    await expect(page.getByText("Analysis Alpha")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Trade Idea Beta")).not.toBeVisible();

    // Click All Posts tab
    await page.getByRole("button", { name: "All Posts" }).click();
    await expect(page.getByText("Analysis Alpha")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Trade Idea Beta")).toBeVisible();
  });
});
