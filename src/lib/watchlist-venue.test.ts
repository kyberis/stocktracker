import { describe, expect, it } from "vitest";
import { formatWatchlistVenue } from "@/lib/watchlist-venue";

describe("formatWatchlistVenue (TRF-017)", () => {
  it("formats known Yahoo codes as country · MIC", () => {
    expect(formatWatchlistVenue("NMS")).toBe("US · NMS");
    expect(formatWatchlistVenue("GER")).toBe("DE · GER");
    expect(formatWatchlistVenue("MCE")).toBe("ES · MCE");
  });

  it("passes through unmapped codes unchanged", () => {
    expect(formatWatchlistVenue("XYZ")).toBe("XYZ");
  });

  it("handles empty", () => {
    expect(formatWatchlistVenue("")).toBe("");
    expect(formatWatchlistVenue(null)).toBe("");
  });
});
