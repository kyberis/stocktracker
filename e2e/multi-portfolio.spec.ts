import { test, expect } from "@playwright/test";
import { createTestUser, loginAsAdmin } from "./helpers";

test.describe("Single Portfolio API", () => {
  test.beforeEach(async ({ request }) => {
    await createTestUser(request, false);
  });

  test("default portfolio auto-created on signup", async ({ request }) => {
    const res = await request.get("/api/portfolios");
    expect(res.status()).toBe(200);
    const { portfolios } = await res.json();
    expect(portfolios).toHaveLength(1);
    expect(portfolios[0].isDefault).toBe(true);
    expect(portfolios[0].name).toBe("My Portfolio");
  });

  test("creating a second portfolio is blocked for free and pro", async ({ request }) => {
    const list1 = await request.get("/api/portfolios");
    const { portfolios: initial } = await list1.json();
    expect(initial).toHaveLength(1);

    const createRes = await request.post("/api/portfolios", {
      data: { name: "Growth" },
    });
    expect(createRes.status()).toBe(403);
    const errBody = await createRes.json();
    expect(errBody.limit).toBe(1);
    expect(String(errBody.error)).toMatch(/single portfolio|limit/i);

    const adminOk = await loginAsAdmin(request);
    if (adminOk) {
      const me = await request.get("/api/auth/me");
      const user = (await me.json()).user;
      if (user?.id) {
        await request.post("/api/admin/users", {
          data: { action: "setPlan", userId: user.id, plan: "pro" },
        });
        const proCreate = await request.post("/api/portfolios", {
          data: { name: "Pro Extra" },
        });
        expect(proCreate.status()).toBe(403);
      }
    }
  });

  test("move between portfolios is blocked", async ({ request }) => {
    const pRes = await request.get("/api/portfolios");
    const { portfolios } = await pRes.json();
    const id = portfolios[0].id;
    const move = await request.post("/api/portfolios/move", {
      data: {
        type: "holding",
        ticker: "AAPL",
        exchange: "NASDAQ",
        fromPortfolioId: id,
        toPortfolioId: id,
      },
    });
    expect(move.status()).toBe(403);
  });

  test("holdings scoped to portfolio", async ({ request }) => {
    const addRes = await request.post("/api/holdings", {
      data: {
        name: "Apple Inc",
        ticker: "AAPL",
        shares: 10,
        purchasePrice: 150,
        displayCurrency: "USD",
        exchange: "NASDAQ",
        isin: "",
      },
    });
    expect(addRes.status()).toBe(201);

    const all = await request.get("/api/holdings");
    expect(all.status()).toBe(200);
    const allHoldings = await all.json();
    expect(allHoldings.some((h: { ticker: string }) => h.ticker === "AAPL")).toBe(true);

    const portfolioRes = await request.get("/api/portfolios");
    const { portfolios } = await portfolioRes.json();
    const defaultPortfolioId = portfolios[0].id;

    const scoped = await request.get(`/api/holdings?portfolioId=${defaultPortfolioId}`);
    expect(scoped.status()).toBe(200);
    const scopedHoldings = await scoped.json();
    expect(scopedHoldings.some((h: { ticker: string }) => h.ticker === "AAPL")).toBe(true);

    const empty = await request.get("/api/holdings?portfolioId=nonexistent");
    expect(empty.status()).toBe(200);
    expect(await empty.json()).toHaveLength(0);
  });

  test("cash entries scoped to portfolio", async ({ request }) => {
    const addCash = await request.post("/api/cash", {
      data: { name: "Emergency Fund", amountEUR: 5000 },
    });
    expect(addCash.status()).toBe(201);

    const pRes = await request.get("/api/portfolios");
    const { portfolios } = await pRes.json();

    const scopedCash = await request.get(`/api/cash?portfolioId=${portfolios[0].id}`);
    const scopedEntries = await scopedCash.json();
    expect(scopedEntries.some((c: { name: string }) => c.name === "Emergency Fund")).toBe(true);
  });

  test("cannot delete default portfolio", async ({ request }) => {
    const pRes = await request.get("/api/portfolios");
    const { portfolios } = await pRes.json();
    const defaultId = portfolios[0].id;

    const delRes = await request.delete(`/api/portfolios/${defaultId}`);
    expect(delRes.status()).toBe(400);
  });

  test("rename portfolio", async ({ request }) => {
    const pRes = await request.get("/api/portfolios");
    const { portfolios } = await pRes.json();
    const defaultId = portfolios[0].id;

    const renameRes = await request.put(`/api/portfolios/${defaultId}`, {
      data: { name: "Renamed Portfolio" },
    });
    expect(renameRes.status()).toBe(200);
    const { portfolio } = await renameRes.json();
    expect(portfolio.name).toBe("Renamed Portfolio");
  });
});
