import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { resetUserHoldings } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const POST = withMetrics("/api/reset-portfolio", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  try {
    const body = (await req.json()) as { mode?: "empty" | "seed" };
    const mode = body.mode === "seed" ? "seed" : "empty";
    const inserted = await resetUserHoldings(session.userId, mode === "seed");
    return NextResponse.json({ ok: true, inserted });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
});
