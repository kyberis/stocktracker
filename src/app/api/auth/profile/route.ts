import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { findUserById, updateUserProfile, setEmailVerified } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";
import { parseBody } from "@/lib/api-response";
import { profileUpdateSchema } from "@/lib/schemas";

export const GET = withMetrics("/api/auth/profile", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const user = await findUserById(session.userId);
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({
    profile: {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      role: user.role,
    },
  });
});

export const PUT = withMetrics("/api/auth/profile", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const result = await parseBody(req, profileUpdateSchema);
  if (!result.success) return result.error;
  const { email, displayName, avatarUrl } = result.data;

  const updates: Partial<{ email: string; displayName: string; avatarUrl: string }> = {};
  if (email !== undefined) updates.email = email;
  if (displayName !== undefined) updates.displayName = displayName;
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;

  const user = await findUserById(session.userId);
  if (updates.email && user && updates.email !== user.email) {
    await setEmailVerified(session.userId, false);
  }

  const updated = await updateUserProfile(session.userId, updates);
  if (!updated) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({ profile: updated });
});
