import { describe, expect, it } from "vitest";
import {
  formatDayMoveAsOf,
  isSameLocalDay,
  parseQuoteTimestamp,
  resolveDayMoveAsOf,
} from "./quote-time";

describe("parseQuoteTimestamp", () => {
  it("parses Date, unix seconds, and milliseconds", () => {
    const d = new Date("2026-08-14T20:00:00Z");
    expect(parseQuoteTimestamp(d)).toBe(d.getTime());
    expect(parseQuoteTimestamp(d.getTime())).toBe(d.getTime());
    expect(parseQuoteTimestamp(d.getTime() / 1000)).toBe(d.getTime());
  });

  it("parses ISO strings and YYYY-MM-DD at UTC noon", () => {
    expect(parseQuoteTimestamp("2026-08-14T20:00:00.000Z")).toBe(Date.parse("2026-08-14T20:00:00.000Z"));
    expect(parseQuoteTimestamp("2026-08-14")).toBe(Date.parse("2026-08-14T12:00:00Z"));
  });

  it("returns undefined for empty or invalid values", () => {
    expect(parseQuoteTimestamp(undefined)).toBeUndefined();
    expect(parseQuoteTimestamp("")).toBeUndefined();
    expect(parseQuoteTimestamp(0)).toBeUndefined();
    expect(parseQuoteTimestamp("not-a-date")).toBeUndefined();
  });
});

describe("resolveDayMoveAsOf", () => {
  it("uses the latest market time so Monday G/L is labeled with Friday's close", () => {
    const friday = Date.parse("2026-08-14T20:00:00Z");
    const earlier = Date.parse("2026-08-14T15:30:00Z");
    const mondayFetch = new Date("2026-08-17T08:00:00Z");
    const asOf = resolveDayMoveAsOf(
      {
        AAPL: { regularMarketTime: friday, fetchedAt: mondayFetch.getTime() },
        SAP: { regularMarketTime: earlier, fetchedAt: mondayFetch.getTime() },
      },
      mondayFetch,
    );
    expect(asOf?.getTime()).toBe(friday);
  });

  it("falls back to lastUpdated when quotes have no market time", () => {
    const fetched = new Date("2026-08-17T08:15:00Z");
    expect(resolveDayMoveAsOf({ AAPL: { fetchedAt: fetched.getTime() } }, fetched)?.getTime()).toBe(
      fetched.getTime(),
    );
  });

  it("returns null when nothing is available", () => {
    expect(resolveDayMoveAsOf({}, null)).toBeNull();
  });
});

describe("formatDayMoveAsOf", () => {
  it("labels the same local day as today plus time", () => {
    const now = new Date(2026, 7, 17, 10, 0, 0);
    const asOf = new Date(2026, 7, 17, 16, 32, 0);
    expect(formatDayMoveAsOf(asOf, "en", "today", now)).toMatch(/^today · /);
  });

  it("labels a prior session with weekday and date", () => {
    const monday = new Date(2026, 7, 17, 9, 0, 0);
    const friday = new Date(2026, 7, 14, 22, 4, 0);
    const label = formatDayMoveAsOf(friday, "en", "today", monday);
    expect(label).not.toMatch(/today/);
    expect(label).toMatch(/Fri/i);
    expect(label).toMatch(/·/);
  });

  it("treats calendar days as local", () => {
    const a = new Date(2026, 7, 17, 0, 1, 0);
    const b = new Date(2026, 7, 17, 23, 59, 0);
    expect(isSameLocalDay(a, b)).toBe(true);
    expect(isSameLocalDay(a, new Date(2026, 7, 16, 23, 59, 0))).toBe(false);
  });
});
