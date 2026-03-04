import { test, expect } from "@playwright/test";
import { createTestUser } from "./helpers";
import fs from "fs";
import path from "path";

const SAMPLE_CSV_PATH = path.join(process.cwd(), "docs", "portfolio_sample_degiro.csv");

const MINI_CSV = [
  "Fecha,Hora,Fecha valor,Producto,ISIN,Descripción,Tipo,Variación,,Saldo,,ID Orden",
  '29-01-2026,15:33,29-01-2026,SILA REALTY TRUST INC,US1462805086,Compra 35 Sila Realty Trust Inc@24 USD (US1462805086),,USD,"-840,00",USD,"-840,00",order-a',
  '29-01-2026,15:33,29-01-2026,SILA REALTY TRUST INC,US1462805086,Costes de transacción,,USD,"-1,04",USD,"-841,04",order-a',
  '03-03-2026,07:23,02-03-2026,ESSENTIAL UTILITIES INC,US29670G1022,Dividendo,,USD,"7,88",USD,"6,70",',
  '03-03-2026,07:23,02-03-2026,ESSENTIAL UTILITIES INC,US29670G1022,Retención del dividendo,,USD,"-1,18",USD,"-1,18",',
].join("\n");

test.describe("Broker Import – DEGIRO", () => {
  test.beforeEach(async ({ request }) => {
    await createTestUser(request, false);
  });

  test("parse action returns summary with transaction counts", async ({ request }) => {
    const res = await request.post("/api/transactions/import-broker", {
      multipart: {
        action: "parse",
        broker: "degiro",
        csv: MINI_CSV,
      },
    });
    expect(res.status()).toBe(200);

    const data = await res.json();
    expect(data.summary).toBeDefined();
    expect(data.summary.total).toBeGreaterThanOrEqual(2);
    expect(data.summary.buys).toBeGreaterThanOrEqual(1);
    expect(data.summary.dividends).toBeGreaterThanOrEqual(1);
    expect(data.transactions.length).toBe(data.summary.total);
  });

  test("import action saves transactions to database", async ({ request }) => {
    const res = await request.post("/api/transactions/import-broker", {
      multipart: {
        action: "import",
        broker: "degiro",
        csv: MINI_CSV,
      },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.imported).toBeGreaterThanOrEqual(2);

    const txList = await request.get("/api/transactions");
    const txs = await txList.json();
    expect(txs.length).toBeGreaterThanOrEqual(2);
  });

  test("parsed transactions have correct types", async ({ request }) => {
    const res = await request.post("/api/transactions/import-broker", {
      multipart: {
        action: "parse",
        broker: "degiro",
        csv: MINI_CSV,
      },
    });
    const data = await res.json();
    const types = data.transactions.map((t: { type: string }) => t.type);
    expect(types).toContain("buy");
    expect(types).toContain("dividend");
  });

  test("full sample CSV parses without errors @slow", async ({ request }) => {
    test.skip(!fs.existsSync(SAMPLE_CSV_PATH), "Sample CSV not present");
    test.skip(!process.env.RUN_SLOW_TESTS, "Skipped in CI — set RUN_SLOW_TESTS=1 to run");
    test.setTimeout(120_000);
    const csv = fs.readFileSync(SAMPLE_CSV_PATH, "utf-8");
    const res = await request.post("/api/transactions/import-broker", {
      multipart: {
        action: "parse",
        broker: "degiro",
        csv,
      },
      timeout: 90_000,
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.summary.total).toBeGreaterThan(100);
    expect(data.summary.buys).toBeGreaterThan(0);
    expect(data.summary.dividends).toBeGreaterThan(0);
  });

  test("rejects request without CSV data", async ({ request }) => {
    const res = await request.post("/api/transactions/import-broker", {
      multipart: {
        action: "parse",
        broker: "degiro",
        csv: "",
      },
    });
    expect(res.status()).toBe(400);
  });

  test("rejects unsupported broker", async ({ request }) => {
    const res = await request.post("/api/transactions/import-broker", {
      multipart: {
        action: "parse",
        broker: "unknown_broker",
        csv: "some,csv,data",
      },
    });
    expect(res.status()).toBe(400);
  });
});
