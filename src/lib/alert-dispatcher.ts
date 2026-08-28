import { sendAlertEmail, sendPercentAlertEmail, type EmailLocale } from "@/lib/email";
import { sendTelegramAlert } from "@/lib/telegram";
import { sendPushNotification } from "@/lib/web-push";
import {
  listPushSubscriptions,
  deletePushSubscription,
  createDeviceNotification,
  createNotification,
  getTelegramQuota,
  incrementTelegramCounter,
  isFeatureEnabled,
  trackEvent,
  hasRecentFiredEmailDispatch,
} from "@/lib/db";
import { priceAlertNotification } from "@/lib/notification-templates";
import type { NotificationChannel, SubscriptionPlan, PercentBasis } from "@/lib/types";
import type { AlertHeadline } from "@/lib/alert-context";

/** Channels supported for price alerts. WhatsApp is intentionally not supported. */
export const ALERT_DELIVERY_CHANNELS: readonly NotificationChannel[] = [
  "email",
  "push",
  "telegram",
  "device",
] as const;

/** Always-on in-app center channel (not a user preference toggle). */
export type AlertAlwaysOnChannel = "in_app";

export type AlertDispatchChannel = NotificationChannel | AlertAlwaysOnChannel;

export interface AlertDispatchContext {
  userId: string;
  email: string;
  emailVerified: boolean;
  plan: SubscriptionPlan;
  alertChannels: NotificationChannel[];
  telegramChatId: string;
  locale?: EmailLocale;
}

export interface ThresholdAlertPayload {
  type: "threshold";
  ticker: string;
  name: string;
  condition: "above" | "below";
  threshold: number;
  currentPrice: number;
  currency: string;
  alertId?: string;
  headlines?: AlertHeadline[];
}

export interface PercentAlertPayload {
  type: "percent_change";
  ticker: string;
  name: string;
  currentPrice: number;
  currency: string;
  percentChange: number;
  percentBasis: PercentBasis;
  isPortfolioWide: boolean;
  alertId?: string;
  headlines?: AlertHeadline[];
}

export type AlertPayload = ThresholdAlertPayload | PercentAlertPayload;

export interface ChannelSkip {
  channel: AlertDispatchChannel;
  reason: string;
}

export interface ChannelFail {
  channel: AlertDispatchChannel;
  reason: string;
}

export interface AlertDispatchResult {
  channelsRequested: NotificationChannel[];
  /** Includes always-on `in_app` when the notification center write succeeds. */
  channelsSent: AlertDispatchChannel[];
  channelsSkipped: ChannelSkip[];
  channelsFailed: ChannelFail[];
}

/** Normalize user channel prefs: drop WhatsApp, keep only known delivery channels. */
export function normalizeAlertChannels(channels: NotificationChannel[] | string[]): NotificationChannel[] {
  const out: NotificationChannel[] = [];
  for (const raw of channels) {
    const mapped = String(raw).toLowerCase() === "whatsapp" ? "telegram" : String(raw);
    if (
      (mapped === "email" || mapped === "push" || mapped === "telegram" || mapped === "device") &&
      !out.includes(mapped)
    ) {
      out.push(mapped);
    }
  }
  return out;
}

function buildChangeDescription(payload: AlertPayload): string {
  if (payload.type === "threshold") {
    const dir = payload.condition === "above" ? "rose above" : "dropped below";
    return `${dir} ${payload.currency} ${payload.threshold.toFixed(2)}`;
  }
  const dir = payload.percentChange >= 0 ? "up" : "down";
  const absP = Math.abs(payload.percentChange).toFixed(2);
  const basis = payload.percentBasis === "daily" ? "today" : "since purchase";
  return `${dir} ${absP}% ${basis}`;
}

function buildPushTitle(payload: AlertPayload): string {
  const ticker = payload.ticker;
  if (payload.type === "threshold") {
    const dir = payload.condition === "above" ? "↑" : "↓";
    return `${dir} ${ticker} Alert`;
  }
  const dir = payload.percentChange >= 0 ? "↑" : "↓";
  return `${dir} ${ticker} ${Math.abs(payload.percentChange).toFixed(1)}%`;
}

export function topAlertHeadline(payload: AlertPayload): AlertHeadline | undefined {
  return payload.headlines?.find((h) => h.title && h.url);
}

export function buildPushBody(payload: AlertPayload): string {
  const name = payload.name || payload.ticker;
  const base = `${name}: ${buildChangeDescription(payload)} — now ${payload.currency} ${payload.currentPrice.toFixed(2)}`;
  const headline = topAlertHeadline(payload);
  if (!headline) return base;
  return `${base} · ${headline.title}`.slice(0, 220);
}

/**
 * Dispatch to the notification center always, plus exactly the channels the user
 * selected (email / push / telegram / device). WhatsApp is not a delivery path.
 */
