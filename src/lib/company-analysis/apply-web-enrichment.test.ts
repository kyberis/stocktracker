import { describe, expect, it } from "vitest";
import {
  applyWebNumericEnrichment,
  collectWebSources,
} from "./apply-web-enrichment";
import type { CompanyAnalysisFundamentals } from "./types";

const base: CompanyAnalysisFundamentals = {
  status: "ok",
  lastQuarterLabel: "2026-03-31",
  lastReportDate: "2026-03-31",
  rows: [
    { label: "eps", value: null, yoyPct: null, unit: "eps" },
    { label: "revenue", value: 6.5e9, yoyPct: 9.4, unit: "currency" },
  ],
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
  lastRevenue: 6.5e9,
  lastRevenueYoyPct: 9.4,
};

describe("applyWebNumericEnrichment", () => {
  it("fills EPS only with a citable source URL", () => {
    const filled = applyWebNumericEnrichment(base, {
      lastEps: 2.82,
      lastEpsSourceUrl: "https://www.businesswire.com/news/mcd-eps",
    });
    expect(filled.lastEps).toBe(2.82);
    expect(filled.lastEpsSourceUrl).toContain("businesswire.com");
    expect(filled.rows.find((r) => r.label === "eps")?.value).toBe(2.82);
  });

  it("ignores EPS without source URL", () => {
    const filled = applyWebNumericEnrichment(base, {
      lastEps: 2.82,
      lastEpsSourceUrl: null,
    });
    expect(filled.lastEps).toBeNull();
  });

  it("fills guidance only with source URL and rejects javascript URLs", () => {
    const ok = applyWebNumericEnrichment(base, {
      companyGuidanceRevenue: 27e9,
      companyGuidanceSourceUrl: "https://investor.mcdonalds.com/guidance",
    });
    expect(ok.companyGuidanceRevenue).toBe(27e9);
    expect(ok.companyGuidanceSourceUrl).toContain("mcdonalds.com");

    const bad = applyWebNumericEnrichment(base, {
      companyGuidanceRevenue: 27e9,
      companyGuidanceSourceUrl: "javascript:alert(1)",
    });
    expect(bad.companyGuidanceRevenue).toBeNull();
  });

  it("does not override existing API EPS", () => {
    const withEps = { ...base, lastEps: 3.1, rows: [{ label: "eps", value: 3.1, yoyPct: null, unit: "eps" as const }] };
    const filled = applyWebNumericEnrichment(withEps, {
      lastEps: 2.82,
      lastEpsSourceUrl: "https://example.com/x",
    });
    expect(filled.lastEps).toBe(3.1);
  });
});

describe("collectWebSources", () => {
  it("dedupes and sanitizes", () => {
    const sources = collectWebSources({
      webSources: [
        { name: "A", url: "https://a.example/1" },
        { name: "A2", url: "https://a.example/1" },
        { name: "Bad", url: "javascript:x" },
      ],
    });
    expect(sources).toHaveLength(1);
    expect(sources[0]?.url).toContain("a.example");
  });
});
