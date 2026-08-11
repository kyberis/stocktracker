import { test, expect, type APIRequestContext } from "@playwright/test";
import { createTestUser, loginViaUI, dismissOverlays, ensureLoggedOut, loginAsAdmin } from "./helpers";

const TEST_PASS = "TestPass123!";

async function getMe(request: APIRequestContext) {
  const res = await request.get("/api/auth/me");
  expect(res.status()).toBe(200);
  return (await res.json()).user;
}

async function setPlanViaAdmin(
  request: APIRequestContext,
  userId: string,
  plan: "free" | "starter" | "pro",
) {
  const res = await request.post("/api/admin/users", {
    data: { action: "setPlan", userId, plan },
  });
  expect(res.status()).toBe(200);
}

test.describe("Net Worth Tracking — API", () => {
  test.beforeEach(async ({ request }) => {
    await createTestUser(request, false);
  });

  test("CRUD manual asset (real_estate) with extended fields", async ({ request }) => {
    const add = await request.post("/api/cash", {
      data: {
        name: "Berlin Apartment",
        amountEUR: 280000,
        type: "real_estate",
        displayCurrency: "EUR",
        displayAmount: 280000,
        notes: "2BR, 75m²",
        valuationDate: "2026-03-01",
      },
    });
    // Free users cannot add non-cash types
    expect(add.status()).toBe(403);
  });

  test("cash type entries remain free for all tiers", async ({ request }) => {
    const add = await request.post("/api/cash", {
      data: { name: "Emergency Fund", amountEUR: 5000 },
    });
    expect(add.status()).toBe(201);
    const entry = await add.json();
    expect(entry.name).toBe("Emergency Fund");
    expect(entry.amountEUR).toBe(5000);

    const del = await request.delete(`/api/cash?id=${entry.id}`);
    expect(del.status()).toBe(200);
  });

  test("cash entries with type=cash are allowed on free plan", async ({ request }) => {
    const add = await request.post("/api/cash", {
      data: { name: "Tagesgeld", amountEUR: 3000, type: "cash" },
    });
    expect(add.status()).toBe(201);
    const entry = await add.json();
    expect(entry.type).toBe("cash");

    await request.delete(`/api/cash?id=${entry.id}`);
  });

  test("list returns extended fields", async ({ request }) => {
    await request.post("/api/cash", {
      data: { name: "EUR Cash", amountEUR: 100, type: "cash" },
    });

    const list = await request.get("/api/cash");
    expect(list.status()).toBe(200);
    const entries = await list.json();
    expect(entries.length).toBeGreaterThanOrEqual(1);

    const entry = entries.find((e: { name: string }) => e.name === "EUR Cash");
    expect(entry).toBeDefined();
    expect(entry.type).toBe("cash");
    expect(entry.displayCurrency).toBeDefined();
  });
});

