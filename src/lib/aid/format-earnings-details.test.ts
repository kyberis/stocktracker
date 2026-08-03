import { describe, expect, it } from "vitest";
import {
  formatEarningsCalendarDetails,
  sanitizeDigestBullet,
} from "@/lib/aid/format-earnings-details";

describe("formatEarningsCalendarDetails", () => {
  it("formats consensus-only FMP details without dumping JSON", () => {
    const raw = JSON.stringify({
      epsEstimated: 1.82,
      eps: null,
      revenue: null,
      revenueEstimated: 195_889_400_000,
      fiscalDateEnding: "",
    });
    expect(formatEarningsCalendarDetails(raw)).toBe("Est. EPS $1.82 · Est. revenue $195.9B");
  });

  it("formats actual vs estimate when both exist", () => {
    const raw = JSON.stringify({
      epsEstimated: 1.8,
      eps: 1.95,
      revenue: 200_000_000_000,
      revenueEstimated: 195_000_000_000,
      fiscalDateEnding: "2026-06-30",
    });
    expect(formatEarningsCalendarDetails(raw)).toBe(
      "EPS $1.95 vs est. $1.80 · Revenue $200.0B vs est. $195.0B · Fiscal period ending 2026-06-30",
    );
  });

  it("returns plain text excerpts unchanged", () => {
    expect(formatEarningsCalendarDetails("AMZN beat on advertising.")).toBe(
      "AMZN beat on advertising.",
    );
  });

  it("returns null for empty or useless JSON", () => {
    expect(formatEarningsCalendarDetails(null)).toBeNull();
    expect(formatEarningsCalendarDetails("")).toBeNull();
    expect(
      formatEarningsCalendarDetails(
        JSON.stringify({
          epsEstimated: null,
          eps: null,
          revenue: null,
          revenueEstimated: null,
          fiscalDateEnding: "",
        }),
      ),
    ).toBeNull();
  });
});

describe("sanitizeDigestBullet", () => {
  it("rewrites JSON bullets for display", () => {
    const raw = JSON.stringify({
      epsEstimated: 4.92,
      eps: null,
      revenue: null,
      revenueEstimated: 96_026_200_000,
      fiscalDateEnding: "",
    });
    expect(sanitizeDigestBullet(raw)).toBe("Est. EPS $4.92 · Est. revenue $96.0B");
  });

  it("leaves normal bullets alone", () => {
    expect(sanitizeDigestBullet("AI summary unavailable — showing feed excerpt only.")).toBe(
      "AI summary unavailable — showing feed excerpt only.",
    );
  });
});
