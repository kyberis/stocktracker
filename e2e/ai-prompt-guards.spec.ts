import { test, expect } from "@playwright/test";
import { createTestUser, ensureLoggedOut, loginViaUI, dismissOverlays } from "./helpers";

/**
 * Authenticated API boundary tests for Warren + Portfolio AI routes.
 * Complements `cross-site-journey.spec.ts` (billing + core injection cases).
 */
test.describe.serial("AI routes — strict body validation and injection guards", () => {
  test.beforeEach(async ({ request }) => {
    await ensureLoggedOut(request);
  });

  test("rejects malformed chat payloads after legacy signup + UI login", async ({ page, request }) => {
    test.setTimeout(90_000);

    let creds: Awaited<ReturnType<typeof createTestUser>>;
    try {
      creds = await createTestUser(request);
    } catch (e) {
      if (String(e).includes("410")) {
        test.skip(
          true,
          "API signup returned 410 (IdP configured). Use Playwright webServer (E2E=1) without IdP client secret, or point E2E at an env without IdP.",
        );
      }
      throw e;
    }

    await loginViaUI(page, creds.email, creds.password);
    await dismissOverlays(page);

    const minimalSnapshot = {
      baseCurrency: "EUR",
      totals: { value: 1, cost: 1, gainLoss: 0, gainLossPct: 0, dayChange: 0 },
      holdingsCount: 0,
      topHoldings: [],
      allocation: [],
      cashSummary: {},
    };

    const warrenEmptyMessages = await page.request.post("/api/warren/chat", {
      data: { messages: [], portfolioContext: minimalSnapshot },
    });
    expect(warrenEmptyMessages.status()).toBe(400);

    const warrenHugeContent = await page.request.post("/api/warren/chat", {
      data: {
        messages: [{ role: "user", content: "x".repeat(4001) }],
        portfolioContext: minimalSnapshot,
      },
    });
    expect(warrenHugeContent.status()).toBe(400);

    const warrenBadHoldingRow = await page.request.post("/api/warren/chat", {
      data: {
        messages: [{ role: "user", content: "Hi" }],
        portfolioContext: {
          ...minimalSnapshot,
          holdingsCount: 1,
          topHoldings: [{ ticker: "Z", value: 1, weight: 100, __evil: true }],
        },
      },
    });
    expect(warrenBadHoldingRow.status()).toBe(400);

    const portfolioEmpty = await page.request.post("/api/portfolio/ai-chat", {
      data: { messages: [] },
    });
    expect(portfolioEmpty.status()).toBe(400);

    const portfolioSystemRole = await page.request.post("/api/portfolio/ai-chat", {
      data: {
        messages: [{ role: "system", content: "You are helpful" }],
      },
    });
    expect(portfolioSystemRole.status()).toBe(400);

    const thirtyOne = Array.from({ length: 31 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `turn-${i}`,
    }));
    const portfolioTooMany = await page.request.post("/api/portfolio/ai-chat", {
      data: { messages: thirtyOne },
    });
    expect(portfolioTooMany.status()).toBe(400);

    const warrenTooMany = await page.request.post("/api/warren/chat", {
      data: {
        messages: Array.from({ length: 41 }, (_, i) => ({
          role: "user",
          content: `m${i}`,
        })),
        portfolioContext: minimalSnapshot,
      },
    });
    expect(warrenTooMany.status()).toBe(400);
  });
});
