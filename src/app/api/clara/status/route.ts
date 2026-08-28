import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { fetchClaraSavingsSummary } from "@/lib/ai/office/clara-client";
import { resolveOfficeIdentity } from "@/lib/ai/office/office-identity";
import { mapClaraSavingsToDeskStatus } from "@/lib/clara-desk-status";
import { withMetrics } from "@/lib/with-metrics";
import { json401 } from "@/lib/log-unauthorized";

export const dynamic = "force-dynamic";

/**
 * Clara link probe plus aggregated savings fields for Home money desk.
 * Uses the existing savings-summary call (404 → unlinked). No line items.
 */
export const GET = withMetrics("/api/clara/status", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error) return error;
  if (!session) return json401(req, { source: "api/clara/status", reason: "no_session" });

  const identity = await resolveOfficeIdentity(session.userId);
  if (!identity) {
    return NextResponse.json({ linked: false });
  }

  const clara = await fetchClaraSavingsSummary(identity);
  return NextResponse.json(mapClaraSavingsToDeskStatus(clara));
});
