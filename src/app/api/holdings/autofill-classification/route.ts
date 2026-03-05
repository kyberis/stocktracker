import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { enrichHoldingClassifications } from "@/lib/enrich-classifications";
import { withMetrics } from "@/lib/with-metrics";

export const POST = withMetrics("/api/holdings/autofill-classification", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  try {
    const enriched = await enrichHoldingClassifications(session.userId);
    return NextResponse.json({ enriched });
  } catch (err) {
    console.error("Autofill classification failed:", err);
    return NextResponse.json({ error: "Failed to autofill classifications" }, { status: 500 });
  }
});