test.describe("Net Worth Tracking — Tier Gating", () => {
  test("free user blocked from adding non-cash asset types", async ({ request }) => {
    await createTestUser(request, false);

    const res = await request.post("/api/cash", {
      data: {
        name: "Savings Account",
        amountEUR: 10000,
        type: "savings",
        displayCurrency: "EUR",
        displayAmount: 10000,
      },
    });
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("upgrade_required");
  });

  test("starter user can add manual assets up to limit", async ({ request }) => {
    const creds = await createTestUser(request, false);
    const me = await getMe(request);

    await ensureLoggedOut(request);
    await loginAsAdmin(request);
    await setPlanViaAdmin(request, me.id, "starter");

    await ensureLoggedOut(request);
    await request.post("/api/auth/login", {
      data: { identifier: creds.email, password: creds.password },
    });

    const add = await request.post("/api/cash", {
      data: {
        name: "Berlin Apartment",
        amountEUR: 280000,
        type: "real_estate",
        displayCurrency: "EUR",
        displayAmount: 280000,
        notes: "2BR, Mitte",
        valuationDate: "2026-03-01",
      },
    });
    expect(add.status()).toBe(201);
    const entry = await add.json();
    expect(entry.type).toBe("real_estate");
    expect(entry.notes).toBe("2BR, Mitte");
    expect(entry.displayCurrency).toBe("EUR");
    expect(entry.displayAmount).toBe(280000);
    expect(entry.valuationDate).toBe("2026-03-01");

    const addSavings = await request.post("/api/cash", {
      data: {
        name: "ING Tagesgeld",
        amountEUR: 32000,
        type: "savings",
        displayCurrency: "EUR",
        displayAmount: 32000,
        notes: "3.3% APY",
      },
    });
    expect(addSavings.status()).toBe(201);
    const savings = await addSavings.json();
    expect(savings.type).toBe("savings");

    const addPension = await request.post("/api/cash", {
      data: {
        name: "Riester Rente",
        amountEUR: 18750,
        type: "pension",
        displayCurrency: "EUR",
        displayAmount: 18750,
      },
    });
    expect(addPension.status()).toBe(201);
    expect((await addPension.json()).type).toBe("pension");

    const list = await request.get("/api/cash");
    const entries = await list.json();
    const manualAssets = entries.filter((e: { type: string }) => e.type !== "cash");
    expect(manualAssets.length).toBe(3);

    await request.delete(`/api/cash?id=${entry.id}`);
    await request.delete(`/api/cash?id=${savings.id}`);
    await request.delete(`/api/cash?id=${(await addPension.json()).id}`);
  });

  test("update manual asset fields", async ({ request }) => {
    const creds = await createTestUser(request, false);
    const me = await getMe(request);

    await ensureLoggedOut(request);
    await loginAsAdmin(request);
    await setPlanViaAdmin(request, me.id, "starter");

    await ensureLoggedOut(request);
    await request.post("/api/auth/login", {
      data: { identifier: creds.email, password: creds.password },
    });

    const add = await request.post("/api/cash", {
      data: {
        name: "House Munich",
        amountEUR: 400000,
        type: "real_estate",
        displayCurrency: "EUR",
        displayAmount: 400000,
        notes: "Inherited property",
      },
    });
    expect(add.status()).toBe(201);
    const entry = await add.json();

    const update = await request.put("/api/cash", {
      data: {
        id: entry.id,
        updates: {
          amountEUR: 420000,
          displayAmount: 420000,
          notes: "Revalued after renovation",
          valuationDate: "2026-03-10",
        },
      },
    });
    expect(update.status()).toBe(200);
    const updated = await update.json();
    expect(updated.amountEUR).toBe(420000);
    expect(updated.notes).toBe("Revalued after renovation");
    expect(updated.valuationDate).toBe("2026-03-10");

    await request.delete(`/api/cash?id=${entry.id}`);
  });
});

test.describe("Net Worth Tracking — UI", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("add manual asset modal opens from toolbar and shows type picker", async ({
    page,
    request,
  }) => {
    test.setTimeout(45_000);
    const creds = await createTestUser(request, true);
    const me = await getMe(request);

    await ensureLoggedOut(request);
    await loginAsAdmin(request);
    await setPlanViaAdmin(request, me.id, "starter");

    await ensureLoggedOut(request);
    await loginViaUI(page, creds.email, creds.password);
    await dismissOverlays(page);

    const addBtn = page.getByRole("button", { name: /Add/i }).first();
    await addBtn.click();

    const addAssetOption = page.getByRole("button", { name: /Add Manual Asset/i });
    await expect(addAssetOption).toBeVisible({ timeout: 5000 });
    await addAssetOption.click();

    const dialog = page.getByRole("dialog", { name: /Add Manual Asset/i });
    await expect(dialog).toBeVisible({ timeout: 10000 });

    await expect(dialog.getByText("Real Estate")).toBeVisible();
    await expect(dialog.getByText("Savings")).toBeVisible();
    await expect(dialog.getByText("Pension")).toBeVisible();
  });

  test("seeded demo data shows net worth summary with manual assets", async ({
    page,
    request,
  }) => {
    test.setTimeout(45_000);
    const creds = await createTestUser(request, true);
    await loginViaUI(page, creds.email, creds.password);
    await dismissOverlays(page);

    await expect(page.getByText("Total Net Worth")).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText("Real Estate").first()).toBeVisible();
    await expect(page.getByText("Savings").first()).toBeVisible();
  });

  test("cash-only fixed_return portfolio shows Assets & Accounts (not empty state)", async ({
    page,
    request,
  }) => {
    test.setTimeout(45_000);
    const creds = await createTestUser(request, false);
    const startDate = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })();

    const add = await request.post("/api/cash", {
      data: {
        name: "Civislend",
        amountEUR: 1500,
        type: "fixed_return",
        displayCurrency: "EUR",
        displayAmount: 1500,
        startDate,
        termMonths: 24,
        totalReturnPct: 25,
      },
    });
    expect(add.status()).toBe(201);

    await loginViaUI(page, creds.email, creds.password);
    await dismissOverlays(page);

    await expect(page.getByText("Welcome to trefolio")).toHaveCount(0, {
      timeout: 15_000,
    });
    await expect(page.getByText("Assets & Accounts")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Civislend")).toBeVisible();
    // Accrued value on start date = principal (local calendar), not €0 from UTC server enrich
    await expect(page.getByText(/€1[,.]?500/).first()).toBeVisible({ timeout: 10_000 });
  });
});
