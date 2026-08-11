export interface FirstSyncCompleteStrings {
  subject: string;
  heading: string;
  bodyTemplate: string;
  ctaLabel: string;
}

/**
 * Sent once, the first time a newly-connected broker sync produces holdings
 * (0 -> N transition). Minimum viable locale coverage: en + es; other
 * locales fall back to en via the existing `?? .en` idiom used throughout
 * email.ts.
 */
export const firstSyncCompleteStrings: Record<string, FirstSyncCompleteStrings> = {
  en: {
    subject: "Your portfolio is ready",
    heading: "Your portfolio is ready",
    bodyTemplate: "We finished syncing your broker — {{count}} position(s) are now in trefolio.",
    ctaLabel: "View my portfolio",
  },
  es: {
    subject: "Tu cartera ya está lista",
    heading: "Tu cartera ya está lista",
    bodyTemplate: "Hemos terminado de sincronizar tu bróker — ahora tienes {{count}} posición(es) en trefolio.",
    ctaLabel: "Ver mi cartera",
  },
};
