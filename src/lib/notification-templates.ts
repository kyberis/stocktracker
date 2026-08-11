import type { CreateNotificationInput } from "@/lib/db/notifications";

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
