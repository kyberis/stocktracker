import { describe, expect, it } from "vitest";
import {
  assertDisplayInvariants,
  displayInvariantTelemetryMetadata,
  fingerprintViolations,
  holdingBucket,
  maxRelErrorBps,
  valuesClose,
  type DisplaySnapshot,
} from "./display-invariants";

function healthy(overrides: Partial<DisplaySnapshot> = {}): DisplaySnapshot {
  return {
    current: 11000,
    cost: 10000,
    gainLoss: 1000,
    gainLossPercent: 10,
    invested: 10000,
    liquidCash: 1000,
    dayAbs: 50,
    dayPct: (50 / 9950) * 100,
    totalsDayGainLoss: 50,
    metricsDayGainLoss: 50,
    sleeves: {
      stock: 4000,
      etf: 3000,
      fund: 2000,
      crypto: 1000,
      fixed_return: 0,
    },
    ...overrides,
  };
}

describe("assertDisplayInvariants", () => {
  it("passes a consistent snapshot", () => {
    const result = assertDisplayInvariants(healthy());
    expect(result.ok).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it("flags non-finite fields and skips further checks", () => {
    const result = assertDisplayInvariants(healthy({ current: Number.NaN }));
    expect(result.ok).toBe(false);
    expect(result.violations).toEqual([{ code: "non_finite", relErrorBps: 0 }]);
  });

  it("flags Infinity in optional day fields", () => {
    const result = assertDisplayInvariants(healthy({ dayAbs: Number.POSITIVE_INFINITY }));
    expect(result.violations.map((v) => v.code)).toContain("non_finite");
  });

  it("flags gainLoss !== current − cost", () => {
    const result = assertDisplayInvariants(healthy({ gainLoss: 50 }));
    expect(result.violations.map((v) => v.code)).toContain("gain_loss_identity");
  });

  it("flags gainLossPercent that does not match gain/cost", () => {
    const result = assertDisplayInvariants(healthy({ gainLossPercent: 50 }));
    expect(result.violations.map((v) => v.code)).toContain("gain_loss_pct");
  });

  it("skips gainLossPercent when cost is ~0", () => {
    const result = assertDisplayInvariants(
      healthy({
        current: 100,
        cost: 0,
        gainLoss: 100,
        gainLossPercent: 0,
        invested: 100,
        liquidCash: 0,
        dayAbs: undefined,
        dayPct: undefined,
        sleeves: undefined,
        totalsDayGainLoss: undefined,
        metricsDayGainLoss: undefined,
      }),
    );
    expect(result.violations.map((v) => v.code)).not.toContain("gain_loss_pct");
    expect(result.ok).toBe(true);
  });

  it("flags TRF-003 when day pct disagrees with abs / prior", () => {
    const result = assertDisplayInvariants(healthy({ dayPct: 12 }));
    expect(result.violations.map((v) => v.code)).toContain("day_change_trf003");
  });

  it("skips TRF-003 when prior is not usable", () => {
    const result = assertDisplayInvariants(
      healthy({
        invested: 10,
        liquidCash: 10990,
        dayAbs: 10,
        dayPct: 999,
        sleeves: undefined,
      }),
    );
    expect(result.violations.map((v) => v.code)).not.toContain("day_change_trf003");
  });

  it("flags invested + liquidCash !== current", () => {
    const result = assertDisplayInvariants(healthy({ liquidCash: 0 }));
    expect(result.violations.map((v) => v.code)).toContain("invested_plus_cash");
  });

  it("flags sleeve sum !== invested", () => {
    const result = assertDisplayInvariants(
      healthy({
        sleeves: { stock: 1, etf: 0, fund: 0, crypto: 0, fixed_return: 0 },
      }),
    );
    expect(result.violations.map((v) => v.code)).toContain("sleeves_sum_invested");
  });

  it("skips sleeve check when sleeves are omitted (filtered home)", () => {
    const result = assertDisplayInvariants(healthy({ sleeves: undefined }));
    expect(result.ok).toBe(true);
  });

  it("flags dual-path day-change disagreement", () => {
    const result = assertDisplayInvariants(healthy({ metricsDayGainLoss: 80 }));
    expect(result.violations.map((v) => v.code)).toContain("day_change_dual_path");
  });

  it("skips dual-path when only one source is present", () => {
    const result = assertDisplayInvariants(healthy({ metricsDayGainLoss: undefined }));
    expect(result.ok).toBe(true);
  });

  it("flags holdings row sum vs invested", () => {
    const result = assertDisplayInvariants(healthy({ holdingsRowSum: 1 }));
    expect(result.violations.map((v) => v.code)).toContain("row_sum_holdings");
  });

  it("treats 1-cent drift as close", () => {
    expect(valuesClose(100, 100.01)).toBe(true);
    const result = assertDisplayInvariants(healthy({ gainLoss: 1000.005 }));
    expect(result.violations.map((v) => v.code)).not.toContain("gain_loss_identity");
  });
});

describe("telemetry helpers", () => {
  it("buckets holding counts", () => {
    expect(holdingBucket(0)).toBe("0");
    expect(holdingBucket(3)).toBe("1-5");
    expect(holdingBucket(20)).toBe("6-20");
    expect(holdingBucket(21)).toBe("21+");
  });

  it("fingerprints codes stably without amounts", () => {
    const fp = fingerprintViolations([
      { code: "gain_loss_pct", relErrorBps: 12 },
      { code: "non_finite", relErrorBps: 0 },
      { code: "gain_loss_pct", relErrorBps: 99 },
    ]);
    expect(fp).toBe("gain_loss_pct,non_finite");
  });

  it("builds metadata under the track endpoint cap", () => {
    const meta = displayInvariantTelemetryMetadata(
      [{ code: "day_change_trf003", relErrorBps: 12.4 }],
      "home",
      8,
    );
    expect(meta).toEqual({
      codes: "day_change_trf003",
      max_bps: "12",
      surface: "home",
      holding_bucket: "6-20",
    });
    for (const v of Object.values(meta)) {
      expect(v.length).toBeLessThanOrEqual(128);
    }
    expect(maxRelErrorBps([])).toBe(0);
  });
});
