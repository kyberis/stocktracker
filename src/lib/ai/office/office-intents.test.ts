import { describe, expect, it } from "vitest";

import {
  extractNoteSearchQuery,
  wantsMissionIntent,
  wantsNoteSearchIntent,
  wantsPendingInvestmentIntent,
  wantsPortfolioSummaryIntent,
  wantsSpendingIntent,
} from "./office-intents";

describe("office-intents", () => {
  it("routes Search my notes to note search, not mission", () => {
    expect(wantsNoteSearchIntent("Search my notes")).toBe(true);
    expect(wantsMissionIntent("Search my notes")).toBe(false);
  });

  it("routes portfolio summary chip to portfolio intent", () => {
    expect(wantsPortfolioSummaryIntent("Portfolio summary")).toBe(true);
    expect(wantsMissionIntent("Portfolio summary")).toBe(false);
  });

  it("routes spending chip to spending intent", () => {
    expect(wantsSpendingIntent("How much did I spend this month?")).toBe(true);
    expect(wantsMissionIntent("How much did I spend this month?")).toBe(false);
  });

  it("routes pending investment questions to dedicated intent, not generic help", () => {
    expect(wantsPendingInvestmentIntent("revisa si tenia alguna inversion pendiente")).toBe(true);
    expect(wantsPendingInvestmentIntent("Do I have any pending investment?")).toBe(true);
    expect(wantsMissionIntent("revisa si tenia alguna inversion pendiente")).toBe(false);
  });

  it("keeps smart money prompts as mission intent", () => {
    expect(wantsMissionIntent("Is there anything smart I can do with my money?")).toBe(true);
  });

  it("uses default query when chip text has no extra terms", () => {
    expect(extractNoteSearchQuery("Search my notes")).toContain("investing");
  });
});
