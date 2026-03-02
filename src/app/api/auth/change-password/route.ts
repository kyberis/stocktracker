import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { findUserById, updateUserPassword } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSessionToken, getSessionCookieConfig } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  try {
    const body = (await req.json()) as { currentPassword?: string; newPassword?: string };
    const currentPassword = body.currentPassword || "";
    const newPassword = body.newPassword || "";

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current and new password are required." },
        { status: 400 }
      );
    }
    if (newPassword.length < 4) {
      return NextResponse.json(
        { error: "New password must have at least 4 characters." },
        { status: 400 }
      );
    }

    const user = await findUserById(session.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const valid = await verifyPassword(currentPassword, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
    }

    const newHash = await hashPassword(newPassword);
    await updateUserPassword(user.id, newHash, false);

    const token = await createSessionToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      mustChangePassword: false,
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set(getSessionCookieConfig(token));
    return response;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
}
