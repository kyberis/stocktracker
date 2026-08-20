import { describe, expect, it } from "vitest";
import {
  mergeSoftPreferringQuotes,
  seedSoftFromPublished,
} from "./seed-soft";
import type { HardDataCandidate } from "@/lib/screening/schemas";

const candidate = {
  ticker: "UBER",
  name: "Uber Technologies, Inc.",
  sector: "Technology",
  industry: "Software - Application",
  country: "US",
  marketCapUsd: 1e11,
  price: 70,
  rankScore: 80,
  rankReason: "Analyze.",
  analysisSummary:
    "Uber operates a global mobility and delivery marketplace connecting riders, drivers, and merchants.",
} as HardDataCandidate;

describe("seedSoftFromPublished", () => {
  it("scores A1 from the FMP profile instead of insufficient_evidence", () => {
    const rows = seedSoftFromPublished({
      ticker: "UBER",
      candidate,
      now: "2026-08-20T12:00:00.000Z",
    });
    const a1 = rows.find((r) => r.field_id === "EQ:A1");
    expect(a1?.confidence).not.toBe("insufficient_evidence");
    expect(a1?.score).toBe(3);
    expect(a1?.evidence[0]?.quote).toMatch(/mobility/);
  });

  it("uses a news headline as a dated J2 catalyst", () => {
    const rows = seedSoftFromPublished({
      ticker: "UBER",
      candidate,
      news: [
        {
          title: "Uber reports record trips in Q2 2026",
          url: "https://example.com/uber-q2",
          publishedDate: "2026-08-01",
        },
      ],
      now: "2026-08-20T12:00:00.000Z",
    });
    expect(rows.find((r) => r.field_id === "EQ:J2")?.evidence[0]?.quote).toMatch(
      /record trips/,
    );
  });
});

describe("mergeSoftPreferringQuotes", () => {
  it("keeps the seed when the LLM row has no quote", () => {
    const seeds = seedSoftFromPublished({
      ticker: "UBER",
      candidate,
      now: "2026-08-20T12:00:00.000Z",
    });
    const merged = mergeSoftPreferringQuotes(
      [
        {
          asset_id: "UBER",
          field_id: "EQ:A1",
          score: null,
          confidence: "insufficient_evidence",
          rationale: "no quote",
          evidence: [],
          disconfirming_evidence: [],
          assessed_at: "2026-08-20T12:00:00.000Z",
          assessed_by: "llm",
        },
      ],
      seeds,
      ["EQ:A1"],
      "UBER",
      "llm",
    );
    expect(merged[0]?.confidence).toBe("medium");
    expect(merged[0]?.evidence.length).toBeGreaterThan(0);
  });
});
