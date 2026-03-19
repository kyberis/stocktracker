import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { findUserById } from "@/lib/db";
import { runBackfillForUser } from "@/lib/backfill-snapshots";
import { withMetrics } from "@/lib/with-metrics";

export const maxDuration = 60;

/**
 * POST /api/admin/backfill-snapshots
 * Triggers a full snapshot backfill for a specific user.
 * Body: { userId: string }
 */
export const POST = withMetrics("/api/admin/backfill-snapshots", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  let userId: string;
  try {
    const body = await req.json();
    userId = body.userId;
    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const user = await findUserById(userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const result = await runBackfillForUser(userId);
  return NextResponse.json({ ok: true, userId, ...result });
});
