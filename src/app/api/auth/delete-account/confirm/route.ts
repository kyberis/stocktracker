import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { findUserById, deleteUser, trackEvent } from "@/lib/db";
import { getExpiredSessionCookieConfig } from "@/lib/auth/session";
import { getExpiredLayoutThemeCookieConfig } from "@/lib/theme-preferences";
import { withMetrics } from "@/lib/with-metrics";
import { authEventsTotal } from "@/lib/metrics";
import { parseBody } from "@/lib/api-response";
import { confirmDeleteAccountSchema } from "@/lib/schemas";
import { verifyAccountDeletionToken } from "@/lib/email";

/**
 * Finalizes account deletion for OAuth/passkey users who requested it via
 * the passwordless branch of POST /api/auth/delete-account. Requires BOTH a
 * valid token (proves email ownership within the 15-minute window) AND a
 * live session for that exact account (proves the browser holding the link
 * is still logged in as the user being deleted) — a copied/forwarded email
 * link is inert on its own.
 */
export const POST = withMetrics("/api/auth/delete-account/confirm", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  if (session.role === "admin") {
    return NextResponse.json(
      { error: "Admin accounts cannot be deleted through this endpoint." },
      { status: 403 }
    );
  }

  const result = await parseBody(req, confirmDeleteAccountSchema);
  if (!result.success) return result.error;
  const { token } = result.data;

  const payload = await verifyAccountDeletionToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Invalid or expired confirmation link." }, { status: 400 });
  }

  if (payload.userId !== session.userId) {
    return NextResponse.json(
      { error: "This confirmation link doesn't match the account you're logged in as." },
      { status: 403 }
    );
  }

  try {
    const user = await findUserById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (user.email !== payload.email) {
      return NextResponse.json(
        { error: "Your email has changed since this link was sent. Please request a new confirmation link." },
        { status: 400 }
      );
    }

    await trackEvent(user.id, "account_deleted", { source: "local_passwordless" });
    await deleteUser(user.id);

    authEventsTotal.inc({ event: "account_delete" });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(getExpiredSessionCookieConfig());
    response.cookies.set(getExpiredLayoutThemeCookieConfig());
    return response;
  } catch (err) {
    console.error("Delete account confirm failed:", err);
    return NextResponse.json({ error: "Failed to delete account." }, { status: 500 });
  }
});
