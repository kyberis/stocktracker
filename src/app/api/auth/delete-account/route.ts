import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { findUserById, deleteUser, trackEvent, getUserSettings } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { getExpiredSessionCookieConfig } from "@/lib/auth/session";
import { getExpiredLayoutThemeCookieConfig } from "@/lib/theme-preferences";
import { withMetrics } from "@/lib/with-metrics";
import { authEventsTotal } from "@/lib/metrics";
import { parseBody } from "@/lib/api-response";
import { deleteAccountSchema } from "@/lib/schemas";
import { json401 } from "@/lib/log-unauthorized";
import {
  createAccountDeletionToken,
  sendAccountDeletionEmail,
  canSendAccountDeletionEmail,
  getEmailLocale,
} from "@/lib/email";

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

    const hasPassword = Boolean(user.password_hash);

    // OAuth/passkey users (no usable local password) can't verify via
    // password — send a short-lived confirmation link to their verified
    // email instead. See src/app/api/auth/delete-account/confirm/route.ts.
    if (!hasPassword) {
      if (!user.email) {
        return NextResponse.json(
          { error: "No email on file to send a confirmation link to. Contact support." },
          { status: 400 }
        );
      }

      const canSend = await canSendAccountDeletionEmail(user.id);
      if (!canSend) {
        return NextResponse.json(
          { error: "A confirmation email was already sent recently. Check your inbox, or try again in a few minutes." },
          { status: 429 }
        );
      }

      const settings = await getUserSettings(user.id);
      const locale = getEmailLocale(settings.language || "en");
      const token = await createAccountDeletionToken(user.id, user.email);
      const emailResult = await sendAccountDeletionEmail(user.email, token, locale);
      if (!emailResult.success) {
        return NextResponse.json({ error: "Failed to send confirmation email." }, { status: 500 });
      }

      await trackEvent(user.id, "account_deletion_email_sent", { source: "local_passwordless" });
      return NextResponse.json({ ok: true, requiresEmailConfirmation: true });
    }

    const valid = await verifyPassword(password ?? "", user.password_hash);
    if (!valid) {
      return json401(req, { source: "api/auth/delete-account", reason: "wrong_password" }, { error: "Incorrect password." });
    }

    await trackEvent(user.id, "account_deleted", { source: "local" });
    await deleteUser(user.id);

    authEventsTotal.inc({ event: "account_delete" });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(getExpiredSessionCookieConfig());
    response.cookies.set(getExpiredLayoutThemeCookieConfig());
    return response;
  } catch (err) {
    console.error("Delete account failed:", err);
    return NextResponse.json({ error: "Failed to delete account." }, { status: 500 });
  }
});
