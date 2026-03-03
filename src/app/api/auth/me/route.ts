import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { findUserById } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const user = await findUserById(session.userId);

  return NextResponse.json({
    user: {
      id: session.userId,
      username: session.username,
      role: session.role,
      mustChangePassword: session.mustChangePassword,
      email: user?.email || "",
      displayName: user?.display_name || "",
      avatarUrl: user?.avatar_url || "",
    },
  });
}
