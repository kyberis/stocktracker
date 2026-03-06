import { test, expect } from "@playwright/test";
import { createTestUser } from "./helpers";

test.describe("Portfolio API", () => {
  test.beforeEach(async ({ request }) => {
    await createTestUser(request, false);
  });

  test("CRUD holdings", async ({ request }) => {
    const add = await request.post("/api/holdings", {
      data: {
        name: "Apple Inc",
        ticker: "AAPL",
        isin: "",
        shares: 10,
        purchasePrice: 150,
        displayCurrency: "USD",
        exchange: "",
        valueInEUR: 0,
      },
    });
    expect(add.status()).toBe(201);
    const holding = await add.json();
    expect(holding.ticker).toBe("AAPL");

    const list = await request.get("/api/holdings");
    const holdings = await list.json();
    expect(holdings.some((h: { id: string }) => h.id === holding.id)).toBe(true);

    const update = await request.put("/api/holdings", {
      data: { id: holding.id, updates: { shares: 20 } },
    });
    expect(update.status()).toBe(200);

    const del = await request.delete(`/api/holdings?id=${holding.id}`);
    expect(del.status()).toBe(200);

    const listAfter = await request.get("/api/holdings");
    const holdingsAfter = await listAfter.json();
    expect(holdingsAfter.find((h: { id: string }) => h.id === holding.id)).toBeUndefined();
  });

  test("CRUD transactions", async ({ request }) => {
    const add = await request.post("/api/transactions", {
      data: {
        holdingId: "",
        ticker: "MSFT",
        type: "buy",
        date: "2026-01-15",
        shares: 5,
        pricePerShare: 400,
        totalAmount: 2000,
        fees: 1.5,
        taxes: 0,
        currency: "USD",
        notes: "E2E test",
      },
    });
    expect(add.status()).toBe(201);
    const tx = await add.json();
    expect(tx.ticker).toBe("MSFT");

    const list = await request.get("/api/transactions");
    const txs = await list.json();
    expect(txs.some((t: { id: string }) => t.id === tx.id)).toBe(true);

    const del = await request.delete(`/api/transactions?id=${tx.id}`);
    expect(del.status()).toBe(200);
  });

  test("CRUD cash entries", async ({ request }) => {
    const add = await request.post("/api/cash", {
      data: { name: "Savings", amountEUR: 1000 },
    });
    expect(add.status()).toBe(201);
    const cash = await add.json();
    expect(cash.name).toBe("Savings");

    const list = await request.get("/api/cash");
    const entries = await list.json();
    expect(entries.some((c: { id: string }) => c.id === cash.id)).toBe(true);

    const update = await request.put("/api/cash", {
      data: { id: cash.id, updates: { amountEUR: 2000 } },
    });
    expect(update.status()).toBe(200);

    const del = await request.delete(`/api/cash?id=${cash.id}`);
    expect(del.status()).toBe(200);
  });

  test("CRUD watchlist", async ({ request }) => {
    const add = await request.post("/api/watchlist", {
      data: { ticker: "TSLA", name: "Tesla Inc", exchange: "" },
    });
    expect(add.status()).toBe(201);

    const list = await request.get("/api/watchlist");
    const items = await list.json();
    const item = items.find((w: { ticker: string }) => w.ticker === "TSLA");
    expect(item).toBeDefined();

    const del = await request.delete(`/api/watchlist?id=${item.id}`);
    expect(del.status()).toBe(200);
  });

  test("CRUD accounts", async ({ request }) => {
    const add = await request.post("/api/accounts", {
      data: { name: "DEGIRO" },
    });
    expect(add.status()).toBe(201);
    const acc = await add.json();

    const list = await request.get("/api/accounts");
    const accounts = await list.json();
    expect(accounts.some((a: { id: string }) => a.id === acc.id)).toBe(true);

    const del = await request.delete(`/api/accounts?id=${acc.id}`);
    expect(del.status()).toBe(200);
  });

  test("CRUD rebalance targets", async ({ request }) => {
    const add = await request.post("/api/rebalance-targets", {
      data: { label: "US Stocks", targetPercent: 60, category: "equity" },
    });
    expect(add.status()).toBe(200);
    const target = await add.json();

    const list = await request.get("/api/rebalance-targets");
    expect(list.status()).toBe(200);
    const targets = await list.json();
    expect(Array.isArray(targets)).toBe(true);
    expect(targets.some((t: { id: string }) => t.id === target.id)).toBe(true);

    const del = await request.delete(`/api/rebalance-targets?id=${target.id}`);
    expect(del.status()).toBe(200);
  });
});
