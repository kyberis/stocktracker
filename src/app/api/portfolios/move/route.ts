import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { withMetrics } from "@/lib/with-metrics";

export const dynamic = "force-dynamic";

/**
 * POST /api/portfolios/move — disabled: trefolio is single-portfolio only.
 */
export const POST = withMetrics("/api/portfolios/move", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error!;

  return NextResponse.json(
    { error: "Moving between portfolios is no longer available. Each account has a single portfolio." },
    { status: 403 },
  );
});
