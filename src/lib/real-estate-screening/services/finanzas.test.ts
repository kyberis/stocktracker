import { describe, expect, it } from "vitest";
import { cuota, costesCompra, cashflowMensual, pickFiscalRegime } from "./finanzas";
import impuestos from "../config/impuestos.json";

describe("cuota", () => {
  it("matches the standard French amortization formula", () => {
    const L = 264000;
    const tan = 0.035;
    const n = 360;
    const expected = (L * (tan / 12)) / (1 - (1 + tan / 12) ** -n);
    expect(cuota(L, tan, n)).toBeCloseTo(expected, 6);
  });
});

describe("costesCompra", () => {
  it("is IMT + 0.8% + 2000", () => {
    const p = 330000;
    const c = costesCompra(p, "segunda_vivienda");
    expect(c).toBeGreaterThan(0.008 * p + impuestos.gastosRegistroEur);
  });
});

describe("cashflowMensual", () => {
  it("subtracts vacancy, costs, IRS and installment from rent", () => {
    const m = cashflowMensual({
      rentaFirmada: 1000,
      precio: 330000,
      principal: 264000,
      tan: 0.035,
      nMonths: 360,
      irsTasa: 0.1,
    });
    expect(m.rentaEfectiva).toBeCloseTo(1000 * (1 - impuestos.vacancia), 6);
    expect(m.cashflow).toBeLessThan(m.rentaEfectiva);
  });
});

describe("pickFiscalRegime", () => {
  it("prefers RSAA 0% when rent is at or below 80% of INE median × area", () => {
    const r = pickFiscalRegime({ rentaPedida: 800, areaM2: 80, rentaIneM2: 15 });
    expect(r.mejor.kind).toBe("rsaa_0");
    expect(r.mejor.tasa).toBe(0);
  });
});
