import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { findUserById, unlinkGoogleAccount } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const POST = withMetrics("/api/auth/google/unlink", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const user = await findUserById(session.userId);
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (!user.google_id) {
    return NextResponse.json(
      { error: "No Google account is linked." },
      { status: 400 },
    );
  }

  if (user.auth_provider === "google") {
    return NextResponse.json(
      { error: "Cannot unlink Google from a Google-only account. Set a password first." },
      { status: 400 },
    );
  }

  await unlinkGoogleAccount(user.id);

  return NextResponse.json({ ok: true });
});
