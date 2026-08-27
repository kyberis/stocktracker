import { test, expect } from "@playwright/test";
import { dismissOverlays } from "./helpers";

const ETF_REPORT = {
  ticker: "BITC.DE",
  instrumentKind: "etf",
  generatedAt: "2026-08-27T00:00:00.000Z",
  updatedAt: "2026-08-27T00:00:00.000Z",
  cached: true,
  quote: {
    price: 65.12,
    change: 0.4,
    changePercent: 0.6,
    dayHigh: null,
    dayLow: null,
    marketCap: 1_200_000_000,
    fiftyTwoWeekHigh: 80,
    fiftyTwoWeekLow: 40,
    ma50: null,
    ma200: null,
    currency: "EUR",
    quoteType: "ETF",
  },
  profile: {
    name: "CoinShares Physical Bitcoin",
    sector: "",
    industry: "",
    description: "Exchange-traded product providing physically backed bitcoin exposure.",
    exchange: "XETRA",
    ipoDate: null,
  },
  etf: {
    isin: "GB00BLD4ZL17",
    fundFamily: "CoinShares",
    category: "Digital Assets",
    legalType: "ETP",
    expenseRatio: 0.0098,
    inceptionDate: "2021-01-19",
    totalAssets: 1_200_000_000,
    holdings: [{ symbol: "BTC", name: "Bitcoin", weight: 100 }],
    sectorWeightings: [],
    assetClassWeightings: [{ assetClass: "Other", weight: 100 }],
  },
  fundamentals: {
    status: "unavailable",
    lastQuarterLabel: null,
    lastReportDate: null,
    rows: [],
    nextQuarterLabel: null,
    nextReportDate: null,
    companyGuidanceRevenue: null,
    companyGuidanceRevenueVarPct: null,
    companyGuidanceSourceUrl: null,
    consensusRevenue: null,
    consensusRevenueVarPct: null,
    consensusEps: null,
    consensusEpsVarPct: null,
    lastEps: null,
    lastEpsVsConsensusPct: null,
    lastEpsSourceUrl: null,
    lastRevenue: null,
    lastRevenueYoyPct: null,
  },
  technicals: {
    status: "ok",
    closeHigh12m: 80,
    closeHigh12mDate: "2026-01-01",
    distanceToCloseHigh12mPct: -18.6,
    fiftyTwoWeekHigh: 80,
    fiftyTwoWeekLow: 40,
    ma50: null,
    ma200: null,
    support: 50,
    resistance: 75,
    latestVolume: null,
    avgVolume: null,
    nextCatalystDate: null,
  },
  news: { status: "ok", items: [] },
  insiders: { status: "unavailable", items: [] },
  congress: { status: "unavailable", items: [] },
  alternative: {
    status: "unavailable",
    ticker: null,
    name: null,
    tagline: null,
    why: null,
    distanceTo52wHighPct: null,
    price: null,
    peersConsidered: [],
  },
  sources: [{ name: "Yahoo Finance", url: "https://finance.yahoo.com" }],
};

test.describe("ETF analysis landings", () => {
  test("public /analisis/BITC shows fund facts, not company EPS chrome", async ({ page }) => {
    await page.route("**/api/company-analysis**", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(ETF_REPORT),
      });
    });
    await page.route("**/api/company-analysis/narrative**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          description: "Physically backed bitcoin ETP from CoinShares.",
          sectorOutlook: "Exposure is bitcoin, not an operating company.",
          risks: "Bitcoin price; product structure.",
          technicalReading: "Price is below the 12-month close high.",
        }),
      });
    });

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/analisis/BITC", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await dismissOverlays(page);

    await expect(page.getByText("CoinShares").first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("GB00BLD4ZL17")).toBeVisible();
    await expect(page.getByText("Bitcoin").first()).toBeVisible();
    await expect(page.getByText("What does this fund do?")).toBeVisible();
    await expect(page.getByText("What does the company do?")).toHaveCount(0);
    await expect(page.getByText("US Congress trading")).toHaveCount(0);
    await expect(page.getByText("trefolio is not a financial advisor")).toBeVisible();
  });
});
