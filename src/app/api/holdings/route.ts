import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { addTransaction, deleteTransactionsForPosition, listHoldings, updateHolding, removeHolding, trackEvent, findUserById } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";
import { holdingsOpsTotal } from "@/lib/metrics";
import { parseBody } from "@/lib/api-response";
import { createHoldingSchema, updateHoldingSchema } from "@/lib/schemas";
import { PLATFORM_LIMITS } from "@/lib/platform-config";
import { enrichHoldingClassifications } from "@/lib/enrich-classifications";

export const GET = withMetrics("/api/holdings", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const holdings = await listHoldings(session.userId);
  holdingsOpsTotal.inc({ operation: "list" });
  return NextResponse.json(holdings);
});

export const POST = withMetrics("/api/holdings", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const result = await parseBody(req, createHoldingSchema);
  if (!result.success) return result.error;
  const { ticker, name, shares, purchasePrice, displayCurrency, exchange, isin, assetType, accountId } = result.data;

  const user = await findUserById(session.userId);
  if ((user?.plan || session.plan) !== "pro") {
    const currentHoldings = await listHoldings(session.userId);
    const alreadyOwned = currentHoldings.some(
      (h) => h.ticker === ticker && h.exchange === (exchange || "")
    );
    if (!alreadyOwned && currentHoldings.length >= PLATFORM_LIMITS.FREE_HOLDINGS_LIMIT) {
      return NextResponse.json(
        {
          error: "Free plan limit: 15 holdings",
          reason: "holdings_limit_reached",
          limit: PLATFORM_LIMITS.FREE_HOLDINGS_LIMIT,
          current: currentHoldings.length,
        },
        { status: 403 }
      );
    }
  }

  const createdTx = await addTransaction(session.userId, {
    holdingId: "",
    ticker,
    name,
    exchange,
    isin,
    assetType,
    accountId,
    type: "buy",
    date: new Date().toISOString().slice(0, 10),
    shares,
    pricePerShare: purchasePrice,
    totalAmount: shares * purchasePrice,
    fees: 0,
    taxes: 0,
    currency: displayCurrency,
    displayCurrency,
    notes: "Added from holdings flow",
  });
  if (!createdTx) {
    return NextResponse.json({ error: "Duplicate transaction." }, { status: 409 });
  }
  const nextHoldings = await listHoldings(session.userId);
  const created = nextHoldings.find((h) => h.ticker === createdTx.ticker && h.exchange === (createdTx.exchange || ""));
  const fallback = {
    id: createdTx.id,
    name,
    ticker: createdTx.ticker,
    isin,
    assetType,
    shares,
    purchasePrice,
    displayCurrency,
    exchange,
    valueInEUR: 0,
    sector: "",
    region: "",
    assetClass: "",
    accountId,
  };
  trackEvent(session.userId, "holding_add", { ticker: createdTx.ticker });
  holdingsOpsTotal.inc({ operation: "add" });
  enrichHoldingClassifications(session.userId).catch((err) =>
    console.warn("[holdings] auto-classification failed:", err)
  );
  return NextResponse.json(created || fallback, { status: 201 });
});

export const PUT = withMetrics("/api/holdings", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const result = await parseBody(req, updateHoldingSchema);
  if (!result.success) return result.error;
  const { id, updates } = result.data;

  const updated = await updateHolding(session.userId, id, updates);
  if (!updated) {
    return NextResponse.json({ error: "Holding not found." }, { status: 404 });
  }
  holdingsOpsTotal.inc({ operation: "update" });
  return NextResponse.json(updated);
});

export const DELETE = withMetrics("/api/holdings", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id query param is required." }, { status: 400 });
  }

  const holdings = await listHoldings(session.userId);
  const target = holdings.find((h) => h.id === id);
  if (!target) {
    return NextResponse.json({ error: "Holding not found." }, { status: 404 });
  }
  const deletedCount = await deleteTransactionsForPosition(session.userId, target.ticker, target.exchange);
  await removeHolding(session.userId, id);
  if (deletedCount === 0) {
    return NextResponse.json({ error: "No transactions found for holding." }, { status: 404 });
  }
  trackEvent(session.userId, "holding_delete", { holdingId: id });
  holdingsOpsTotal.inc({ operation: "delete" });
  return NextResponse.json({ ok: true });
});
