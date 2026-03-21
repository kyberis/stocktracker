import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { findUserById, updateUserSubscription, isFeatureEnabledForUser } from "@/lib/db";
import { ensureInitialized } from "@/lib/db/client";
import { withMetrics } from "@/lib/with-metrics";

export const POST = withMetrics("/api/trial/activate", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  if (!(await isFeatureEnabledForUser("pro_trial_enabled", session.userId))) {
    return NextResponse.json({ error: "Pro trial is not available" }, { status: 404 });
  }

  let token: unknown;
  try {
    ({ token } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof token !== "string" || token.trim() === "") {
    return NextResponse.json({ error: "Invalid or missing token" }, { status: 400 });
  }

  const userId = session.userId;
  const user = await findUserById(userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.trial_token !== token) {
    return NextResponse.json({ error: "Invalid or expired trial token" }, { status: 400 });
  }

  if (user.trial_activated_at !== "") {
    return NextResponse.json({ error: "Trial already activated" }, { status: 400 });
  }

  if (user.plan !== "free") {
    return NextResponse.json({ error: "Already on a paid plan" }, { status: 400 });
  }

  const planExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await updateUserSubscription(userId, { plan: "pro", planExpiresAt });

  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE users SET trial_activated_at = datetime('now') WHERE id = ?",
    args: [userId],
  });

  return NextResponse.json({ success: true, planExpiresAt });
});
