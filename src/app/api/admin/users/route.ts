import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import {
  deleteUser,
  findUserById,
  getUserSettings,
  listUsers,
  setPendingMembershipGrant,
  trackEvent,
  updateUserPassword,
  updateUserRole,
  updateUserSubscription,
} from "@/lib/db";
import { getEmailLocale, sendMembershipGrantInvitationEmail } from "@/lib/email";
import { hasActiveManagedStripeSubscription } from "@/lib/stripe";
import { resetChecklist } from "@/lib/db/checklist";
import { hashPassword } from "@/lib/auth/password";
import { parseBody } from "@/lib/api-response";
import { adminUserActionSchema } from "@/lib/schemas";
import { withMetrics } from "@/lib/with-metrics";
import { grantsAndTrialsRedirectToIdp } from "@/lib/idp/config";
import { inviteMembershipGrantViaIdp } from "@/lib/idp/client";
import { syncLocalPlanToIdp } from "@/lib/idp/sync-plan";

export const GET = withMetrics("/api/admin/users", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  return NextResponse.json({ users: await listUsers() });
});

export const POST = withMetrics("/api/admin/users", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const body = typeof raw === "object" && raw !== null && !("action" in raw)
    ? { ...raw, action: "setPassword" as const }
    : raw;

  const result = adminUserActionSchema.safeParse(body);
  if (!result.success) {
    const message = result.error.issues[0]?.message || "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const data = result.data;

  const user = await findUserById(data.userId);
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (data.action === "setRole") {
    if (user.username === "admin" && data.role !== "admin") {
      return NextResponse.json({ error: "Cannot change the default admin's role." }, { status: 400 });
    }
    await updateUserRole(user.id, data.role);
    return NextResponse.json({ ok: true });
  }

  if (data.action === "setPlan") {
    const planExpiresAt = data.plan === "free"
      ? ""
      : new Date(Date.now() + 365 * 86400000).toISOString();
    await updateUserSubscription(user.id, { plan: data.plan, planExpiresAt });
    if (user.email) {
      await syncLocalPlanToIdp(user.id, user.email, data.plan, planExpiresAt);
    }
    return NextResponse.json({ ok: true });
  }

  if (data.action === "resetChecklist") {
    await resetChecklist(user.id);
    return NextResponse.json({ ok: true });
  }

  if (data.action === "grantMembership") {
    if (await hasActiveManagedStripeSubscription(user.stripe_subscription_id)) {
      return NextResponse.json(
        {
          error:
            "This user has an active Stripe subscription. Manage billing in Stripe before granting complimentary access.",
        },
        { status: 409 },
      );
    }
    if (grantsAndTrialsRedirectToIdp()) {
      try {
        await inviteMembershipGrantViaIdp({
          email: user.email,
          days: data.days,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: message }, { status: 502 });
      }
      await trackEvent(user.id, "admin_membership_grant_sent", {
        plan: data.plan,
        days: String(data.days),
      });
      return NextResponse.json({ ok: true });
    }
    const { token } = await setPendingMembershipGrant(user.id, data.plan, data.days);
    const settings = await getUserSettings(user.id);
    const locale = getEmailLocale(settings.language || "en");
    const baseUrl = process.env.APP_BASE_URL || new URL(req.url).origin;
    await sendMembershipGrantInvitationEmail({
      to: user.email,
      displayName: user.display_name,
      userId: user.id,
      locale,
      plan: data.plan,
      days: data.days,
      token,
      baseUrl,
    });
    await trackEvent(user.id, "admin_membership_grant_sent", {
      plan: data.plan,
      days: String(data.days),
    });
    return NextResponse.json({ ok: true });
  }

  const hash = await hashPassword(data.newPassword);
  await updateUserPassword(user.id, hash, false);
  return NextResponse.json({ ok: true });
});

export const DELETE = withMetrics("/api/admin/users", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const userId = req.nextUrl.searchParams.get("id");
  if (!userId) {
    return NextResponse.json({ error: "id query param is required." }, { status: 400 });
  }

  const user = await findUserById(userId);
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  if (user.username === "admin") {
    return NextResponse.json({ error: "admin user cannot be deleted." }, { status: 400 });
  }

  await deleteUser(userId);
  return NextResponse.json({ ok: true });
});
