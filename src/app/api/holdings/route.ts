import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { addTransaction, deleteTransactionsForPosition, listHoldings, updateHolding, trackEvent } from "@/lib/db";
import type { Holding } from "@/lib/types";
import { withMetrics } from "@/lib/with-metrics";
import { holdingsOpsTotal } from "@/lib/metrics";

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

  try {
    const body = (await req.json()) as Omit<Holding, "id">;
    if (!body?.ticker || !body?.name) {
      return NextResponse.json({ error: "Invalid holding payload." }, { status: 400 });
    }
    const createdTx = await addTransaction(session.userId, {
      holdingId: "",
      ticker: body.ticker,
      name: body.name,
      exchange: body.exchange,
      isin: body.isin,
      assetType: body.assetType || "stock",
      accountId: body.accountId || "",
      type: "buy",
      date: new Date().toISOString().slice(0, 10),
      shares: body.shares,
      pricePerShare: body.purchasePrice,
      totalAmount: body.shares * body.purchasePrice,
      fees: 0,
      taxes: 0,
      currency: body.displayCurrency || "EUR",
      displayCurrency: body.displayCurrency || "EUR",
      notes: "Added from holdings flow",
    });
    const nextHoldings = await listHoldings(session.userId);
    const created = nextHoldings.find((h) => h.ticker === createdTx.ticker && h.exchange === (createdTx.exchange || ""));
    const fallback = {
      id: createdTx.id,
      name: body.name,
      ticker: createdTx.ticker,
      isin: body.isin || "",
      assetType: body.assetType || "stock",
      shares: body.shares,
      purchasePrice: body.purchasePrice,
      displayCurrency: body.displayCurrency || "EUR",
      exchange: body.exchange || "",
      valueInEUR: 0,
      sector: "",
      region: "",
      assetClass: "",
      accountId: body.accountId || "",
    };
    trackEvent(session.userId, "holding_add", { ticker: createdTx.ticker });
    holdingsOpsTotal.inc({ operation: "add" });
    return NextResponse.json(created || fallback, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
});

export const PUT = withMetrics("/api/holdings", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  try {
    const body = (await req.json()) as { id?: string; updates?: Partial<Omit<Holding, "id">> };
    if (!body.id || !body.updates) {
      return NextResponse.json({ error: "id and updates are required." }, { status: 400 });
    }

    const updated = await updateHolding(session.userId, body.id, body.updates);
    if (!updated) {
      return NextResponse.json({ error: "Holding not found." }, { status: 404 });
    }
    holdingsOpsTotal.inc({ operation: "update" });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
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
  if (deletedCount === 0) {
    return NextResponse.json({ error: "No transactions found for holding." }, { status: 404 });
  }
  trackEvent(session.userId, "holding_delete", { holdingId: id });
  holdingsOpsTotal.inc({ operation: "delete" });
  return NextResponse.json({ ok: true });
});
