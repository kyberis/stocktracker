import {
  getSnapTradeConnection,
  scheduleSnapTradeDeletion,
  clearSnapTradeDeletion,
  getUserSettings,
  updateUserSettings,
} from "@/lib/db";
import { canAccessTheme } from "@/lib/subscription";
import type { SubscriptionPlan } from "@/lib/types";

/**
 * Reset dashboard theme to default if the user's current theme
 * is no longer available on their new plan.
 */
export async function reconcileTheme(userId: string, newPlan: string): Promise<void> {
  try {
    const settings = await getUserSettings(userId);
    const plan = (newPlan || "free") as SubscriptionPlan;
    if (!canAccessTheme(settings.dashboardTheme, plan)) {
      await updateUserSettings(userId, { dashboardTheme: "default" });
    }
  } catch (err) {
    console.error("[billing-reconcile] Theme reconcile error:", err instanceof Error ? err.message : err);
  }
}

/**
 * Schedule or cancel SnapTrade user deletion based on plan change.
 */
export async function reconcileSnapTrade(userId: string, newPlan: string): Promise<void> {
  try {
    const conn = await getSnapTradeConnection(userId);
    if (!conn) return;

    if (newPlan === "pro" || newPlan === "starter") {
      await clearSnapTradeDeletion(userId);
    } else {
      await scheduleSnapTradeDeletion(userId);
    }
  } catch (err) {
    console.error("[billing-reconcile] SnapTrade reconcile error:", err instanceof Error ? err.message : err);
  }
}
