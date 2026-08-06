import { describe, expect, it } from "vitest";
import {
  buildDiscoveryOpenedMetadata,
  buildEntryBackHomeMetadata,
  buildEntryCtaMetadata,
  buildEntryViewMetadata,
} from "../track-entry";
import { screeningEntryEventBodySchema } from "../schemas";

describe("screening entry track helpers", () => {
  it("builds view metadata with truncated sector and one-decimal pct", () => {
    const meta = buildEntryViewMetadata({
      variant: "overexposed",
      preview: "live",
      topSector: "Technology",
      topPct: 48.26,
    });
    expect(meta).toEqual({
      variant: "overexposed",
      preview: "live",
      top_sector: "Technology",
      top_pct: "48.3",
    });
  });

  it("builds CTA and back-home metadata", () => {
    expect(
      buildEntryCtaMetadata({
        intent: "rebalance",
        variant: "balanced",
        preview: "fixture",
        primary: false,
      }),
    ).toEqual({
      intent: "rebalance",
      variant: "balanced",
      preview: "fixture",
      primary: "false",
    });
    expect(buildEntryBackHomeMetadata({ variant: "empty", preview: "live" })).toEqual({
      variant: "empty",
      preview: "live",
    });
    expect(buildDiscoveryOpenedMetadata()).toEqual({ source: "diversify" });
  });

  it("accepts body schema for all entry events", () => {
    for (const event of [
      "screening_discovery_opened",
      "screening_entry_viewed",
      "screening_entry_cta_clicked",
      "screening_entry_back_home",
    ] as const) {
      const parsed = screeningEntryEventBodySchema.safeParse({
        event,
        metadata: { preview: "live" },
      });
      expect(parsed.success).toBe(true);
    }
  });
});
