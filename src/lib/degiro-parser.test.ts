import { describe, expect, it } from "vitest";
import { parseDegiroCSV, buildIsinMap, parseDegiroCashBalances } from "./degiro-parser";

const ISIN_MAP: Record<string, string> = {
  US29670G1022: "WTRG",
  US8299331004: "SIRI",
  US1462805086: "SILA",
  CA21037X1006: "W9C",
  IE00B6R52036: "IS0E",
};

const HEADER =
  "Fecha,Hora,Fecha valor,Producto,ISIN,Descripción,Tipo,Variación,,Saldo,,ID Orden";

describe("parseDegiroCSV", () => {
  it("parses a buy transaction with European number format", () => {
    const csv = [
      HEADER,
      '29-01-2026,15:33,29-01-2026,SILA REALTY TRUST INC,US1462805086,Compra 35 Sila Realty Trust Inc@24 USD (US1462805086),,USD,"-840,00",USD,"-840,00",6c773b20-61b5-4bc7-845e-b530fab1edcf',
    ].join("\n");

    const txs = parseDegiroCSV(csv, ISIN_MAP);
    expect(txs).toHaveLength(1);
    expect(txs[0].type).toBe("buy");
    expect(txs[0].ticker).toBe("SILA");
    expect(txs[0].shares).toBe(35);
    expect(txs[0].pricePerShare).toBe(24);
    expect(txs[0].totalAmount).toBe(840);
    expect(txs[0].currency).toBe("USD");
    expect(txs[0].date).toBe("2026-01-29");
  });

  it("parses a sell transaction", () => {
    const csv = [
      HEADER,
      '15-01-2026,16:00,15-01-2026,SILA REALTY TRUST INC,US1462805086,Venta 10 Sila Realty Trust Inc@25 USD (US1462805086),,USD,"250,00",USD,"250,00",abc-123',
    ].join("\n");

    const txs = parseDegiroCSV(csv, ISIN_MAP);
    expect(txs).toHaveLength(1);
    expect(txs[0].type).toBe("sell");
    expect(txs[0].shares).toBe(10);
    expect(txs[0].pricePerShare).toBe(25);
  });

  it("groups dividend and withholding tax into a single transaction", () => {
    const csv = [
      HEADER,
      '03-03-2026,07:23,02-03-2026,ESSENTIAL UTILITIES INC,US29670G1022,Dividendo,,USD,"7,88",USD,"6,70",',
      '03-03-2026,07:23,02-03-2026,ESSENTIAL UTILITIES INC,US29670G1022,Retención del dividendo,,USD,"-1,18",USD,"-1,18",',
    ].join("\n");

    const txs = parseDegiroCSV(csv, ISIN_MAP);
    expect(txs).toHaveLength(1);
    expect(txs[0].type).toBe("dividend");
    expect(txs[0].ticker).toBe("WTRG");
    expect(txs[0].totalAmount).toBeCloseTo(7.88, 2);
    expect(txs[0].taxes).toBeCloseTo(1.18, 2);
  });

  it("attaches transaction fees to the parent buy/sell order", () => {
    const orderId = "6c773b20-61b5-4bc7-845e-b530fab1edcf";
    const csv = [
      HEADER,
      `29-01-2026,15:33,29-01-2026,SILA REALTY TRUST INC,US1462805086,Compra 35 Sila Realty Trust Inc@24 USD (US1462805086),,USD,"-840,00",USD,"-840,00",${orderId}`,
      `29-01-2026,15:33,29-01-2026,SILA REALTY TRUST INC,US1462805086,Costes de transacción,,USD,"-1,04",USD,"-841,04",${orderId}`,
    ].join("\n");

    const txs = parseDegiroCSV(csv, ISIN_MAP);
    const buy = txs.find((t) => t.type === "buy");
    expect(buy).toBeDefined();
    expect(buy!.fees).toBeCloseTo(1.04, 2);
  });

  it("does not duplicate an order fee across different timestamps", () => {
    const orderId = "shared-order";
    const csv = [
      HEADER,
      `29-01-2026,15:30,29-01-2026,SILA REALTY TRUST INC,US1462805086,Compra 2 Sila Realty Trust Inc@24 USD (US1462805086),,USD,"-48,00",USD,"-48,00",${orderId}`,
      `29-01-2026,15:30,29-01-2026,SILA REALTY TRUST INC,US1462805086,Costes de transacción y/o externos de DEGIRO,,USD,"-2,00",USD,"-50,00",${orderId}`,
      `29-01-2026,15:33,29-01-2026,SILA REALTY TRUST INC,US1462805086,Compra 35 Sila Realty Trust Inc@24 USD (US1462805086),,USD,"-840,00",USD,"-840,00",${orderId}`,
    ].join("\n");

    const txs = parseDegiroCSV(csv, ISIN_MAP);
    const buys = txs.filter((t) => t.type === "buy");
    expect(buys).toHaveLength(2);
    expect(buys.find((t) => t.shares === 2)?.fees).toBeCloseTo(2, 2);
    expect(buys.find((t) => t.shares === 35)?.fees).toBe(0);
  });

  it("keeps fee currency per row when it differs from trade currency", () => {
    const orderId = "mixed-currency-order";
    const csv = [
      HEADER,
      `20-02-2026,16:26,20-02-2026,BANK OF NOVA SCOTIA,CA0641491075,Costes de transacción y/o externos de DEGIRO,,EUR,"-2,00",EUR,"38,13",${orderId}`,
      `20-02-2026,16:26,20-02-2026,BANK OF NOVA SCOTIA,CA0641491075,"Venta 8 Bank of Nova Scotia@76,7 USD (CA0641491075)",,USD,"613,60",USD,"613,60",${orderId}`,
    ].join("\n");

    const txs = parseDegiroCSV(csv, ISIN_MAP);
    const sell = txs.find((t) => t.type === "sell");
    const fee = txs.find((t) => t.type === "fee");

    expect(sell).toBeDefined();
    expect(sell!.currency).toBe("USD");
    expect(sell!.fees).toBe(0);

    expect(fee).toBeDefined();
    expect(fee!.currency).toBe("EUR");
    expect(fee!.totalAmount).toBeCloseTo(2, 2);
  });

  it("creates standalone fee transactions for connectivity charges", () => {
    const csv = [
      HEADER,
      '03-03-2026,07:27,02-03-2026,,,Comisión de conectividad del mercado,,EUR,"-2,50",EUR,"100,00",',
    ].join("\n");

    const txs = parseDegiroCSV(csv, ISIN_MAP);
    expect(txs).toHaveLength(1);
    expect(txs[0].type).toBe("fee");
    expect(txs[0].totalAmount).toBeCloseTo(2.5, 2);
  });

  it("skips rows that don't match any known pattern", () => {
    const csv = [
      HEADER,
      '03-03-2026,06:35,02-03-2026,,,Ingreso Cambio de Divisa,,EUR,"10,57",EUR,"552,96",',
    ].join("\n");

    const txs = parseDegiroCSV(csv, ISIN_MAP);
    expect(txs).toHaveLength(0);
  });

  it("returns empty array for empty CSV", () => {
    expect(parseDegiroCSV("", ISIN_MAP)).toHaveLength(0);
    expect(parseDegiroCSV(HEADER, ISIN_MAP)).toHaveLength(0);
  });

  it("handles European decimal prices like 1.670", () => {
    const csv = [
      HEADER,
      '27-01-2026,19:50,27-01-2026,CONSTELLATION SOFTWARE INC,CA21037X1006,Compra 2 Constellation Software Inc@1.670 EUR (CA21037X1006),,EUR,"-3340,00",EUR,"768,80",order-123',
    ].join("\n");

    const txs = parseDegiroCSV(csv, ISIN_MAP);
    expect(txs).toHaveLength(1);
    expect(txs[0].pricePerShare).toBe(1670);
    expect(txs[0].totalAmount).toBe(3340);
  });

  it("sorts transactions by date descending", () => {
    const csv = [
      HEADER,
      '15-01-2026,10:00,15-01-2026,SILA REALTY TRUST INC,US1462805086,Compra 5 Sila Realty Trust Inc@24 USD (US1462805086),,USD,"-120,00",USD,"-120,00",order-a',
      '20-02-2026,10:00,20-02-2026,SILA REALTY TRUST INC,US1462805086,Compra 3 Sila Realty Trust Inc@25 USD (US1462805086),,USD,"-75,00",USD,"-75,00",order-b',
    ].join("\n");

    const txs = parseDegiroCSV(csv, ISIN_MAP);
    expect(txs[0].date).toBe("2026-02-20");
    expect(txs[1].date).toBe("2026-01-15");
  });

  it("leaves ticker empty for unmapped ISINs", () => {
    const csv = [
      HEADER,
      '10-01-2026,10:00,10-01-2026,UNKNOWN CORP,XX0000000000,Compra 10 Unknown Corp@5 EUR (XX0000000000),,EUR,"-50,00",EUR,"-50,00",order-x',
    ].join("\n");

    const txs = parseDegiroCSV(csv, ISIN_MAP);
    expect(txs).toHaveLength(1);
    expect(txs[0].ticker).toBe("");
    expect(txs[0].isin).toBe("XX0000000000");
  });

  it("parses DELISTING sell and attaches Corporate Action Cash Settlement proceeds", () => {
    const csv = [
      HEADER,
      '16-10-2023,10:05,13-10-2023,ACTIVISION BLIZZARD INC,US00507V1098,Corporate Action Cash Settlement,,USD,"950,00",USD,"950,00",',
      '16-10-2023,10:00,13-10-2023,ACTIVISION BLIZZARD INC,US00507V1098,DELISTING: Sell 10 Activision Blizzard Inc@0 USD (US00507V1098),,USD,"0,00",USD,"0,00",',
      '01-06-2022,10:00,01-06-2022,ACTIVISION BLIZZARD INC,US00507V1098,Compra 10 Activision Blizzard Inc@80 USD (US00507V1098),,USD,"-800,00",USD,"-800,00",buy-atvi',
    ].join("\n");

    const map = { ...ISIN_MAP, US00507V1098: "ATVI" };
    const txs = parseDegiroCSV(csv, map);
    const sell = txs.find((t) => t.type === "sell");
    const buy = txs.find((t) => t.type === "buy");

    expect(txs).toHaveLength(2);
    expect(buy?.shares).toBe(10);
    expect(sell).toBeDefined();
    expect(sell!.ticker).toBe("ATVI");
    expect(sell!.shares).toBe(10);
    expect(sell!.totalAmount).toBe(950);
    expect(sell!.pricePerShare).toBe(95);
    expect(sell!.currency).toBe("USD");
  });

  it("parses Spanish Fusión: Venta corporate-action sells", () => {
    const csv = [
      HEADER,
      '10-03-2024,12:00,10-03-2024,TARGET SA,ES0000000001,"Fusión: Venta 50 Target SA@12,5 EUR (ES0000000001)",,EUR,"625,00",EUR,"625,00",',
    ].join("\n");

    const txs = parseDegiroCSV(csv, { ES0000000001: "TGT" });
    expect(txs).toHaveLength(1);
    expect(txs[0].type).toBe("sell");
    expect(txs[0].shares).toBe(50);
    expect(txs[0].pricePerShare).toBe(12.5);
    expect(txs[0].totalAmount).toBe(625);
  });

  it("parses Dutch Verkoop and WIJZIGING ISIN: Koop paired rows", () => {
    const csv = [
      HEADER,
      '05-01-2024,09:00,05-01-2024,NEW CO,NL0000000002,WIJZIGING ISIN: Koop 20 New Co@10 EUR (NL0000000002),,EUR,"-200,00",EUR,"0,00",',
      '05-01-2024,09:00,05-01-2024,OLD CO,NL0000000001,WIJZIGING ISIN: Verkoop 20 Old Co@10 EUR (NL0000000001),,EUR,"200,00",EUR,"200,00",',
    ].join("\n");

    const txs = parseDegiroCSV(csv, {
      NL0000000001: "OLD",
      NL0000000002: "NEW",
    });
    expect(txs).toHaveLength(2);
    expect(txs.find((t) => t.type === "sell")?.isin).toBe("NL0000000001");
    expect(txs.find((t) => t.type === "buy")?.isin).toBe("NL0000000002");
  });

  it("still ignores money-market fund conversions", () => {
    const csv = [
      HEADER,
      '26-10-2020,09:45,23-10-2020,MORGAN STANLEY EUR LIQUIDITY FUND,LU1959429272,"Conversión fondos del mercado monetario: Compra 0,01 @ 0 EUR",,EUR,"99,16",EUR,"649,32",',
      '26-10-2020,09:45,23-10-2020,MORGAN STANLEY EUR LIQUIDITY FUND,LU1959429272,"Conversión fondos del mercado monetario: Venta 0,01 @ 0 EUR",,EUR,"-99,16",EUR,"550,16",',
    ].join("\n");

    const txs = parseDegiroCSV(csv, ISIN_MAP);
    expect(txs).toHaveLength(0);
  });
});

