import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { resetUserHoldings } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";
import { parseBody } from "@/lib/api-response";
import { resetPortfolioSchema } from "@/lib/schemas";

export const POST = withMetrics("/api/reset-portfolio", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const portfolioId = req.nextUrl.searchParams.get("portfolioId") || undefined;
  const result = await parseBody(req, resetPortfolioSchema);
  if (!result.success) return result.error;
  const inserted = await resetUserHoldings(session.userId, false, portfolioId);
  return NextResponse.json({ ok: true, inserted });
});
