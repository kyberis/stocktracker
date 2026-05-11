import { describe, expect, it } from "vitest";
import { myinvestorParser } from "../myinvestor";

describe("myinvestorParser", () => {
  const isinMap = { US0378331005: "AAPL", ES0148396007: "ITX.MC" };

  it("parses comma-separated synthetic export (Spanish headers)", () => {
    const csv = [
      "Fecha valor,ISIN,Valor,Tipo operación,Nominal,Precio,Importe,Divisa",
      "2024-06-15,US0378331005,APPLE INC,Compra,10,150.5,1505,USD",
      "2024-07-01,ES0148396007,INDITEX,Venta,5,32.10,160.50,EUR",
    ].join("\n");

    const txs = myinvestorParser.parse(csv, isinMap);
    expect(txs.length).toBe(2);

    const buy = txs.find((t) => t.type === "buy")!;
    expect(buy.date).toBe("2024-06-15");
    expect(buy.ticker).toBe("AAPL");
    expect(buy.shares).toBe(10);
    expect(buy.pricePerShare).toBe(150.5);
    expect(buy.totalAmount).toBe(1505);
    expect(buy.currency).toBe("USD");

    const sell = txs.find((t) => t.type === "sell")!;
    expect(sell.ticker).toBe("ITX.MC");
    expect(sell.shares).toBe(5);
    expect(sell.totalAmount).toBe(160.5);
  });

  it("parses semicolon delimiter with European amounts", () => {
    const csv = [
      "Fecha valor;ISIN;Valor;Tipo operación;Nominal;Precio;Importe;Divisa",
      "2024-08-20;US0378331005;APPLE INC;Compra;2;1.234,56;2469,12;EUR",
    ].join("\n");

    const txs = myinvestorParser.parse(csv, isinMap);
    expect(txs.length).toBe(1);
    expect(txs[0].pricePerShare).toBeCloseTo(1234.56, 2);
    expect(txs[0].totalAmount).toBeCloseTo(2469.12, 2);
  });

  it("extracts distinct ISINs", () => {
    const csv = [
      "Fecha valor,ISIN,Valor,Tipo operación,Nominal,Precio,Importe,Divisa",
      "2024-06-15,US0378331005,APPLE INC,Compra,10,150.5,1505,USD",
      "2024-07-01,US0378331005,APPLE INC,Dividendo,0,0,12.34,USD",
    ].join("\n");

    const isins = myinvestorParser.extractIsins!(csv);
    expect(isins).toEqual(["US0378331005"]);
  });

  it("throws when date column is missing", () => {
    const csv = ["ISIN,Valor", "US0378331005,FOO"].join("\n");
    expect(() => myinvestorParser.parse(csv, {})).toThrow(/no date column/i);
  });
});
