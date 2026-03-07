import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { findUserById, unlinkAppleAccount } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const POST = withMetrics("/api/auth/apple/unlink", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const user = await findUserById(session.userId);
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (!user.apple_id) {
    return NextResponse.json(
      { error: "No Apple account is linked." },
      { status: 400 },
    );
  }

  if (user.auth_provider === "apple") {
    return NextResponse.json(
      { error: "Cannot unlink Apple from an Apple-only account. Set a password first." },
      { status: 400 },
    );
  }

  await unlinkAppleAccount(user.id);

  return NextResponse.json({ ok: true });
});
