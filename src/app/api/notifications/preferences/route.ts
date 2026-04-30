import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import {
  getUserSettings,
  updateUserSettings,
  findUserById,
  getTelegramQuota,
  disconnectTelegram,
} from "@/lib/db";
import { parseBody } from "@/lib/api-response";
import { updateNotificationPrefsSchema } from "@/lib/schemas";
import { canAccessFeature } from "@/lib/subscription";
import type { NotificationChannel } from "@/lib/types";

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const settings = await getUserSettings(session.userId);
  const tgQuota = await getTelegramQuota(session.userId);
  return NextResponse.json({
    alertChannels: settings.alertChannels,
    telegramChatId: settings.telegramChatId,
    telegramLinked: settings.telegramChatId.length > 0,
    alertDeviceEnabled: settings.alertDeviceEnabled,
    emailNotificationsEnabled: settings.emailNotificationsEnabled,
    telegramQuota: {
      remainingToday: Math.max(0, tgQuota.userDailyLimit - tgQuota.userToday),
      remainingMonth: Math.max(0, tgQuota.userMonthlyLimit - tgQuota.userMonth),
      dailyLimit: tgQuota.userDailyLimit,
      monthlyLimit: tgQuota.userMonthlyLimit,
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

  if (result.data.telegramDisconnect) {
    await disconnectTelegram(session.userId);
  }

  const updates: Partial<{ alertChannels: NotificationChannel[]; alertDeviceEnabled: boolean; emailNotificationsEnabled: boolean }> = {};

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
      } else if (ch === "telegram") {
        const access = canAccessFeature("alerts-telegram", { plan: user.plan, aiCallsThisMonth: user.ai_calls_this_month });
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

  if (result.data.emailNotificationsEnabled !== undefined) {
    updates.emailNotificationsEnabled = result.data.emailNotificationsEnabled;
  }

  if (Object.keys(updates).length > 0) {
    await updateUserSettings(session.userId, updates);
  }

  const fresh = await getUserSettings(session.userId);

  return NextResponse.json({
    alertChannels: fresh.alertChannels,
    telegramChatId: fresh.telegramChatId,
    telegramLinked: fresh.telegramChatId.length > 0,
    alertDeviceEnabled: fresh.alertDeviceEnabled,
    emailNotificationsEnabled: fresh.emailNotificationsEnabled,
  });
}
