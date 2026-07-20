import { describe, expect, it } from "vitest";
import { buildCongress, pickSectorAlternative } from "./assemble";
import type { CompanyAnalysisPeer } from "./types";

describe("buildCongress", () => {
  it("returns empty list without inventing trades", () => {
    const result = buildCongress([]);
    expect(result.status).toBe("ok");
    expect(result.items).toEqual([]);
  });

  it("marks unavailable when source failed", () => {
    expect(buildCongress(null).status).toBe("unavailable");
  });
});

describe("pickSectorAlternative", () => {
  it("picks peer with better 52w momentum", () => {
    const peers: CompanyAnalysisPeer[] = [
      { ticker: "MCD", name: "McD", price: 250, distanceTo52wHighPct: -25, ma50: null, ma200: null },
      { ticker: "YUM", name: "Yum", price: 140, distanceTo52wHighPct: -5, ma50: null, ma200: null },
      { ticker: "QSR", name: "QSR", price: 70, distanceTo52wHighPct: -40, ma50: null, ma200: null },
    ];
    const alt = pickSectorAlternative("MCD", -25, peers);
    expect(alt.status).toBe("ok");
    expect(alt.ticker).toBe("YUM");
  });

  it("unavailable when no peers", () => {
    const alt = pickSectorAlternative("MCD", -10, []);
    expect(alt.status).toBe("unavailable");
    expect(alt.ticker).toBeNull();
  });
});
