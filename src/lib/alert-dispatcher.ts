import { sendAlertEmail, sendPercentAlertEmail } from "@/lib/email";
import { sendWhatsAppAlert } from "@/lib/whatsapp";
import { sendPushNotification } from "@/lib/web-push";
import {
  listPushSubscriptions,
  deletePushSubscription,
  createDeviceNotification,
  getWhatsAppQuota,
  incrementWhatsAppCounter,
} from "@/lib/db";
import { canAccessFeature } from "@/lib/subscription";
import type { NotificationChannel, SubscriptionPlan, PercentBasis } from "@/lib/types";

export interface AlertDispatchContext {
  userId: string;
  email: string;
  emailVerified: boolean;
  plan: SubscriptionPlan;
  alertChannels: NotificationChannel[];
  whatsappPhone: string;
  whatsappVerified: boolean;
}

export interface ThresholdAlertPayload {
  type: "threshold";
  ticker: string;
  name: string;
  condition: "above" | "below";
  threshold: number;
  currentPrice: number;
  currency: string;
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
}

export type AlertPayload = ThresholdAlertPayload | PercentAlertPayload;

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

function buildPushBody(payload: AlertPayload): string {
  const name = payload.name || payload.ticker;
  return `${name}: ${buildChangeDescription(payload)} — now ${payload.currency} ${payload.currentPrice.toFixed(2)}`;
}

export async function dispatchAlert(
  ctx: AlertDispatchContext,
  payload: AlertPayload
): Promise<{ channelsSent: NotificationChannel[] }> {
  const sent: NotificationChannel[] = [];

  for (const channel of ctx.alertChannels) {
    const featureKey = channel === "email" ? "alerts-email"
      : channel === "push" ? "alerts-push"
      : channel === "whatsapp" ? "alerts-whatsapp"
      : "alerts-device";

    const access = canAccessFeature(featureKey, { plan: ctx.plan, aiCallsThisMonth: 0 });
    if (!access.allowed) continue;

    try {
      if (channel === "email" && ctx.email && ctx.emailVerified) {
        if (payload.type === "threshold") {
          await sendAlertEmail(ctx.email, {
            ticker: payload.ticker,
            name: payload.name,
            condition: payload.condition,
            threshold: payload.threshold,
            currentPrice: payload.currentPrice,
            currency: payload.currency,
          });
        } else {
          await sendPercentAlertEmail(ctx.email, {
            ticker: payload.ticker,
            name: payload.name,
            currentPrice: payload.currentPrice,
            currency: payload.currency,
            percentChange: payload.percentChange,
            percentBasis: payload.percentBasis,
            isPortfolioWide: payload.isPortfolioWide,
          });
        }
        sent.push("email");
      }

      if (channel === "push") {
        const subs = await listPushSubscriptions(ctx.userId);
        for (const sub of subs) {
          const result = await sendPushNotification(
            { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
            { title: buildPushTitle(payload), body: buildPushBody(payload), url: "/" }
          );
          if (result.gone) {
            await deletePushSubscription(ctx.userId, sub.endpoint);
          }
        }
        if (subs.length > 0) sent.push("push");
      }

      if (channel === "whatsapp" && ctx.whatsappPhone && ctx.whatsappVerified) {
        const quota = await getWhatsAppQuota(ctx.userId);
        if (!quota.allowed) {
          console.warn(`WhatsApp quota exceeded for user ${ctx.userId}: ${quota.reason}`);
          continue;
        }
        const result = await sendWhatsAppAlert(ctx.whatsappPhone, {
          ticker: payload.ticker,
          name: payload.name,
          currentPrice: payload.currentPrice,
          currency: payload.currency,
          changeDescription: buildChangeDescription(payload),
        });
        if (result.success) {
          await incrementWhatsAppCounter(ctx.userId);
          sent.push("whatsapp");
        }
      }

      if (channel === "device") {
        const title = buildPushTitle(payload);
        const message = buildPushBody(payload);
        await createDeviceNotification(ctx.userId, { title, message, ticker: payload.ticker });
        sent.push("device");
      }
    } catch (err) {
      console.error(`Alert dispatch failed for channel ${channel}:`, err);
    }
  }

  return { channelsSent: sent };
}
