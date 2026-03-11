import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { listPortfolios, createPortfolio, countPortfolios } from "@/lib/db";
import type { PortfolioCurrency } from "@/lib/db";
import { getPortfolioLimit } from "@/lib/subscription";
import { withMetrics } from "@/lib/with-metrics";

const VALID_CURRENCIES: PortfolioCurrency[] = ["EUR", "USD"];

export const dynamic = "force-dynamic";

/**
 * GET /api/portfolios — list all portfolios for the current user
 */
export const GET = withMetrics("/api/portfolios", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error!;

  const portfolios = await listPortfolios(session.userId);
  return NextResponse.json({ portfolios });
});

/**
 * POST /api/portfolios — create a new portfolio (plan-gated)
 */
export const POST = withMetrics("/api/portfolios POST", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error!;

  const plan = (session.plan ?? "free") as "free" | "starter" | "pro";
  const limit = getPortfolioLimit(plan);
  const current = await countPortfolios(session.userId);

  if (current >= limit) {
    return NextResponse.json(
      { error: "Portfolio limit reached", limit, current },
      { status: 403 }
    );
  }

  let name = "My Portfolio";
  let currency: PortfolioCurrency = "EUR";
  try {
    const body = await req.json();
    if (body.name && typeof body.name === "string") {
      name = body.name.trim().slice(0, 50);
    }
    if (body.currency && typeof body.currency === "string") {
      const upper = body.currency.toUpperCase() as PortfolioCurrency;
      if (VALID_CURRENCIES.includes(upper)) {
        currency = upper;
      }
    }
  } catch {
    // use default name
  }

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  try {
    const portfolio = await createPortfolio(session.userId, name, currency);
    return NextResponse.json({ portfolio }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("UNIQUE constraint")) {
      return NextResponse.json({ error: "A portfolio with this name already exists" }, { status: 409 });
    }
    throw err;
  }
});
