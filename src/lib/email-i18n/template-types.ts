/**
 * TypeScript interfaces for the translatable string content
 * of each DB seed email template type.
 */

/** Feature templates (11 templates): heading, intro, section label, features, tier text, CTA */
export interface FeatureTemplateStrings {
  heading: string;
  intro: string;
  sectionLabel: string;
  features: { title: string; desc: string }[];
  tierText: string;
  ctaLabel: string;
}

/** Welcome No Stocks: 8 features with tier badges, heading, paragraph, 2 CTAs, tip */
export interface WelcomeNoStocksStrings {
  heading: string;
  paragraph: string;
  features: { title: string; desc: string }[];
  ctaPrimary: string;
  ctaSecondary: string;
  tipText: string;
}

/** Welcome Free Stocks: 7 features, heading, intro, voucher labels, 2 CTAs, tip */
export interface WelcomeFreeStocksStrings {
  heading: string;
  intro: string;
  features: { title: string; desc: string }[];
  voucherTitle: string;
  voucherDiscountDisplay: string; // e.g. "75% OFF" or "75% DTO"
  voucherApply: string;
  voucherValid: string;
  ctaPrimary: string;
  ctaSecondary: string;
  tipText: string;
}

/** Bifolio Upgrade: 9 features, heading, paragraph, 2 CTAs, upsell */
export interface BifolioUpgradeStrings {
  heading: string;
  paragraph: string;
  features: { title: string; desc: string }[];
  ctaPrimary: string;
  ctaSecondary: string;
  upsellText: string;
}

/** Trefolio Upgrade: 6 feature groups, heading, paragraph, 2 CTAs, community */
export interface TrefolioUpgradeStrings {
  heading: string;
  paragraph: string;
  groups: { label: string; items: string[] }[];
  ctaPrimary: string;
  ctaSecondary: string;
  communityText: string;
}

/** Referral Program: heading, intro, howItWorks, 3 steps, referral link box labels, CTA, tip */
export interface ReferralProgramStrings {
  heading: string;
  intro: string;
  howItWorks: string;
  steps: { title: string; desc: string }[];
  referralLinkLabel: string;
  referralLinkHint: string;
  ctaLabel: string;
  tipText: string;
}

/** Trial Invitation: 4 feature groups, heading, paragraph, CTAs, disclaimer, sign-off */
export interface TrialInvitationStrings {
  heading: string;
  paragraph: string;
  groups: { label: string; items: string[] }[];
  ctaPrimary: string;
  ctaSecondary: string;
  disclaimer: string;
  signoffIntro: string;
  signoffReply: string;
}

/** Trial Expired: 4 feature rows, heading, paragraph, pricing, CTAs, sign-off, growth callout */
export interface TrialExpiredStrings {
  heading: string;
  paragraph: string;
  features: { title: string; desc: string }[];
  pricingNote: string;
  ctaPrimary: string;
  ctaSecondary: string;
  signoffIntro: string;
  growthTitle: string;
  growthDesc: string;
  growthTitleDown: string;
  growthDescDown: string;
}

/** Footer strings shared across all templates */
export interface TemplateFooterStrings {
  receivedText: string;
  unsubscribeLabel: string;
}
