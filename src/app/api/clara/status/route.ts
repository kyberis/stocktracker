import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { fetchClaraSavingsSummary } from "@/lib/ai/office/clara-client";
import { resolveOfficeIdentity } from "@/lib/ai/office/office-identity";
import { withMetrics } from "@/lib/with-metrics";
import { json401 } from "@/lib/log-unauthorized";

export const dynamic = "force-dynamic";

/**
 * Lightweight probe: whether this IdP identity already has a Clara local account.
 * Uses the existing savings-summary call (404 → unlinked).
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
  const linked = Boolean(clara.available);

  return NextResponse.json({ linked });
});
