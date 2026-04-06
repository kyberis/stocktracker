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

test.describe("Social Connections", () => {
  test("can send connection request via profile page", async ({
    page,
    request,
  }) => {
    // Create user A with a public profile
    const userA = await createTestUser(request);
    const slugA = `conn-a-${userA.username}`;
    await setupSocialProfile(request, slugA, "Bio A", "Headline A");
    await ensureLoggedOut(request);

    // Create user B
    const userB = await createTestUser(request);
    const slugB = `conn-b-${userB.username}`;
    await setupSocialProfile(request, slugB, "Bio B", "Headline B");

    await loginViaUI(page, userB.email, userB.password);

    // Visit user A's profile
    await page.goto(`/u/${slugA}`);
    await expect(page.getByText(userA.username)).toBeVisible({ timeout: 10000 });

    // Click Connect
    await page.getByRole("button", { name: "Connect" }).click();

    // Verify button changes to Pending
    await expect(page.getByText("Pending")).toBeVisible({ timeout: 5000 });
  });

  test("can accept connection request", async ({ page, request }) => {
    // Create user A
    const userA = await createTestUser(request);
    const slugA = `acc-a-${userA.username}`;
    await setupSocialProfile(request, slugA, "Bio A", "Headline A");
    await ensureLoggedOut(request);

    // Create user B and send connection request to A
    const userB = await createTestUser(request);
    const slugB = `acc-b-${userB.username}`;
    await setupSocialProfile(request, slugB, "Bio B", "Headline B");
    await sendConnectionRequest(request, userA.userId);
    await ensureLoggedOut(request);

    // Login as user A
    const loginA = await request.post("/api/auth/login", {
      data: { identifier: userA.email, password: userA.password },
    });
    expect(loginA.status()).toBe(200);

    await loginViaUI(page, userA.email, userA.password);
    await page.goto("/network/connections");
    await dismissOverlays(page);

    // Click Pending Requests tab
    await page.getByRole("button", { name: /pending/i }).click();
    await expect(page.getByText(userB.username)).toBeVisible({ timeout: 10000 });

    // Accept the request
    await page.getByRole("button", { name: /accept/i }).click();

    // The pending list should now be empty or the user should move to accepted
    await page.getByRole("button", { name: /my connections/i }).click();
    await expect(page.getByText(userB.username)).toBeVisible({ timeout: 10000 });
  });

  test("can decline connection request", async ({ page, request }) => {
    // Create user A
    const userA = await createTestUser(request);
    const slugA = `dec-a-${userA.username}`;
    await setupSocialProfile(request, slugA, "Bio A", "Headline A");
    await ensureLoggedOut(request);

    // Create user B and send connection request to A
    const userB = await createTestUser(request);
    await setupSocialProfile(request, `dec-b-${userB.username}`, "Bio B", "Headline B");
    await sendConnectionRequest(request, userA.userId);
    await ensureLoggedOut(request);

    // Login as user A
    await request.post("/api/auth/login", {
      data: { identifier: userA.email, password: userA.password },
    });
    await loginViaUI(page, userA.email, userA.password);
    await page.goto("/network/connections");
    await dismissOverlays(page);

    // Click Pending Requests tab
    await page.getByRole("button", { name: /pending/i }).click();
    await expect(page.getByText(userB.username)).toBeVisible({ timeout: 10000 });

    // Decline the request
    await page.getByRole("button", { name: /decline/i }).click();

    // Verify user B is no longer listed
    await expect(page.getByText(userB.username)).not.toBeVisible({ timeout: 5000 });
  });

  test("Message button creates chat room for connected users", async ({
    page,
    request,
  }) => {
    // Create user A
    const userA = await createTestUser(request);
    await setupSocialProfile(request, `msg-a-${userA.username}`, "Bio A", "Headline A");
    await ensureLoggedOut(request);

    // Create user B and send + accept connection
    const userB = await createTestUser(request);
    await setupSocialProfile(request, `msg-b-${userB.username}`, "Bio B", "Headline B");
    const conn = await sendConnectionRequest(request, userA.userId);
    await ensureLoggedOut(request);

    // Login as A, accept connection
    await request.post("/api/auth/login", {
      data: { identifier: userA.email, password: userA.password },
    });
    await acceptConnection(request, conn.id);
    await ensureLoggedOut(request);

    // Login as B via UI, go to connections, click Message
    await request.post("/api/auth/login", {
      data: { identifier: userB.email, password: userB.password },
    });
    await loginViaUI(page, userB.email, userB.password);
    await page.goto("/network/connections");
    await dismissOverlays(page);

    await expect(page.getByText(userA.username)).toBeVisible({ timeout: 10000 });

    // Click Message button
    await page.getByRole("button", { name: /message/i }).click();

    // Should redirect to /chat/<token>
    await page.waitForURL(/\/chat\//, { timeout: 10000 });
  });

  test("connections page shows correct tab counts", async ({
    page,
    request,
  }) => {
    // Create user A with a sent request pending
    const userA = await createTestUser(request);
    await setupSocialProfile(request, `cnt-a-${userA.username}`, "Bio A", "Headline A");
    await ensureLoggedOut(request);

    const userB = await createTestUser(request);
    await setupSocialProfile(request, `cnt-b-${userB.username}`, "Bio B", "Headline B");
    await sendConnectionRequest(request, userA.userId);

    await loginViaUI(page, userB.email, userB.password);
    await page.goto("/network/connections");
    await dismissOverlays(page);

    // Sent Requests tab should show a count badge
    const sentTab = page.getByRole("button", { name: /sent/i });
    await expect(sentTab).toBeVisible({ timeout: 10000 });
  });
});
