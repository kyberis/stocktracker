import { describe, expect, it } from "vitest";
import { parseDegiroCSV, buildIsinMap } from "./degiro-parser";

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
