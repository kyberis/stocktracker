import { describe, it, expect } from "vitest";

import { portfolioTelemetryInjectionGuard, sanitizeWarrenPortfolioLabel } from "../prompt-safety";

describe("sanitizeWarrenPortfolioLabel", () => {
  it("truncates and strips control characters", () => {
    const long = "A".repeat(200);
    expect(sanitizeWarrenPortfolioLabel(long).length).toBeLessThanOrEqual(80);
    expect(sanitizeWarrenPortfolioLabel("  My\x00Portfolio\n\n")).toBe("MyPortfolio");
  });

  it("returns default for empty after trim", () => {
    expect(sanitizeWarrenPortfolioLabel("   ")).toBe("Portfolio");
  });
});

describe("portfolioTelemetryInjectionGuard", () => {
  it("includes the language hint", () => {
    expect(portfolioTelemetryInjectionGuard("English")).toContain("English");
    expect(portfolioTelemetryInjectionGuard("English")).toContain("Untrusted-data rule");
  });
});
