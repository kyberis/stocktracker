import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { isFeatureEnabledForUser } from "@/lib/db";
import { fetchClaraSavingsSummary } from "@/lib/ai/office/clara-client";
import { fetchWillRecentTags } from "@/lib/ai/office/will-client";
import { resolveOfficeIdentity } from "@/lib/ai/office/office-identity";
import { withMetrics } from "@/lib/with-metrics";
import { json401 } from "@/lib/log-unauthorized";

export const dynamic = "force-dynamic";

export const GET = withMetrics("/api/aid/insights", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error) return error;
  if (!session) return json401(req, { source: "api/aid/insights", reason: "no_session" });

  const enabled = await isFeatureEnabledForUser("aid_beta", session.userId);
  if (!enabled) {
    return NextResponse.json({ error: "AID beta is not enabled" }, { status: 403 });
  }

  const identity = await resolveOfficeIdentity(session.userId);
  if (!identity) {
    return NextResponse.json({
      clara: { available: false, note: "User not found" },
      will: { available: false, tags: [], note: "User not found" },
    });
  }

  const [clara, will] = await Promise.all([
    fetchClaraSavingsSummary(identity),
    fetchWillRecentTags(identity),
  ]);

  return NextResponse.json({ clara, will });
});
