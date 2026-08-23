import { describe, expect, it } from "vitest";
import { FINPULSE_ON_READ_STALE_MS, finPulseNeedsIngest } from "./build-finpulse";

describe("finPulseNeedsIngest", () => {
  const now = Date.parse("2026-08-23T12:00:00.000Z");

  it("ingests when the cache is empty", () => {
    expect(finPulseNeedsIngest(undefined, now)).toBe(true);
  });

  it("ingests when the newest post is older than the cache TTL", () => {
    const fetchedAt = new Date(now - FINPULSE_ON_READ_STALE_MS - 1).toISOString();
    expect(finPulseNeedsIngest(fetchedAt, now)).toBe(true);
  });

  it("skips ingest when the newest post is fresh", () => {
    const fetchedAt = new Date(now - FINPULSE_ON_READ_STALE_MS + 60_000).toISOString();
    expect(finPulseNeedsIngest(fetchedAt, now)).toBe(false);
  });
});
