import { describe, expect, it } from "vitest";
import { estimateRent, type RentComparable } from "./renta";

const comps: RentComparable[] = [
  { id: "1", m2: 80, rent: 900, tipologia: "T2" },
  { id: "2", m2: 90, rent: 1000, tipologia: "T2" },
  { id: "3", m2: 85, rent: 950, tipologia: "T2" },
  { id: "4", m2: 100, rent: 1100, tipologia: "T2" },
  { id: "5", m2: 88, rent: 980, tipologia: "T2" },
];

describe("estimateRent", () => {
  it("applies an 8% negotiation haircut and records the INE gap", () => {
    const est = estimateRent({
      areaM2: 90,
      tipologia: "T2",
      comps,
      rentaIneM2: 5,
    });
    expect(est.mediana).not.toBeNull();
    expect(est.afterNegotiation).toBeCloseTo((est.renta as number) * 0.92, 6);
    expect(est.brechaVsInePct).not.toBeNull();
    expect(est.brechaVsInePct as number).toBeGreaterThan(40);
    expect(est.revisionManual).toBe(true);
    expect(est.explicacion).toContain("REVISION_MANUAL");
  });
});
