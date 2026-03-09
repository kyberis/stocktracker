import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { moveHoldingToPortfolio, findPortfolioById } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const dynamic = "force-dynamic";

/**
 * POST /api/portfolios/move — move a holding between portfolios (Pro only)
 * Body: { ticker, exchange, fromPortfolioId, toPortfolioId }
 */
export const POST = withMetrics("/api/portfolios/move", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error!;

  const plan = (session.plan ?? "free") as "free" | "starter" | "pro";
  if (plan !== "pro") {
    return NextResponse.json({ error: "Pro plan required to move holdings between portfolios" }, { status: 403 });
  }

  let ticker: string;
  let exchange: string;
  let fromPortfolioId: string;
  let toPortfolioId: string;

  try {
    const body = await req.json();
    ticker = String(body.ticker || "").toUpperCase();
    exchange = String(body.exchange || "").toUpperCase();
    fromPortfolioId = String(body.fromPortfolioId || "");
    toPortfolioId = String(body.toPortfolioId || "");
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!ticker || !fromPortfolioId || !toPortfolioId) {
    return NextResponse.json({ error: "ticker, fromPortfolioId, and toPortfolioId are required" }, { status: 400 });
  }

  if (fromPortfolioId === toPortfolioId) {
    return NextResponse.json({ error: "Source and destination portfolios must be different" }, { status: 400 });
  }

  // Verify both portfolios belong to the user
  const [fromP, toP] = await Promise.all([
    findPortfolioById(session.userId, fromPortfolioId),
    findPortfolioById(session.userId, toPortfolioId),
  ]);

  if (!fromP || !toP) {
    return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
  }

  const moved = await moveHoldingToPortfolio(session.userId, ticker, exchange, fromPortfolioId, toPortfolioId);

  if (!moved) {
    return NextResponse.json({ error: "No matching holding found in source portfolio" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, ticker, fromPortfolio: fromP.name, toPortfolio: toP.name });
});
