import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { ensureClaraUser } from "@/lib/ai/office/clara-client";
import { resolveOfficeIdentity } from "@/lib/ai/office/office-identity";
import { findUserById } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";
import { json401 } from "@/lib/log-unauthorized";

export const dynamic = "force-dynamic";

/**
 * Provision a Clara account for the signed-in IdP identity (no browser SSO).
 * Idempotent. Clara terms/onboarding still gate the first visit to Clara /app.
 */
export const POST = withMetrics("/api/clara/activate", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error) return error;
  if (!session) return json401(req, { source: "api/clara/activate", reason: "no_session" });

  const identity = await resolveOfficeIdentity(session.userId);
  if (!identity?.idpSub.trim()) {
    return NextResponse.json(
      { linked: false, error: "missing_idp_sub" },
      { status: 400 },
    );
  }
  if (!identity.email.trim()) {
    return NextResponse.json(
      { linked: false, error: "missing_email" },
      { status: 400 },
    );
  }

  const user = await findUserById(session.userId);
  const name = user?.display_name?.trim() || user?.username?.trim() || null;

  const result = await ensureClaraUser(identity, { name });
  if (!result.ok) {
    const status =
      result.status && result.status >= 400 && result.status < 600
        ? result.status
        : 503;
    return NextResponse.json(
      { linked: false, error: result.error },
      { status },
    );
  }

  return NextResponse.json({
    linked: true,
    created: result.created,
    claraUserId: result.id,
  });
});
