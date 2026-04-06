import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { withMetrics } from "@/lib/with-metrics";
import {
  listMoatAutoTickers,
  addMoatAutoTickers,
  removeMoatAutoTicker,
  getMoatCacheStats,
} from "@/lib/db";
import screenerUniverse from "@/../data/screener-universe.json";

export const dynamic = "force-dynamic";

export const GET = withMetrics("/api/admin/moat-auto-tickers", async (req: NextRequest) => {
  const { session, error } = await requireAdmin(req);
  if (error || !session) return error;

  const [tickers, stats] = await Promise.all([
    listMoatAutoTickers(),
    getMoatCacheStats(screenerUniverse.tickers.length),
  ]);

  const universeSize = new Set([
    ...screenerUniverse.tickers,
    ...tickers.map((t) => t.symbol),
  ]).size;

  return NextResponse.json({
    tickers,
    universeSize,
    screenerCount: screenerUniverse.tickers.length,
    customCount: tickers.length,
    cacheStats: stats,
  });
});

export const POST = withMetrics("/api/admin/moat-auto-tickers", async (req: NextRequest) => {
  const { session, error } = await requireAdmin(req);
  if (error || !session) return error;

  const body = await req.json();
  const symbols: string[] = body.symbols;

  if (!Array.isArray(symbols) || symbols.length === 0) {
    return NextResponse.json({ error: "symbols array required" }, { status: 400 });
  }

  if (symbols.length > 50) {
    return NextResponse.json({ error: "Maximum 50 symbols per request" }, { status: 400 });
  }

  const added = await addMoatAutoTickers(symbols, session.userId);
  return NextResponse.json({ ok: true, added });
});

export const DELETE = withMetrics("/api/admin/moat-auto-tickers", async (req: NextRequest) => {
  const { session, error } = await requireAdmin(req);
  if (error || !session) return error;

  const body = await req.json();
  const symbol: string = body.symbol;

  if (!symbol || typeof symbol !== "string") {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  await removeMoatAutoTicker(symbol);
  return NextResponse.json({ ok: true });
});
