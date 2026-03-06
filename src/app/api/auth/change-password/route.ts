import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { findUserById, updateUserPassword } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSessionToken, getSessionCookieConfig } from "@/lib/auth/session";
import { withMetrics } from "@/lib/with-metrics";
import { authEventsTotal } from "@/lib/metrics";
import { parseBody } from "@/lib/api-response";
import { changePasswordSchema } from "@/lib/schemas";

export const POST = withMetrics("/api/auth/change-password", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const result = await parseBody(req, changePasswordSchema);
  if (!result.success) return result.error;
  const { currentPassword, newPassword } = result.data;

  try {
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
      plan: user.plan,
    });

    authEventsTotal.inc({ event: "password_change" });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(getSessionCookieConfig(token));
    return response;
  } catch (error) {
    console.error("Change password failed:", error);
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }
});
