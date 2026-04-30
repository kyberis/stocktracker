import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { findUserById, isFeatureEnabled, setTelegramLinkToken } from "@/lib/db";
import { canAccessFeature } from "@/lib/subscription";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  if (!(await isFeatureEnabled("telegram_enabled"))) {
    return NextResponse.json({ error: "disabled" }, { status: 403 });
  }

  const user = await findUserById(session.userId);
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (user.plan !== "pro") {
    return NextResponse.json({ error: "pro_required" }, { status: 403 });
  }

  const access = canAccessFeature("alerts-telegram", {
    plan: user.plan,
    aiCallsThisMonth: user.ai_calls_this_month,
  });
  if (!access.allowed) {
    return NextResponse.json({ error: "not_allowed" }, { status: 403 });
  }

  try {
    const { deepLink } = await setTelegramLinkToken(session.userId);
    return NextResponse.json({ deepLink });
  } catch (err) {
    console.error("Telegram link token error:", err);
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
}
