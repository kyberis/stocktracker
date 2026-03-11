import { test, expect } from "@playwright/test";
import { createTestUser, loginViaUI, dismissOverlays } from "./helpers";

const TEST_PASS = "TestPass123!";

test.describe("Manual stock add — holding persisted & quotes fetched", () => {
  test.describe("API-level", () => {
    test.beforeEach(async ({ request }) => {
      await createTestUser(request, false);
    });

    test("add SPY, verify holding persisted and quote provider returns price", async ({
      request,
    }) => {
      const addRes = await request.post("/api/holdings", {
        data: {
          name: "SPDR S&P 500 ETF Trust",
          ticker: "SPY",
          isin: "",
          assetType: "etf",
          shares: 10,
          purchasePrice: 550,
          displayCurrency: "USD",
          exchange: "PCX",
        },
      });
      expect(addRes.status()).toBe(201);
      const holding = await addRes.json();
      expect(holding.ticker).toBe("SPY");
      expect(holding.shares).toBe(10);
      expect(holding.purchasePrice).toBe(550);

      const listRes = await request.get("/api/holdings");
      expect(listRes.status()).toBe(200);
      const holdings = await listRes.json();
      const spy = holdings.find(
        (h: { ticker: string }) => h.ticker === "SPY",
      );
      expect(spy).toBeDefined();
      expect(spy.shares).toBe(10);

      const quoteRes = await request.get("/api/quote?symbols=SPY");
      expect(quoteRes.status()).toBe(200);
      const quotes = await quoteRes.json();
      expect(quotes.SPY).toBeDefined();
      expect(quotes.SPY.regularMarketPrice).toBeGreaterThan(0);
      expect(quotes.SPY.currency).toBe("USD");
      expect(quotes.SPY.error).toBeFalsy();

      const del = await request.delete(`/api/holdings?id=${holding.id}`);
      expect(del.status()).toBe(200);
    });

    test("add TLT, verify holding persisted and quote provider returns price", async ({
      request,
    }) => {
      const addRes = await request.post("/api/holdings", {
        data: {
          name: "iShares 20+ Year Treasury Bond ETF",
          ticker: "TLT",
          isin: "",
          assetType: "etf",
          shares: 20,
          purchasePrice: 90,
          displayCurrency: "USD",
          exchange: "NDQ",
        },
      });
      expect(addRes.status()).toBe(201);
      const holding = await addRes.json();
      expect(holding.ticker).toBe("TLT");
      expect(holding.shares).toBe(20);
      expect(holding.purchasePrice).toBe(90);

      const listRes = await request.get("/api/holdings");
      expect(listRes.status()).toBe(200);
      const holdings = await listRes.json();
      const tlt = holdings.find(
        (h: { ticker: string }) => h.ticker === "TLT",
      );
      expect(tlt).toBeDefined();
      expect(tlt.shares).toBe(20);

      const quoteRes = await request.get("/api/quote?symbols=TLT");
      expect(quoteRes.status()).toBe(200);
      const quotes = await quoteRes.json();
      expect(quotes.TLT).toBeDefined();
      expect(quotes.TLT.regularMarketPrice).toBeGreaterThan(0);
      expect(quotes.TLT.currency).toBe("USD");
      expect(quotes.TLT.error).toBeFalsy();

      const del = await request.delete(`/api/holdings?id=${holding.id}`);
      expect(del.status()).toBe(200);
    });

    test("add both SPY and TLT, fetch quotes in batch", async ({
      request,
    }) => {
      const spyRes = await request.post("/api/holdings", {
        data: {
          name: "SPDR S&P 500 ETF Trust",
          ticker: "SPY",
          isin: "",
          assetType: "etf",
          shares: 10,
          purchasePrice: 550,
          displayCurrency: "USD",
          exchange: "PCX",
        },
      });
      expect(spyRes.status()).toBe(201);
      const spyHolding = await spyRes.json();

      const tltRes = await request.post("/api/holdings", {
        data: {
          name: "iShares 20+ Year Treasury Bond ETF",
          ticker: "TLT",
          isin: "",
          assetType: "etf",
          shares: 20,
          purchasePrice: 90,
          displayCurrency: "USD",
          exchange: "NDQ",
        },
      });
      expect(tltRes.status()).toBe(201);
      const tltHolding = await tltRes.json();

      const listRes = await request.get("/api/holdings");
      const holdings = await listRes.json();
      expect(
        holdings.filter((h: { ticker: string }) =>
          ["SPY", "TLT"].includes(h.ticker),
        ).length,
      ).toBe(2);

      const quoteRes = await request.get("/api/quote?symbols=SPY,TLT");
      expect(quoteRes.status()).toBe(200);
      const quotes = await quoteRes.json();

      expect(quotes.SPY).toBeDefined();
      expect(quotes.SPY.regularMarketPrice).toBeGreaterThan(0);
      expect(quotes.SPY.error).toBeFalsy();

      expect(quotes.TLT).toBeDefined();
      expect(quotes.TLT.regularMarketPrice).toBeGreaterThan(0);
      expect(quotes.TLT.error).toBeFalsy();

      await request.delete(`/api/holdings?id=${spyHolding.id}`);
      await request.delete(`/api/holdings?id=${tltHolding.id}`);
    });
  });

  test.describe("UI-level — add via modal and verify quote appears", () => {
    test.use({ viewport: { width: 1280, height: 900 } });
    let testEmail: string;

    test.beforeEach(async ({ request }) => {
      const user = await createTestUser(request, false);
      testEmail = user.email;
    });

    test("add SPY via search, confirm holding shows with live price", async ({
      page,
      request,
    }) => {
      await loginViaUI(page, testEmail, TEST_PASS);
      await dismissOverlays(page);

      const addBtn = page.getByRole("button", { name: "Add", exact: true });
      await addBtn.click();
      await page.getByRole("button", { name: "Add Stock" }).first().click();

      const searchInput = page.locator("#addstock-search");
      await expect(searchInput).toBeVisible();
      await searchInput.fill("SPY");

      const spyOption = page.locator(
        '[role="dialog"] .absolute button:has-text("SPY")',
      );
      await expect(spyOption.first()).toBeVisible({ timeout: 10_000 });
      await spyOption.first().click();

      await expect(page.locator("#addstock-ticker")).toHaveValue("SPY");

      await page.locator("#addstock-assettype").selectOption("etf");
      await page.locator("#addstock-shares").fill("10");
      await page.locator("#addstock-price").fill("550");

      const submit = page.getByRole("button", { name: /add to portfolio/i });
      await expect(submit).toBeEnabled();
      await submit.evaluate((el: HTMLElement) => el.click());

      await expect(page.locator("text=SPY")).toBeVisible({ timeout: 10_000 });

      const quoteRes = await request.get("/api/quote?symbols=SPY");
      const quotes = await quoteRes.json();
      expect(quotes.SPY.regularMarketPrice).toBeGreaterThan(0);
    });

    test("add TLT manually (no search), confirm holding shows with live price", async ({
      page,
      request,
    }) => {
      await loginViaUI(page, testEmail, TEST_PASS);
      await dismissOverlays(page);

      const addBtn = page.getByRole("button", { name: "Add", exact: true });
      await addBtn.click();
      await page.getByRole("button", { name: "Add Stock" }).first().click();

      await page.locator("#addstock-name").fill("iShares 20+ Year Treasury Bond ETF");
      await page.locator("#addstock-ticker").fill("TLT");
      await page.locator("#addstock-exchange").fill("NDQ");
      await page.locator("#addstock-assettype").selectOption("etf");
      await page.locator("#addstock-shares").fill("20");
      await page.locator("#addstock-price").fill("90");

      const submit = page.getByRole("button", { name: /add to portfolio/i });
      await expect(submit).toBeEnabled();
      await submit.evaluate((el: HTMLElement) => el.click());

      await expect(page.locator("text=TLT")).toBeVisible({ timeout: 10_000 });

      const quoteRes = await request.get("/api/quote?symbols=TLT");
      const quotes = await quoteRes.json();
      expect(quotes.TLT.regularMarketPrice).toBeGreaterThan(0);
    });
  });
});
