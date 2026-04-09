import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { parseBody } from "@/lib/api-response";
import { upsertInvestmentStrategySchema } from "@/lib/schemas";
import {
  listInvestmentStrategies,
  getInvestmentStrategyByTickerExchange,
  upsertInvestmentStrategy,
  deleteInvestmentStrategy,
  trackEvent,
} from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/strategies", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");
  const exchange = searchParams.get("exchange") ?? "";

  if (symbol) {
    const strategy = await getInvestmentStrategyByTickerExchange(session.userId, symbol, exchange);
    return NextResponse.json({ strategy });
  }

  const strategies = await listInvestmentStrategies(session.userId);
  return NextResponse.json({ strategies });
});

export const POST = withMetrics("/api/strategies", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const result = await parseBody(req, upsertInvestmentStrategySchema);
  if (!result.success) return result.error;

  const data = result.data;
  const strategy = await upsertInvestmentStrategy(session.userId, {
    ticker: data.ticker,
    exchange: data.exchange,
    name: data.name,
    purchasePrice: data.purchasePrice,
    currency: data.currency,
    targetPrice: data.targetPrice,
    stopLossPrice: data.stopLossPrice,
    targetAlertId: data.targetAlertId,
    stopAlertId: data.stopAlertId,
  });

  trackEvent(session.userId, "investment_strategy_saved", {
    ticker: strategy.ticker,
  });

  return NextResponse.json({ strategy }, { status: 201 });
});

export const DELETE = withMetrics("/api/strategies", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const ok = await deleteInvestmentStrategy(session.userId, id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
});
