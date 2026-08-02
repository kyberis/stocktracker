import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { normalizeStoredHoldingClassifications } from "@/lib/enrich-classifications";
import { withMetrics } from "@/lib/with-metrics";

export const POST = withMetrics("/api/holdings/normalize-classifications", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  try {
    const updated = await normalizeStoredHoldingClassifications(session.userId);
    return NextResponse.json({ updated });
  } catch (err) {
    console.error("Normalize classifications failed:", err);
    return NextResponse.json({ error: "Failed to unify classifications" }, { status: 500 });
  }
});
