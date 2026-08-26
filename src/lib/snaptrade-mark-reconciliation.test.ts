import { describe, expect, it } from "vitest";
import {
  compareBrokerMarks,
  markGapFingerprint,
  parseStoredMarkReconciliation,
  shouldNotifyMarkGap,
  MARK_GAP_ABS_EUR,
} from "./snaptrade-mark-reconciliation";

const rates = { EURUSD: 1.165637 };

describe("compareBrokerMarks", () => {
  it("flags BITC when broker last is ~1.6× the live market last", () => {
    const result = compareBrokerMarks(
      [
        {
          ticker: "BITC",
          name: "Bitwise Trendwise Bitcoin",
          shares: 257,
          displayCurrency: "USD",
          brokerPrice: 65.45,
          marketPrice: 40.655,
          marketCurrency: "USD",
        },
      ],
      rates,
    );
    expect(result.gaps).toHaveLength(1);
    expect(result.gaps[0].ticker).toBe("BITC");
    expect(result.gaps[0].deltaEUR).toBeGreaterThan(5000);
    expect(result.gaps[0].absPct).toBeGreaterThan(0.5);
  });

  it("ignores sub-threshold noise (FVRR-sized cents)", () => {
    const result = compareBrokerMarks(
      [
        {
          ticker: "FVRR",
          shares: 47,
          displayCurrency: "USD",
          brokerPrice: 9.58,
          marketPrice: 9.47,
          marketCurrency: "USD",
        },
      ],
      rates,
    );
    expect(result.gaps).toHaveLength(0);
    expect(Math.abs(result.totalDeltaEUR)).toBeLessThan(MARK_GAP_ABS_EUR);
  });

  it("skips positions without a broker price", () => {
    const result = compareBrokerMarks(
      [
        {
          ticker: "VUSA.AS",
          shares: 263,
          displayCurrency: "EUR",
          brokerPrice: 0,
          marketPrice: 124.86,
          marketCurrency: "EUR",
        },
      ],
      {},
    );
    expect(result.gaps).toHaveLength(0);
    expect(result.brokerHoldingsEUR).toBe(0);
  });

  it("uses marketValueEUR when marketPrice is missing", () => {
    const result = compareBrokerMarks(
      [
        {
          ticker: "BITC",
          shares: 257,
          displayCurrency: "USD",
          brokerPrice: 65.45,
          marketValueEUR: 8963.63,
        },
      ],
      rates,
    );
    expect(result.gaps).toHaveLength(1);
    expect(result.gaps[0].marketValueEUR).toBeCloseTo(8963.63, 0);
  });
});

describe("markGapFingerprint / shouldNotifyMarkGap", () => {
  it("fingerprints sorted tickers", () => {
    const result = compareBrokerMarks(
      [
        {
          ticker: "zzz",
          shares: 10,
          displayCurrency: "EUR",
          brokerPrice: 20,
          marketPrice: 10,
        },
        {
          ticker: "aaa",
          shares: 10,
          displayCurrency: "EUR",
          brokerPrice: 20,
          marketPrice: 10,
        },
      ],
      {},
    );
    expect(markGapFingerprint(result)).toBe("AAA,ZZZ");
  });

  it("notifies on first gap and after fingerprint change, not within 24h for the same set", () => {
    expect(
      shouldNotifyMarkGap({ fingerprint: "BITC", lastFingerprint: "", lastNotifiedAt: "" }),
    ).toBe(true);
    expect(
      shouldNotifyMarkGap({
        fingerprint: "BITC",
        lastFingerprint: "BITC",
        lastNotifiedAt: "2026-08-26T10:00:00.000Z",
        now: new Date("2026-08-26T12:00:00.000Z"),
      }),
    ).toBe(false);
    expect(
      shouldNotifyMarkGap({
        fingerprint: "BITC,FVRR",
        lastFingerprint: "BITC",
        lastNotifiedAt: "2026-08-26T10:00:00.000Z",
        now: new Date("2026-08-26T12:00:00.000Z"),
      }),
    ).toBe(true);
    expect(
      shouldNotifyMarkGap({
        fingerprint: "BITC",
        lastFingerprint: "BITC",
        lastNotifiedAt: "2026-08-25T10:00:00.000Z",
        now: new Date("2026-08-26T12:00:00.000Z"),
      }),
    ).toBe(true);
  });

  it("does not notify when there are no gaps", () => {
    expect(
      shouldNotifyMarkGap({ fingerprint: "", lastFingerprint: "BITC", lastNotifiedAt: "" }),
    ).toBe(false);
  });
});

describe("parseStoredMarkReconciliation", () => {
  it("returns null for empty or gapless JSON", () => {
    expect(parseStoredMarkReconciliation("")).toBeNull();
    expect(parseStoredMarkReconciliation("{}")).toBeNull();
    expect(parseStoredMarkReconciliation(JSON.stringify({ gaps: [] }))).toBeNull();
  });

  it("returns the snapshot when gaps exist", () => {
    const raw = JSON.stringify({
      asOf: "2026-08-26T00:00:00.000Z",
      gaps: [{ ticker: "BITC", deltaEUR: 5000 }],
    });
    expect(parseStoredMarkReconciliation(raw)?.gaps[0].ticker).toBe("BITC");
  });
});
