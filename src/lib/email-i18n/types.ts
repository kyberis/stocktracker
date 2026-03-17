export type EmailLocale =
  | "en" | "es" | "fr" | "de" | "it" | "pt" | "nl" | "pl" | "cs" | "sk"
  | "hu" | "ro" | "bg" | "hr" | "sl" | "el" | "sv" | "da" | "fi" | "et"
  | "lv" | "lt" | "ga" | "mt" | "nb" | "uk" | "tr" | "sr" | "is" | "sq"
  | "bs" | "mk" | "be" | "ca" | "cy";

export interface WelcomeStrings {
  subject: string;
  heading: string;
  /** Use {{name}} as placeholder for the user's display name */
  intro: string;
  f1Title: string;
  f1Desc: string;
  f2Title: string;
  f2Desc: string;
  f3Title: string;
  f3Desc: string;
  f4Title: string;
  f4Desc: string;
  ctaPrimary: string;
  ctaSecondary: string;
  tipLabel: string;
  tip: string;
  tipLink: string;
  footer: string;
  manage: string;
  fallbackName: string;
}

export interface BifolioStrings {
  subject: string;
  heading: string;
  /** Use {{name}} as placeholder */
  intro: string;
  f1Title: string;
  f1Desc: string;
  f2Title: string;
  f2Desc: string;
  f3Title: string;
  f3Desc: string;
  f4Title: string;
  f4Desc: string;
  ctaPrimary: string;
  ctaSecondary: string;
  upsell: string;
  upsellLink: string;
  footer: string;
  manage: string;
  fallbackName: string;
}

export interface TrefolioStrings {
  subject: string;
  heading: string;
  /** Use {{name}} as placeholder */
  intro: string;
  g1Label: string;
  g1Items: string[];
  g2Label: string;
  g2Items: string[];
  g3Label: string;
  g3Items: string[];
  g4Label: string;
  g4Items: string[];
  g5Label: string;
  g5Items: string[];
  ctaPrimary: string;
  ctaSecondary: string;
  community: string;
  footer: string;
  manage: string;
  fallbackName: string;
}

export interface EmailBatch {
  welcome: Record<string, WelcomeStrings>;
  bifolio: Record<string, BifolioStrings>;
  trefolio: Record<string, TrefolioStrings>;
}
