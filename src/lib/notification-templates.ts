import type { CreateNotificationInput } from "@/lib/db/notifications";
import type { PercentBasis } from "@/lib/types";

/** Minimal alert fire payload for the in-app notification center (avoids importing the dispatcher). */
export type PriceAlertNotificationPayload =
  | {
      type: "threshold";
      ticker: string;
      name: string;
      condition: "above" | "below";
      threshold: number;
      currentPrice: number;
      currency: string;
    }
  | {
      type: "percent_change";
      ticker: string;
      name: string;
      currentPrice: number;
      currency: string;
      percentChange: number;
      percentBasis: PercentBasis;
    };

export function welcomeNotification(): CreateNotificationInput {
  return {
    type: "welcome",
    title: "i18n:notifWelcomeTitle",
    message: "i18n:notifWelcomeMessage",
    link: "/landing",
    linkLabel: "i18n:notifWelcomeCta",
  };
}

export function trefolioUpgradeNotification(): CreateNotificationInput {
  return {
    type: "upgrade",
    title: "i18n:notifTrefolioUpgradeTitle",
    message: "i18n:notifTrefolioUpgradeMessage",
    link: "/",
    linkLabel: "i18n:notifTrefolioUpgradeCta",
  };
}

export function planExpiredNotification(): CreateNotificationInput {
  return {
    type: "downgrade",
    title: "i18n:notifPlanExpiredTitle",
    message: "i18n:notifPlanExpiredMessage",
    link: "/profile?section=subscription",
    linkLabel: "i18n:notifPlanExpiredCta",
  };
}

/**
 * Pending-downgrade notice. The ISO date is appended as a parameter
 * so the frontend can format it in the user's locale via `{0}`.
 */
export function downgradeNotification(planExpiresAt: string): CreateNotificationInput {
  return {
    type: "downgrade",
    title: "i18n:notifDowngradeTitle",
    message: `i18n:notifDowngradeMessage|${planExpiresAt}`,
    link: "/profile",
    linkLabel: "i18n:notifDowngradeCta",
  };
}

/** Sent once, the first time a newly-connected broker sync produces holdings. */
export function firstSyncCompleteNotification(positionCount: number): CreateNotificationInput {
  return {
    type: "info",
    title: "i18n:notifFirstSyncTitle",
    message: `i18n:notifFirstSyncMessage|${positionCount}`,
    link: "/",
    linkLabel: "i18n:notifFirstSyncCta",
  };
}

/** Broker last vs live market last — informational, not advice. */
export function brokerMarkGapNotification(tickers: string, deltaEurRounded: number): CreateNotificationInput {
  return {
    type: "info",
    title: "i18n:notifBrokerMarkGapTitle",
    message: `i18n:notifBrokerMarkGapMessage|${tickers}|${deltaEurRounded}`,
    link: "/",
    linkLabel: "i18n:notifBrokerMarkGapCta",
  };
}

/**
 * In-app notification center entry for a fired price alert.
 * Always created on dispatch, independent of email/push/Telegram/device prefs.
 */
export function priceAlertNotification(payload: PriceAlertNotificationPayload): CreateNotificationInput {
  const name = payload.name || payload.ticker;
  const price = payload.currentPrice.toFixed(2);

  if (payload.type === "threshold") {
    const threshold = payload.threshold.toFixed(2);
    const messageKey =
      payload.condition === "above" ? "notifPriceAlertAboveMessage" : "notifPriceAlertBelowMessage";
    return {
      type: "alert",
      title: `i18n:notifPriceAlertTitle|${payload.ticker}`,
      message: `i18n:${messageKey}|${name}|${payload.currency}|${threshold}|${price}`,
      link: "/tools/alerts",
      linkLabel: "i18n:notifPriceAlertCta",
    };
  }

  const absP = Math.abs(payload.percentChange).toFixed(2);
  const dir = payload.percentChange >= 0 ? "Up" : "Down";
  const basis = payload.percentBasis === "daily" ? "Today" : "SincePurchase";
  const messageKey = `notifPriceAlertPercent${dir}${basis}Message`;
  return {
    type: "alert",
    title: `i18n:notifPriceAlertTitle|${payload.ticker}`,
    message: `i18n:${messageKey}|${name}|${absP}|${payload.currency}|${price}`,
    link: "/tools/alerts",
    linkLabel: "i18n:notifPriceAlertCta",
  };
}