export async function dispatchAlert(
  ctx: AlertDispatchContext,
  payload: AlertPayload,
): Promise<AlertDispatchResult> {
  const channelsRequested = normalizeAlertChannels(ctx.alertChannels);
  const channelsSent: AlertDispatchChannel[] = [];
  const channelsSkipped: ChannelSkip[] = [];
  const channelsFailed: ChannelFail[] = [];

  // In-app notification center is always-on — independent of channel prefs.
  try {
    await createNotification(ctx.userId, priceAlertNotification(payload));
    channelsSent.push("in_app");
    trackEvent(ctx.userId, "alert_inapp_sent", { ticker: payload.ticker });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error("Alert in-app notification failed:", err);
    channelsFailed.push({ channel: "in_app", reason });
  }

  for (const channel of channelsRequested) {
    try {
      if (channel === "email") {
        if (!ctx.email) {
          channelsSkipped.push({ channel, reason: "missing_email" });
          continue;
        }
        if (!ctx.emailVerified) {
          channelsSkipped.push({ channel, reason: "email_unverified" });
          continue;
        }
        if (payload.alertId && (await hasRecentFiredEmailDispatch(payload.alertId, payload.ticker))) {
          channelsSkipped.push({ channel, reason: "already_emailed_24h" });
          continue;
        }
        if (payload.type === "threshold") {
          const result = await sendAlertEmail(ctx.email, {
            ticker: payload.ticker,
            name: payload.name,
            condition: payload.condition,
            threshold: payload.threshold,
            currentPrice: payload.currentPrice,
            currency: payload.currency,
            headlines: payload.headlines,
          }, ctx.locale, ctx.userId);
          if (!result.success) {
            channelsFailed.push({ channel, reason: result.error || "email_send_failed" });
            continue;
          }
        } else {
          const result = await sendPercentAlertEmail(ctx.email, {
            ticker: payload.ticker,
            name: payload.name,
            currentPrice: payload.currentPrice,
            currency: payload.currency,
            percentChange: payload.percentChange,
            percentBasis: payload.percentBasis,
            isPortfolioWide: payload.isPortfolioWide,
            headlines: payload.headlines,
          }, ctx.locale, ctx.userId);
          if (!result.success) {
            channelsFailed.push({ channel, reason: result.error || "email_send_failed" });
            continue;
          }
        }
        channelsSent.push("email");
        trackEvent(ctx.userId, "alert_email_sent", { ticker: payload.ticker });
        continue;
      }

      if (channel === "push") {
        const subs = await listPushSubscriptions(ctx.userId);
        if (subs.length === 0) {
          channelsSkipped.push({ channel, reason: "no_push_subscription" });
          continue;
        }
        let delivered = 0;
        for (const sub of subs) {
          const result = await sendPushNotification(
            { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
            { title: buildPushTitle(payload), body: buildPushBody(payload), url: "/" },
          );
          if (result.gone) {
            await deletePushSubscription(ctx.userId, sub.endpoint);
          } else if (result.success) {
            delivered++;
          }
        }
        if (delivered === 0) {
          channelsFailed.push({ channel, reason: "push_delivery_failed" });
          continue;
        }
        channelsSent.push("push");
        trackEvent(ctx.userId, "alert_push_sent", { ticker: payload.ticker });
        continue;
      }

      if (channel === "telegram") {
        if (!(await isFeatureEnabled("telegram_enabled"))) {
          channelsSkipped.push({ channel, reason: "telegram_feature_disabled" });
          continue;
        }
        if (!ctx.telegramChatId) {
          channelsSkipped.push({ channel, reason: "telegram_not_linked" });
          continue;
        }
        const quota = await getTelegramQuota(ctx.userId);
        if (!quota.allowed) {
          channelsSkipped.push({ channel, reason: quota.reason || "telegram_quota" });
          continue;
        }
        const headline = topAlertHeadline(payload);
        const result = await sendTelegramAlert(ctx.telegramChatId, {
          ticker: payload.ticker,
          name: payload.name,
          currentPrice: payload.currentPrice,
          currency: payload.currency,
          changeDescription: buildChangeDescription(payload),
          headline: headline ? { title: headline.title, url: headline.url } : undefined,
        });
        if (!result.success) {
          channelsFailed.push({ channel, reason: result.error || "telegram_send_failed" });
          continue;
        }
        await incrementTelegramCounter(ctx.userId);
        channelsSent.push("telegram");
        trackEvent(ctx.userId, "alert_telegram_sent", { ticker: payload.ticker });
        continue;
      }

      if (channel === "device") {
        const title = buildPushTitle(payload);
        const message = buildPushBody(payload);
        await createDeviceNotification(ctx.userId, { title, message, ticker: payload.ticker });
        channelsSent.push("device");
        trackEvent(ctx.userId, "alert_device_sent", { ticker: payload.ticker });
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.error(`Alert dispatch failed for channel ${channel}:`, err);
      channelsFailed.push({ channel, reason });
    }
  }

  return { channelsRequested, channelsSent, channelsSkipped, channelsFailed };
}
