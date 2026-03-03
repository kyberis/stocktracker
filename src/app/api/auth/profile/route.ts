import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { findUserById, updateUserProfile } from "@/lib/db";

export async function GET(req: NextRequest) {
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
}

export async function PUT(req: NextRequest) {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  try {
    const body = (await req.json()) as Partial<{
      email: string;
      displayName: string;
      avatarUrl: string;
    }>;

    const updates: Partial<{ email: string; displayName: string; avatarUrl: string }> = {};

    if (typeof body.email === "string") {
      const trimmed = body.email.trim().toLowerCase();
      if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        return NextResponse.json({ error: "Invalid email format." }, { status: 400 });
      }
      updates.email = trimmed;
    }
    if (typeof body.displayName === "string") {
      updates.displayName = body.displayName.trim().slice(0, 100);
    }
    if (typeof body.avatarUrl === "string") {
      updates.avatarUrl = body.avatarUrl.trim().slice(0, 500);
    }

    const updated = await updateUserProfile(session.userId, updates);
    if (!updated) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({ profile: updated });
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
}
