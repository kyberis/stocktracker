import { describe, expect, it } from "vitest";
import { DEFAULT_FINPULSE_HANDLES, normalizeFinPulseHandles } from "@/lib/aid/finpulse-handles";

describe("finpulse-handles", () => {
  it("normalizes handles and dedupes", () => {
    const out = normalizeFinPulseHandles([
      { handle: "@Fed", displayName: "Fed", tags: ["macro"] },
      { handle: "fed", displayName: "Dup", tags: [] },
      { handle: "invalid handle!", displayName: "Bad", tags: [] },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]?.handle).toBe("Fed");
  });

  it("has default handles", () => {
    expect(DEFAULT_FINPULSE_HANDLES.length).toBeGreaterThan(3);
  });
});
