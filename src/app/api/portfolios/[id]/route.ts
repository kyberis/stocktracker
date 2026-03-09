import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { findPortfolioById, renamePortfolio, deletePortfolio, setDefaultPortfolio, countPortfolios } from "@/lib/db";
import { getPortfolioLimit } from "@/lib/subscription";
import { withMetrics } from "@/lib/with-metrics";

export const dynamic = "force-dynamic";

/**
 * GET /api/portfolios/[id] — get a specific portfolio
 */
export const GET = withMetrics("/api/portfolios/[id]", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error!;

  const id = req.nextUrl.pathname.split("/").pop()!;
  const portfolio = await findPortfolioById(session.userId, id);
  if (!portfolio) {
    return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
  }

  return NextResponse.json({ portfolio });
});

/**
 * PUT /api/portfolios/[id] — rename or set as default
 */
export const PUT = withMetrics("/api/portfolios/[id] PUT", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error!;

  const id = req.nextUrl.pathname.split("/").pop()!;

  const plan = (session.plan ?? "free") as "free" | "starter" | "pro";
  const limit = getPortfolioLimit(plan);
  const count = await countPortfolios(session.userId);

  // If over limit (downgraded), only allow operations on default portfolio
  if (count > limit) {
    const portfolio = await findPortfolioById(session.userId, id);
    if (portfolio && !portfolio.isDefault) {
      return NextResponse.json(
        { error: "Portfolio is read-only. Upgrade to manage multiple portfolios." },
        { status: 403 }
      );
    }
  }
  let name: string | undefined;
  let isDefault: boolean | undefined;

  try {
    const body = await req.json();
    if (body.name && typeof body.name === "string") name = body.name.trim().slice(0, 50);
    if (typeof body.isDefault === "boolean") isDefault = body.isDefault;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (name) {
    const ok = await renamePortfolio(session.userId, id, name);
    if (!ok) return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
  }

  if (isDefault === true) {
    const ok = await setDefaultPortfolio(session.userId, id);
    if (!ok) return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
  }

  const updated = await findPortfolioById(session.userId, id);
  return NextResponse.json({ portfolio: updated });
});

/**
 * DELETE /api/portfolios/[id] — delete a portfolio (data moves to default)
 */
export const DELETE = withMetrics("/api/portfolios/[id] DELETE", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error!;

  const id = req.nextUrl.pathname.split("/").pop()!;
  const ok = await deletePortfolio(session.userId, id);
  if (!ok) {
    return NextResponse.json({ error: "Cannot delete default portfolio" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
});
