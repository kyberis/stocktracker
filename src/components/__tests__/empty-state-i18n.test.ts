import { describe, it, expect } from "vitest";
import en from "@/locales/en";
import es from "@/locales/es";

const EMPTY_STATE_KEYS = [
  "noHoldings",
  "emptyStateSubtitle",
  "noDividendsTitle",
  "noDividends",
  "noUpcomingEvents",
  "noUpcomingEventsDesc",
  "growthTabEmptyTitle",
  "growthTabEmpty",
  "portfolioNewsNoHoldingsTitle",
  "portfolioNewsNoHoldings",
  "noPortfolioNewsTitle",
  "noPortfolioNews",
  "emptyStateAddStock",
] as const;

describe("EmptyState i18n keys", () => {
  it("all empty state keys exist in English locale", () => {
    for (const key of EMPTY_STATE_KEYS) {
      expect(en[key], `Missing EN key: ${key}`).toBeDefined();
      expect(typeof en[key]).toBe("string");
      expect((en[key] as string).length).toBeGreaterThan(0);
    }
  });

  it("all empty state keys exist in Spanish locale", () => {
    for (const key of EMPTY_STATE_KEYS) {
      expect(es[key], `Missing ES key: ${key}`).toBeDefined();
      expect(typeof es[key]).toBe("string");
      expect((es[key] as string).length).toBeGreaterThan(0);
    }
  });

  it("Spanish translations are not identical to English (i.e., actually translated)", () => {
    let translatedCount = 0;
    for (const key of EMPTY_STATE_KEYS) {
      if (en[key] !== es[key]) translatedCount++;
    }
    expect(translatedCount).toBeGreaterThanOrEqual(EMPTY_STATE_KEYS.length * 0.9);
  });
});

const TOOL_DESC_KEYS = [
  "toolDescTransactions",
  "toolDescDividends",
  "toolDescPerformance",
  "toolDescTaxonomy",
  "toolDescRebalancing",
  "toolDescAccounts",
  "toolDescWatchlist",
  "toolDescAlerts",
  "toolDescScreener",
  "toolDescTax",
  "toolDescSimulator",
  "toolDescPlanning",
  "toolDescScore",
] as const;

const TOOL_SECTION_KEYS = [
  "toolsSectionFree",
  "toolsSectionBifolio",
  "toolsSectionTrefolio",
  "toolsSectionUpgrade",
] as const;

describe("Tools page i18n keys", () => {
  it("all tool description keys exist in both locales", () => {
    for (const key of TOOL_DESC_KEYS) {
      expect(en[key], `Missing EN key: ${key}`).toBeDefined();
      expect(es[key], `Missing ES key: ${key}`).toBeDefined();
    }
  });

  it("all tool section keys exist in both locales", () => {
    for (const key of TOOL_SECTION_KEYS) {
      expect(en[key], `Missing EN key: ${key}`).toBeDefined();
      expect(es[key], `Missing ES key: ${key}`).toBeDefined();
    }
  });
});

const UPSELL_KEYS = [
  "upsellAttemptPortfolioScore",
  "upsellProItemPortfolioScore",
  "upsellAttemptTaxReport",
  "upsellProItemTaxReport",
] as const;

describe("Upsell copy i18n keys", () => {
  it("portfolio score and tax report upsell keys exist in both locales", () => {
    for (const key of UPSELL_KEYS) {
      expect(en[key], `Missing EN key: ${key}`).toBeDefined();
      expect(es[key], `Missing ES key: ${key}`).toBeDefined();
      expect((en[key] as string).length).toBeGreaterThan(10);
      expect((es[key] as string).length).toBeGreaterThan(10);
    }
  });
});
