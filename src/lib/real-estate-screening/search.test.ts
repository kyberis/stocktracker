import { describe, expect, it } from "vitest";
import { foldPt, zoneSearchScore, zoneSelectable, disabledReason } from "./search";
import { DEFAULT_SCREENING_PARAMS, realEstateScreeningParamsSchema } from "./schemas";

describe("foldPt", () => {
  it("matches Setubal to Setúbal", () => {
    expect(foldPt("Setubal")).toBe(foldPt("Setúbal"));
  });
});

describe("zoneSearchScore", () => {
  it("ranks an accent-folded prefix high", () => {
    expect(zoneSearchScore("Setubal", "Setúbal", "Península de Setúbal")).toBeGreaterThan(70);
  });
});

describe("zoneSelectable", () => {
  it("requires both sale and rent coverage", () => {
    expect(zoneSelectable({ tieneDatosVenta: true, tieneDatosRenta: false })).toBe(false);
    expect(disabledReason({ tieneDatosVenta: true, tieneDatosRenta: false })).toBe("sin_datos_renta");
    expect(zoneSelectable({ tieneDatosVenta: true, tieneDatosRenta: true })).toBe(true);
  });
});

describe("params schema", () => {
  it("accepts product defaults", () => {
    expect(realEstateScreeningParamsSchema.parse(DEFAULT_SCREENING_PARAMS).presupuestoMaxEur).toBe(330000);
  });
});