describe("parseDegiroCashBalances", () => {
  it("extracts the latest cash balance per currency", () => {
    const csv = [
      HEADER,
      '03-03-2026,07:23,02-03-2026,ESSENTIAL UTILITIES INC,US29670G1022,Dividendo,,USD,"7,88",EUR,"5,66",',
      '01-03-2026,10:00,01-03-2026,,,Ingreso,,EUR,"100,00",EUR,"100,00",',
    ].join("\n");

    const balances = parseDegiroCashBalances(csv);
    expect(balances).toHaveLength(1);
    expect(balances[0]).toEqual({ currency: "EUR", amount: 5.66 });
  });

  it("returns multiple currencies", () => {
    const csv = [
      HEADER,
      '03-03-2026,07:23,02-03-2026,,,Dividendo,,USD,"7,88",USD,"42,50",',
      '02-03-2026,10:00,02-03-2026,,,Ingreso,,EUR,"100,00",EUR,"200,00",',
    ].join("\n");

    const balances = parseDegiroCashBalances(csv);
    expect(balances).toHaveLength(2);
    expect(balances).toEqual(
      expect.arrayContaining([
        { currency: "USD", amount: 42.5 },
        { currency: "EUR", amount: 200 },
      ])
    );
  });

  it("takes the first (newest) row per currency", () => {
    const csv = [
      HEADER,
      '03-03-2026,07:23,02-03-2026,,,Dividendo,,EUR,"7,88",EUR,"300,00",',
      '01-03-2026,10:00,01-03-2026,,,Ingreso,,EUR,"100,00",EUR,"100,00",',
    ].join("\n");

    const balances = parseDegiroCashBalances(csv);
    expect(balances).toHaveLength(1);
    expect(balances[0].amount).toBe(300);
  });

  it("skips zero balances", () => {
    const csv = [
      HEADER,
      '03-03-2026,07:23,02-03-2026,,,Something,,USD,"0,00",USD,"0,00",',
      '01-03-2026,10:00,01-03-2026,,,Ingreso,,EUR,"100,00",EUR,"5,66",',
    ].join("\n");

    const balances = parseDegiroCashBalances(csv);
    expect(balances).toHaveLength(1);
    expect(balances[0].currency).toBe("EUR");
  });

  it("returns empty for CSV with only a header", () => {
    expect(parseDegiroCashBalances(HEADER)).toEqual([]);
  });

  it("returns empty for empty CSV", () => {
    expect(parseDegiroCashBalances("")).toEqual([]);
  });

  it("handles European thousand separators", () => {
    const csv = [
      HEADER,
      '03-03-2026,07:23,02-03-2026,,,Ingreso,,EUR,"1.234,56",EUR,"1.234,56",',
    ].join("\n");

    const balances = parseDegiroCashBalances(csv);
    expect(balances).toHaveLength(1);
    expect(balances[0].amount).toBe(1234.56);
  });
});

describe("buildIsinMap", () => {
  it("builds map from holdings", () => {
    const map = buildIsinMap([
      { isin: "US123", ticker: "AAPL" },
      { isin: "US456", ticker: "MSFT" },
      { isin: "", ticker: "NO_ISIN" },
    ]);
    expect(map).toEqual({ US123: "AAPL", US456: "MSFT" });
  });

  it("returns empty map for empty input", () => {
    expect(buildIsinMap([])).toEqual({});
  });
});
