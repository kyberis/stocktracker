export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { isFeatureEnabledForUser } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";
import { json401 } from "@/lib/log-unauthorized";
import { userHasWarren } from "@/lib/ai/clover/user-has-warren";
import { isCloverTelegramConfigured } from "@/lib/telegram/clover-client";
import { resolveOfficeIdentity } from "@/lib/ai/office/office-identity";
import { fetchClaraSavingsSummary } from "@/lib/ai/office/clara-client";

/**
 * GET /api/clover/bootstrap
 * Clover-first chrome: flag, hasWarren dual-entry, Clara link, Telegram ready.
 */
export const GET = withMetrics("/api/clover/bootstrap", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error) return error;
  if (!session) {
    return json401(req, { source: "api/clover/bootstrap", reason: "no_session" }, { error: "Unauthorized" });
  }

  const cloverEnabled = await isFeatureEnabledForUser("clover_assistant", session.userId);
  const hasWarren = cloverEnabled ? await userHasWarren(session.userId) : true;

  let claraLinked = false;
  try {
    const identity = await resolveOfficeIdentity(session.userId);
    if (identity) {
      const clara = await fetchClaraSavingsSummary(identity);
      claraLinked = Boolean(clara.available);
    }
  } catch {
    claraLinked = false;
  }

  return NextResponse.json({
    cloverEnabled,
    hasWarren,
    showWarrenChip: cloverEnabled ? hasWarren : true,
    showClaraChip: !cloverEnabled,
    claraLinked,
    cloverTelegramConfigured: isCloverTelegramConfigured(),
  });
});
