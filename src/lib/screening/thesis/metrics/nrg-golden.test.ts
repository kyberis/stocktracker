import { beforeEach, describe, expect, it, vi } from "vitest";
import { adjectiveFor, mustDescribeBuyback, compoundedChangePct } from "./adjectives";
import { computeThesisMetrics, metricById } from "./compute";
import { formatMetric, formatMetricValue } from "./format";
import { matchRejectFilters } from "./routing";
import { validateMetric } from "./validate";
import {
  NRG_AS_OF,
  NRG_EPS_TTM,
  NRG_HIGH_52W,
  NRG_PRICE,
  NRG_SHARES_FY25,
  NRG_TARGET,
  nrgStatementYears,
} from "./nrg-fy2025.fixture";
import { METRIC_CATALOG } from "./catalog";
import type { Metric } from "./types";

function nrgMetrics() {
  return computeThesisMetrics({
    ticker: "NRG",
    years: nrgStatementYears,
    market: {
      price: NRG_PRICE,
      epsTtm: NRG_EPS_TTM,
      high52w: NRG_HIGH_52W,
      targetPrice: NRG_TARGET,
      marketCap: NRG_PRICE * NRG_SHARES_FY25,
      asOf: NRG_AS_OF,
      sector: "Utilities",
      industry: "Utilities - Independent Power Producers",
    },
    ttm: {
      interestCoverage: -15.33,
      netDebtToEbitda: 5.51,
      fcfYieldFraction: 0.01,
      roicPct: 5.37,
    },
  });
}

