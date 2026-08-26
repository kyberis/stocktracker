import { describe, expect, it } from "vitest";
import {
  parseIneDataPayload,
  parseIneMetaGeographies,
  parseIneNumber,
  yieldBrutaPct,
  cagrPct,
  nivelToTipo,
} from "./ine-parse";

describe("parseIneNumber", () => {
  it("turns spaced thousands into a number and nulls dashes", () => {
    expect(parseIneNumber("9 577")).toBe(9577);
    expect(parseIneNumber("-")).toBeNull();
  });
});

describe("parseIneDataPayload", () => {
  it("maps Dado nulo to null and keeps numeric valores", () => {
    const json = [
      {
        Dados: {
          "1.º Trimestre de 2026": [
            { geocod: "1B01512", geodsg: "Setúbal", dim_3: "H1", valor: "2100" },
            {
              geocod: "2004901",
              geodsg: "Corvo",
              dim_3: "H1",
              sinal_conv_desc: "Dado nulo ou não aplicável",
              ind_string: "-",
            },
          ],
        },
      },
    ];
    const rows = parseIneDataPayload(json);
    expect(rows.find((r) => r.geocod === "1B01512")?.valor).toBe(2100);
    expect(rows.find((r) => r.geocod === "2004901")?.nulo).toBe(true);
    expect(rows.find((r) => r.geocod === "2004901")?.valor).toBeNull();
  });
});

describe("parseIneMetaGeographies", () => {
  it("reads last period and nivel 5 concelhos", () => {
    const json = [
      {
        Dimensoes: {
          Categoria_Dim: [
            {
              Dim_Num1_S5A20261: [{ dim_num: "1", categ_cod: "S5A20261", categ_nivel: "1" }],
              Dim_Num2_1B01512: [
                { dim_num: "2", categ_cod: "1B01512", categ_dsg: "Setúbal", categ_nivel: "5" },
              ],
            },
          ],
        },
      },
    ];
    const { lastDim1, geos } = parseIneMetaGeographies(json);
    expect(lastDim1).toBe("S5A20261");
    expect(geos[0]?.nombre).toBe("Setúbal");
    expect(nivelToTipo(5)).toBe("concelho");
  });
});

describe("derived math", () => {
  it("computes gross yield as rent×12 / price", () => {
    expect(yieldBrutaPct(10, 2400)).toBeCloseTo(5, 6);
  });
  it("computes CAGR", () => {
    expect(cagrPct(100, 121, 2)).toBeCloseTo(10, 6);
  });
});
