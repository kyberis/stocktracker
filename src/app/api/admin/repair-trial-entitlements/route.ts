import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { repairTrialEntitlements } from "@/lib/trial-activation";
import { withMetrics } from "@/lib/with-metrics";

/**
 * POST /api/admin/repair-trial-entitlements
 * One-off repair for users who activated onboarding trial but lost Pro after IdP sync.
 * Body: { userId?: string, dryRun?: boolean }
 */
export const POST = withMetrics("/api/admin/repair-trial-entitlements", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  let userId: string | undefined;
  let dryRun = false;
  try {
    const body = (await req.json()) as { userId?: string; dryRun?: boolean };
    if (body.userId !== undefined) {
      if (typeof body.userId !== "string" || !body.userId.trim()) {
        return NextResponse.json({ error: "userId must be a non-empty string" }, { status: 400 });
      }
      userId = body.userId.trim();
    }
    dryRun = body.dryRun === true;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = await repairTrialEntitlements({ userId, dryRun });
  return NextResponse.json({
    ok: true,
    dryRun: result.dryRun,
    count: result.repaired.length,
    repaired: result.repaired,
  });
});
