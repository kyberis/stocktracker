import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { moveHoldingToPortfolio, moveCashToPortfolio, findPortfolioById } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";
import type { SubscriptionPlan } from "@/lib/types";
import { deferTask } from "@/lib/task-runner";
import { materializeCurrentSnapshotsForUser } from "@/lib/cron-portfolio-snapshots";

export const dynamic = "force-dynamic";

/**
 * POST /api/portfolios/move — move a holding or cash entry between portfolios (Pro only)
 * Body (holding): { ticker, exchange, fromPortfolioId, toPortfolioId, type?: "holding" }
 * Body (cash):    { cashId, fromPortfolioId, toPortfolioId, type: "cash" }
 */
export const POST = withMetrics("/api/portfolios/move", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error!;

  const plan = (session.plan ?? "free") as SubscriptionPlan;
  if (plan !== "pro") {
    return NextResponse.json({ error: "Pro plan required to move holdings between portfolios" }, { status: 403 });
  }

  let moveType: "holding" | "cash";
  let ticker: string;
  let exchange: string;
  let cashId: string;
  let fromPortfolioId: string;
  let toPortfolioId: string;

  try {
    const body = await req.json();
    moveType = body.type === "cash" ? "cash" : "holding";
    ticker = String(body.ticker || "").toUpperCase();
    exchange = String(body.exchange || "").toUpperCase();
    cashId = String(body.cashId || "");
    fromPortfolioId = String(body.fromPortfolioId || "");
    toPortfolioId = String(body.toPortfolioId || "");
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!fromPortfolioId || !toPortfolioId) {
    return NextResponse.json({ error: "fromPortfolioId and toPortfolioId are required" }, { status: 400 });
  }

  if (fromPortfolioId === toPortfolioId) {
    return NextResponse.json({ error: "Source and destination portfolios must be different" }, { status: 400 });
  }

  if (moveType === "holding" && !ticker) {
    return NextResponse.json({ error: "ticker is required for holding moves" }, { status: 400 });
  }

  if (moveType === "cash" && !cashId) {
    return NextResponse.json({ error: "cashId is required for cash moves" }, { status: 400 });
  }

  const [fromP, toP] = await Promise.all([
    findPortfolioById(session.userId, fromPortfolioId),
    findPortfolioById(session.userId, toPortfolioId),
  ]);

  if (!fromP || !toP) {
    return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
  }

  let moved: boolean;

  if (moveType === "cash") {
    moved = await moveCashToPortfolio(session.userId, cashId, toPortfolioId);
  } else {
    moved = await moveHoldingToPortfolio(session.userId, ticker, exchange, fromPortfolioId, toPortfolioId);
  }

  if (!moved) {
    const label = moveType === "cash" ? "cash entry" : "holding";
    return NextResponse.json({ error: `No matching ${label} found in source portfolio` }, { status: 404 });
  }

  deferTask(async () => {
    try {
      await materializeCurrentSnapshotsForUser(session.userId);
    } catch (err) {
      console.warn("[portfolios/move] snapshot materialization failed:", err);
    }
  });

  return NextResponse.json({
    ok: true,
    type: moveType,
    ...(moveType === "holding" ? { ticker } : { cashId }),
    fromPortfolio: fromP.name,
    toPortfolio: toP.name,
  });
});
