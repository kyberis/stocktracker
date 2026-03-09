import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { getUserSettings, updateUserSettings, findUserById, getWhatsAppQuota } from "@/lib/db";
import { parseBody } from "@/lib/api-response";
import { updateNotificationPrefsSchema } from "@/lib/schemas";
import { canAccessFeature } from "@/lib/subscription";
import type { NotificationChannel } from "@/lib/types";

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const settings = await getUserSettings(session.userId);
  const waQuota = await getWhatsAppQuota(session.userId);
  return NextResponse.json({
    alertChannels: settings.alertChannels,
    whatsappPhone: settings.whatsappPhone,
    whatsappVerified: settings.whatsappVerified,
    alertDeviceEnabled: settings.alertDeviceEnabled,
    whatsappQuota: {
      remainingToday: Math.max(0, waQuota.userDailyLimit - waQuota.userToday),
      remainingMonth: Math.max(0, waQuota.userMonthlyLimit - waQuota.userMonth),
      dailyLimit: waQuota.userDailyLimit,
      monthlyLimit: waQuota.userMonthlyLimit,
    },
  });
}

export async function PUT(req: NextRequest) {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const result = await parseBody(req, updateNotificationPrefsSchema);
  if (!result.success) return result.error;

  const user = await findUserById(session.userId);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const updates: Partial<{ alertChannels: NotificationChannel[]; alertDeviceEnabled: boolean }> = {};

  if (result.data.alertChannels !== undefined) {
    const requested = result.data.alertChannels.split(",").filter(Boolean) as NotificationChannel[];
    const allowed: NotificationChannel[] = [];
    for (const ch of requested) {
      if (ch === "email") {
        const access = canAccessFeature("alerts-email", { plan: user.plan, aiCallsThisMonth: user.ai_calls_this_month });
        if (access.allowed) allowed.push(ch);
      } else if (ch === "push") {
        const access = canAccessFeature("alerts-push", { plan: user.plan, aiCallsThisMonth: user.ai_calls_this_month });
        if (access.allowed) allowed.push(ch);
      } else if (ch === "whatsapp") {
        const access = canAccessFeature("alerts-whatsapp", { plan: user.plan, aiCallsThisMonth: user.ai_calls_this_month });
        if (access.allowed) allowed.push(ch);
      } else if (ch === "device") {
        const access = canAccessFeature("alerts-device", { plan: user.plan, aiCallsThisMonth: user.ai_calls_this_month });
        if (access.allowed) allowed.push(ch);
      }
    }
    updates.alertChannels = allowed;
  }

  if (result.data.alertDeviceEnabled !== undefined) {
    updates.alertDeviceEnabled = result.data.alertDeviceEnabled;
  }

  const settings = await updateUserSettings(session.userId, updates);
  return NextResponse.json({
    alertChannels: settings.alertChannels,
    whatsappPhone: settings.whatsappPhone,
    whatsappVerified: settings.whatsappVerified,
    alertDeviceEnabled: settings.alertDeviceEnabled,
  });
}
