import { describe, expect, it } from "vitest";
import {
  classificationKey,
  diffNormalizedClassification,
  holdingNeedsClassificationNormalize,
  normalizeAssetClassLabel,
  normalizeClassificationFields,
  normalizeRegionLabel,
  normalizeSectorLabel,
} from "./classification-normalize";

describe("normalizeSectorLabel", () => {
  it("unifies Information Technology with Technology", () => {
    expect(normalizeSectorLabel("Information Technology")).toBe("Technology");
    expect(normalizeSectorLabel("Technology")).toBe("Technology");
    expect(normalizeSectorLabel("tech")).toBe("Technology");
  });

  it("unifies Health Care / Healthcare", () => {
    expect(normalizeSectorLabel("Health Care")).toBe("Healthcare");
    expect(normalizeSectorLabel("Healthcare")).toBe("Healthcare");
  });

  it("unifies Financials / Financial Services", () => {
    expect(normalizeSectorLabel("Financials")).toBe("Financial Services");
    expect(normalizeSectorLabel("Financial Services")).toBe("Financial Services");
  });

  it("unifies Consumer Discretionary / Cyclical and Staples / Defensive", () => {
    expect(normalizeSectorLabel("Consumer Discretionary")).toBe("Consumer Cyclical");
    expect(normalizeSectorLabel("Consumer Cyclical")).toBe("Consumer Cyclical");
    expect(normalizeSectorLabel("Consumer Staples")).toBe("Consumer Defensive");
    expect(normalizeSectorLabel("Consumer Defensive")).toBe("Consumer Defensive");
  });

  it("leaves unknown sectors intact (trimmed)", () => {
    expect(normalizeSectorLabel("  Equity ETF — US Large Cap  ")).toBe("Equity ETF — US Large Cap");
  });
});

describe("normalizeRegionLabel", () => {
  it("unifies US variants", () => {
    expect(normalizeRegionLabel("USA")).toBe("United States");
    expect(normalizeRegionLabel("US")).toBe("United States");
    expect(normalizeRegionLabel("United States")).toBe("United States");
  });
});

describe("normalizeAssetClassLabel", () => {
  it("unifies Equity / Stock", () => {
    expect(normalizeAssetClassLabel("Stock")).toBe("Equity");
    expect(normalizeAssetClassLabel("Equity")).toBe("Equity");
  });
});

describe("classificationKey", () => {
  it("matches spaced and unspaced forms", () => {
    expect(classificationKey("Information Technology")).toBe(classificationKey("InformationTechnology"));
  });
});

describe("diff / normalize helpers", () => {
  it("diffNormalizedClassification only returns changed fields", () => {
    expect(
      diffNormalizedClassification({
        sector: "Information Technology",
        region: "United States",
        assetClass: "Equity",
      }),
    ).toEqual({ sector: "Technology" });
  });

  it("normalizeClassificationFields rewrites all known aliases", () => {
    expect(
      normalizeClassificationFields({
        sector: "Health Care",
        region: "UK",
        assetClass: "stock",
      }),
    ).toEqual({
      sector: "Healthcare",
      region: "United Kingdom",
      assetClass: "Equity",
    });
  });

  it("holdingNeedsClassificationNormalize detects drift", () => {
    expect(holdingNeedsClassificationNormalize({ sector: "Technology" })).toBe(false);
    expect(holdingNeedsClassificationNormalize({ sector: "Information Technology" })).toBe(true);
  });
});