describe("NRG FY2025 golden metrics", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  const metrics = nrgMetrics();

  it("computes interest coverage 2.4x from EBIT / |interest| and ignores TTM −15.33x", () => {
    const m = metricById(metrics, "interestCoverage")!;
    expect(m.status).not.toBe("error");
    expect(m.value).toBeCloseTo(1850 / 772, 5);
    expect(m.period.label).toBe("FY2025");
    expect(formatMetricValue(m.value, "x", "es")).toBe("2,4x");
    expect(adjectiveFor(m, "es")).toBe("ajustada");
  });

  it("rejects a negative coverage with positive EBIT (H1)", () => {
    const raw: Metric = {
      id: "interestCoverage",
      value: -15.33,
      unit: "x",
      period: { kind: "TTM", label: "TTM", asOf: NRG_AS_OF },
      source: { provider: "fmp", endpoint: "ratios-ttm" },
      formula: METRIC_CATALOG.interestCoverage.formula,
      status: "ok",
      flags: [],
    };
    const failed = validateMetric(raw, { ticker: "NRG", ebit: 1_850_000_000 });
    expect(failed.status).toBe("error");
    expect(failed.flags).toContain("h1_sign_mismatch");
    expect(formatMetric(failed, "es")).toBe("n/d — dato no fiable");
  });

  it("stamps FY net debt / EBITDA 3.2x, not unstamped TTM 5.51x", () => {
    const m = metricById(metrics, "netDebtToEbitda")!;
    expect(m.status).not.toBe("error");
    expect(m.value).toBeCloseTo(12_028 / 3_805, 5);
    expect(m.period.label).toBe("FY2025");
    expect(formatMetricValue(m.value, "x", "es")).toBe("3,2x");
  });

  it("uses the 3-year median FCF/NI (0.89x), not a TTM average", () => {
    const m = metricById(metrics, "fcfToNetIncome")!;
    expect(m.status).not.toBe("error");
    expect(m.value).toBeCloseTo(766 / 864, 2);
    expect(m.period.label).toMatch(/median/i);
  });

  it("computes FCF yield as 3.4%, not the 0.01 fraction", () => {
    const m = metricById(metrics, "fcfYield")!;
    expect(m.status).not.toBe("error");
    expect(m.value).toBeCloseTo((766_000_000 / (NRG_PRICE * NRG_SHARES_FY25)) * 100, 1);
    expect(formatMetricValue(m.value, "pct", "es")).toBe("3,4 %");
  });

  it("computes revenue CAGR FY2022→FY2025 at −0.9% with a period stamp (H5)", () => {
    const m = metricById(metrics, "revenueCagr")!;
    expect(m.status).not.toBe("error");
    expect(m.value).toBeCloseTo(-0.9, 1);
    expect(m.period.label).toBe("CAGR FY2022→FY2025");
    expect(m.unit).toBe("pct");
    expect(formatMetric(m, "es")).not.toMatch(/pct/i);
  });

  it("computes share-count CAGR −6.2%/yr and forbids the dilution litotes", () => {
    const m = metricById(metrics, "shareCountCagr")!;
    expect(m.status).not.toBe("error");
    expect(m.value).toBeCloseTo(-6.2, 1);
    expect(mustDescribeBuyback(m.value)).toBe(true);
    expect(Math.abs(compoundedChangePct(m.value!, 3))).toBeCloseTo(17, 0);
  });

  it("requires current P/E from price / TTM EPS (28.8x)", () => {
    const m = metricById(metrics, "peCurrent")!;
    expect(m.status).not.toBe("error");
    expect(m.value).toBeCloseTo(NRG_PRICE / NRG_EPS_TTM, 5);
    expect(formatMetricValue(m.value, "x", "es")).toBe("28,8x");
  });

  it("computes 52-week drawdown −39% and flags major_drawdown (S3)", () => {
    const m = metricById(metrics, "drawdown52w")!;
    expect(m.value).toBeCloseTo(-39, 0);
    expect(m.flags).toContain("major_drawdown");
  });

  it("keeps +75.4% target upside with a stale_target warning (S2)", () => {
    const m = metricById(metrics, "targetUpside")!;
    expect(m.value).toBeCloseTo(75.4, 1);
    expect(m.flags).toContain("stale_target");
  });

  it("does not auto-discard on FY 3.2x; TTM 5.51x + cyclical would", () => {
    expect(
      matchRejectFilters({
        metrics,
        sector: "Utilities",
        industry: "Utilities - Independent Power Producers",
      }),
    ).toBeNull();
    const ttm = nrgMetrics();
    const nd = metricById(ttm, "netDebtToEbitda")!;
    const spiked: Metric = { ...nd, value: 5.51, period: { ...nd.period, kind: "TTM", label: "TTM" } };
    const routed = matchRejectFilters({
      metrics: ttm.map((m) => (m.id === "netDebtToEbitda" ? spiked : m)),
      sector: "Utilities",
      industry: "Utilities - Independent Power Producers",
    });
    expect(routed?.id).toBe("leveraged_cyclical");
  });

  it("H2 rejects an out-of-range FCF yield (scale error)", () => {
    const raw: Metric = {
      id: "fcfYield",
      value: 133,
      unit: "pct",
      period: { kind: "FY", label: "FY2025", asOf: NRG_AS_OF },
      source: { provider: "fmp", endpoint: "key-metrics-ttm" },
      formula: METRIC_CATALOG.fcfYield.formula,
      status: "ok",
      flags: [],
    };
    expect(validateMetric(raw, { ticker: "NRG" }).status).toBe("error");
  });

  it("H4 rejects a metric with no period label", () => {
    const raw: Metric = {
      id: "netDebtToEbitda",
      value: 5.51,
      unit: "x",
      period: { kind: "TTM", label: "", asOf: NRG_AS_OF },
      source: { provider: "fmp", endpoint: "ratios-ttm" },
      formula: METRIC_CATALOG.netDebtToEbitda.formula,
      status: "ok",
      flags: [],
    };
    expect(validateMetric(raw, { ticker: "NRG" }).flags).toContain("missing_envelope");
  });
});

describe("formatMetricValue", () => {
  it("never prints the token pct", () => {
    expect(formatMetricValue(5.37, "pct", "es")).toBe("5,4 %");
    expect(formatMetricValue(5.37, "pct", "en")).toBe("5.4%");
    expect(formatMetricValue(5.37, "pct", "es")).not.toMatch(/pct/i);
  });

  it("renders null as n/d", () => {
    expect(formatMetricValue(null, "x", "es")).toBe("n/d");
    expect(formatMetricValue(null, "x", "en")).toBe("n/a");
  });
});
