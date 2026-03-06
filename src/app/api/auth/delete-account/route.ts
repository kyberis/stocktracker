import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { findUserById, deleteUser } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { getExpiredSessionCookieConfig } from "@/lib/auth/session";
import { withMetrics } from "@/lib/with-metrics";
import { authEventsTotal } from "@/lib/metrics";
import { parseBody } from "@/lib/api-response";
import { deleteAccountSchema } from "@/lib/schemas";

export const POST = withMetrics("/api/auth/delete-account", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const result = await parseBody(req, deleteAccountSchema);
  if (!result.success) return result.error;
  const { password } = result.data;

  if (session.role === "admin") {
    return NextResponse.json(
      { error: "Admin accounts cannot be deleted through this endpoint." },
      { status: 403 }
    );
  }

  try {
    const user = await findUserById(session.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
    }

    await deleteUser(user.id);

    authEventsTotal.inc({ event: "account_delete" });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(getExpiredSessionCookieConfig());
    return response;
  } catch (err) {
    console.error("Delete account failed:", err);
    return NextResponse.json({ error: "Failed to delete account." }, { status: 500 });
  }
});
