import { test, expect } from "@playwright/test";
import { createTestUser, loginAsAdmin } from "./helpers";

test.describe("Alert Integration API", () => {
  test.beforeEach(async ({ request }) => {
    const ok = await loginAsAdmin(request);
    expect(ok).toBe(true);
    await request.post("/api/admin/feature-flags", {
      data: { flag: "alerts_enabled", enabled: true },
    });
    await createTestUser(request, false);
  });

  test("GET /api/alerts/tickers returns empty set for new user", async ({ request }) => {
    const res = await request.get("/api/alerts/tickers");
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.tickers).toEqual([]);
  });

  test("create alert from watchlist source and verify tickers endpoint", async ({ request }) => {
    const create = await request.post("/api/alerts", {
      data: {
        ticker: "AAPL",
        name: "Apple Inc",
        condition: "below",
        threshold: 150,
        currency: "USD",
        alertType: "threshold",
        source: "watchlist",
      },
    });
    expect(create.status()).toBe(201);
    const alert = (await create.json()).alert;
    expect(alert.ticker).toBe("AAPL");

    const tickers = await request.get("/api/alerts/tickers");
    expect(tickers.status()).toBe(200);
    const data = await tickers.json();
    expect(data.tickers).toContain("AAPL");
  });

  test("create alert from stock-drawer source", async ({ request }) => {
    const create = await request.post("/api/alerts", {
      data: {
        ticker: "MSFT",
        name: "Microsoft",
        condition: "above",
        threshold: 400,
        currency: "USD",
        alertType: "threshold",
        source: "stock-drawer",
      },
    });
    expect(create.status()).toBe(201);
    const alert = (await create.json()).alert;
    expect(alert.ticker).toBe("MSFT");
  });

  test("create portfolio-wide alert from profile source", async ({ request }) => {
    const create = await request.post("/api/alerts", {
      data: {
        ticker: "",
        name: "",
        condition: "above",
        alertType: "percent_change",
        percentBasis: "daily",
        percentValue: 5,
        isPortfolioWide: true,
        source: "profile",
      },
    });
    expect(create.status()).toBe(201);
    const alert = (await create.json()).alert;
    expect(alert.ticker).toBe("__PORTFOLIO__");
    expect(alert.isPortfolioWide).toBe(true);
    expect(alert.percentValue).toBe(5);

    const tickers = await request.get("/api/alerts/tickers");
    const data = await tickers.json();
    expect(data.tickers).toContain("__PORTFOLIO__");
  });

  test("deleting alert removes ticker from alerted tickers", async ({ request }) => {
    const create = await request.post("/api/alerts", {
      data: {
        ticker: "TSLA",
        name: "Tesla",
        condition: "below",
        threshold: 200,
        currency: "USD",
        alertType: "threshold",
        source: "alerts-tab",
      },
    });
    expect(create.status()).toBe(201);
    const alertId = (await create.json()).alert.id;

    let tickersRes = await request.get("/api/alerts/tickers");
    let data = await tickersRes.json();
    expect(data.tickers).toContain("TSLA");

    const del = await request.delete(`/api/alerts?id=${alertId}`);
    expect(del.status()).toBe(200);

    tickersRes = await request.get("/api/alerts/tickers");
    data = await tickersRes.json();
    expect(data.tickers).not.toContain("TSLA");
  });

  test("multiple alerts for different tickers all appear in tickers list", async ({ request }) => {
    await request.post("/api/alerts", {
      data: {
        ticker: "AAPL",
        name: "Apple",
        condition: "below",
        threshold: 150,
        currency: "USD",
        alertType: "threshold",
        source: "watchlist",
      },
    });
    await request.post("/api/alerts", {
      data: {
        ticker: "GOOGL",
        name: "Alphabet",
        condition: "above",
        threshold: 180,
        currency: "USD",
        alertType: "threshold",
        source: "stock-drawer",
      },
    });

    const tickers = await request.get("/api/alerts/tickers");
    const data = await tickers.json();
    expect(data.tickers).toContain("AAPL");
    expect(data.tickers).toContain("GOOGL");
  });

  test("paused alert ticker is not in alerted tickers", async ({ request }) => {
    const create = await request.post("/api/alerts", {
      data: {
        ticker: "NVDA",
        name: "NVIDIA",
        condition: "above",
        threshold: 500,
        currency: "USD",
        alertType: "threshold",
        source: "stock-row",
      },
    });
    expect(create.status()).toBe(201);
    const alertId = (await create.json()).alert.id;

    const pause = await request.patch("/api/alerts", {
      data: { id: alertId, active: false },
    });
    expect(pause.status()).toBe(200);

    const tickers = await request.get("/api/alerts/tickers");
    const data = await tickers.json();
    expect(data.tickers).not.toContain("NVDA");
  });

  test("watchlist CRUD still works alongside alerts", async ({ request }) => {
    const add = await request.post("/api/watchlist", {
      data: { ticker: "AMZN", name: "Amazon", exchange: "NMS" },
    });
    expect(add.status()).toBe(201);

    const list = await request.get("/api/watchlist");
    const items = await list.json();
    expect(items.some((i: { ticker: string }) => i.ticker === "AMZN")).toBe(true);

    const item = items.find((i: { ticker: string }) => i.ticker === "AMZN");
    const del = await request.delete(`/api/watchlist?id=${item.id}`);
    expect(del.status()).toBe(200);
  });
});
