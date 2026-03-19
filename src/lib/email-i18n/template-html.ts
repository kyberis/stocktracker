/**
 * HTML generator functions for DB seed email templates.
 * Produces complete email HTML from translated strings.
 * Replicates the exact HTML structure from src/lib/db/email-template-seeds.ts
 */

import type {
  FeatureTemplateStrings,
  WelcomeNoStocksStrings,
  WelcomeFreeStocksStrings,
  BifolioUpgradeStrings,
  TrefolioUpgradeStrings,
  ReferralProgramStrings,
  TemplateFooterStrings,
} from "./template-types";

/* ── Shared HTML helpers (mirror email-template-seeds.ts) ── */

const HEADER = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#059669 0%,#10b981 100%);padding:32px 32px 28px;text-align:center;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr>
              <td style="width:36px;height:36px;vertical-align:middle;">
                <img src="{{base_url}}/email-logo@2x.png" alt="" width="36" height="36" style="display:block;width:36px;height:36px;border-radius:8px;" />
              </td>
              <td style="padding-left:10px;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">trefolio</td>
            </tr>
          </table>
        </td></tr>`;

function headerWithBadge(badge: string): string {
  return HEADER.replace(
    "</table>\n        </td></tr>",
    `</table>
          <p style="margin:12px 0 0;color:rgba(255,255,255,0.9);font-size:13px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;">${badge}</p>
        </td></tr>`,
  );
}

export function footerForLocale(receivedText: string, unsubscribeLabel: string): string {
  return `        <tr><td style="padding:0 32px;"><div style="border-top:1px solid #e2e8f0;margin:24px 0;"></div></td></tr>
        <tr><td style="padding:0 32px 32px;">
          <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.5;">
            ${receivedText} <a href="{{unsubscribe_url}}" style="color:#94a3b8;text-decoration:underline;">${unsubscribeLabel}</a>
          </p>
        </td></tr>
      </table>
      <p style="margin:24px 0 0;font-size:11px;color:#94a3b8;text-align:center;">
        &copy; 2026 trefolio &mdash; Every portfolio deserves a bit of luck &#x1F340;
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}

function cta(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr><td align="center">
              <a href="${url}" target="_blank" style="display:inline-block;padding:14px 36px;background-color:#10b981;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:10px;letter-spacing:0.2px;">${label}</a>
            </td></tr>
          </table>`;
}

function ctaSecondary(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:12px;">
            <tr><td align="center">
              <a href="${url}" target="_blank" style="display:inline-block;padding:10px 24px;background-color:transparent;color:#10b981;font-size:14px;font-weight:600;text-decoration:none;border:1.5px solid #10b981;border-radius:10px;">${label}</a>
            </td></tr>
          </table>`;
}

function feature(emoji: string, title: string, desc: string, hasBorder = false): string {
  const border = hasBorder ? "border-left:4px solid #10b981;" : "";
  return `<tr><td style="padding:12px 16px;background:#f0fdf4;border-radius:10px;${border}">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                <td style="width:36px;font-size:20px;vertical-align:top;padding-top:2px;">${emoji}</td>
                <td style="padding-left:8px;">
                  <strong style="color:#0f172a;font-size:14px;">${title}</strong>
                  <p style="margin:2px 0 0;font-size:13px;color:#475569;line-height:1.4;">${desc}</p>
                </td>
              </tr></table>
            </td></tr>
            <tr><td style="height:8px;"></td></tr>`;
}

function tierBadge(tier: string, color: string): string {
  return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;background:${color};color:#fff;text-transform:uppercase;letter-spacing:0.5px;">${tier}</span>`;
}

const FREE_BADGE = tierBadge("Folio", "#64748b");
const BIFOLIO_BADGE = tierBadge("Bifolio", "#3b82f6");
const TREFOLIO_BADGE = tierBadge("Trefolio", "#10b981");

function featureWithTier(emoji: string, title: string, desc: string, badge: string): string {
  return `<tr><td style="padding:12px 16px;background:#f0fdf4;border-radius:10px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                <td style="width:36px;font-size:20px;vertical-align:top;padding-top:2px;">${emoji}</td>
                <td style="padding-left:8px;">
                  <strong style="color:#0f172a;font-size:14px;">${title}</strong> ${badge}
                  <p style="margin:4px 0 0;font-size:13px;color:#475569;line-height:1.4;">${desc}</p>
                </td>
              </tr></table>
            </td></tr>
            <tr><td style="height:8px;"></td></tr>`;
}

function proFeatureGroup(label: string, items: string[]): string {
  const checks = items.map((i) => `&#x2705; ${i}`).join("<br>");
  return `<tr><td style="padding:4px 0 6px;"><p style="margin:0;font-size:11px;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:1px;">${label}</p></td></tr>
          <tr><td style="padding:10px 16px;background:#f0fdf4;border-radius:10px;border-left:4px solid #10b981;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-size:13px;color:#0f172a;line-height:1.7;">${checks}</td></tr></table>
          </td></tr>
          <tr><td style="height:12px;"></td></tr>`;
}

function voucherBox(
  code: string,
  voucherTitle: string,
  voucherDiscountDisplay: string,
  voucherApply: string,
  voucherValid: string,
): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
            <tr><td style="padding:20px 24px;background:linear-gradient(135deg,#fef3c7 0%,#fde68a 100%);border-radius:12px;border:2px dashed #f59e0b;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#92400e;text-transform:uppercase;letter-spacing:1px;">${voucherTitle}</p>
              <p style="margin:0 0 8px;font-size:28px;font-weight:800;color:#92400e;letter-spacing:-0.5px;">${voucherDiscountDisplay}</p>
              <p style="margin:0 0 4px;font-size:14px;color:#78350f;">${voucherApply}</p>
              <p style="margin:0;font-size:22px;font-weight:800;color:#0f172a;letter-spacing:2px;font-family:monospace;">${code}</p>
              <p style="margin:8px 0 0;font-size:12px;color:#92400e;">${voucherValid}</p>
            </td></tr>
          </table>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;text-align:center;">${text}</h1>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 24px;font-size:15px;color:#475569;text-align:center;line-height:1.6;">${text}</p>`;
}

function intro(text: string): string {
  return `<p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">${text}</p>`;
}

function tip(text: string): string {
  return `<tr><td style="padding:0 32px 12px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:14px 16px;background:#eff6ff;border-radius:10px;border:1px solid #bfdbfe;">
            <p style="margin:0;font-size:13px;color:#1e40af;text-align:center;line-height:1.5;">${text}</p>
          </td></tr></table>
        </td></tr>`;
}

function upsellTip(text: string): string {
  return `<tr><td style="padding:0 32px 12px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:14px 16px;background:#fefce8;border-radius:10px;border:1px solid #fde68a;">
            <p style="margin:0;font-size:13px;color:#92400e;text-align:center;line-height:1.5;">${text}</p>
          </td></tr></table>
        </td></tr>`;
}

function divider(): string {
  return `<tr><td style="padding:0 32px;"><div style="border-top:1px solid #e2e8f0;margin:24px 0;"></div></td></tr>`;
}

/* ── Generator functions ── */

/** Emojis for Welcome No Stocks features (8 features) */
const WELCOME_NO_STOCKS_EMOJIS = [
  "&#x1F4C8;", // Real-time Quotes
  "&#x1F4B0;", // Dividend Tracking
  "&#x1F916;", // AI-Powered Analysis
  "&#x1F4E5;", // Easy Import
  "&#x1F514;", // Price Alerts
  "&#x1F4CA;", // Advanced Metrics
  "&#x1F3E6;", // Fundamentals & Intelligence
  "&#x1F50D;", // Stock Screener
];

/** Badges for Welcome No Stocks features */
const WELCOME_NO_STOCKS_BADGES = [
  FREE_BADGE,
  FREE_BADGE,
  FREE_BADGE,
  FREE_BADGE,
  BIFOLIO_BADGE,
  BIFOLIO_BADGE,
  TREFOLIO_BADGE,
  TREFOLIO_BADGE,
];

/** Emojis for Welcome Free Stocks features (7 features) */
const WELCOME_FREE_STOCKS_EMOJIS = [
  "&#x1F4C8;", // Real-time Dashboard
  "&#x1F4B0;", // Dividend Insights
  "&#x1F916;", // AI Stock Analysis
  "&#x1F514;", // Price Alerts
  "&#x1F4CA;", // Performance Metrics
  "&#x1F3E6;", // Company Fundamentals
  "&#x1F50D;", // Stock Screener & Simulator
];

/** Badges for Welcome Free Stocks features */
const WELCOME_FREE_STOCKS_BADGES = [
  FREE_BADGE,
  FREE_BADGE,
  FREE_BADGE,
  BIFOLIO_BADGE,
  BIFOLIO_BADGE,
  TREFOLIO_BADGE,
  TREFOLIO_BADGE,
];

/** Emojis for Bifolio Upgrade features (9 features, all with border) */
const BIFOLIO_UPGRADE_EMOJIS = [
  "&#x1F517;", // Portfolio Sharing
  "&#x1F4CA;", // CSV Export
  "&#x1F514;", // Email & Push Alerts
  "&#x1F4C8;", // Advanced Metrics
  "&#x1F4B0;", // Full Growth History
  "&#x1F3E0;", // Net Worth Tracking
  "&#x1F4E5;", // Broker Sync
  "&#x1F916;", // 20 AI Calls/Month
  "&#x1F4AC;", // AI Support Agent
];

export function generateFeatureEmail(
  emoji: string,
  strings: FeatureTemplateStrings,
  footer: TemplateFooterStrings,
  ctaUrl: string,
  featureEmojis?: string[],
  featureHasBorder?: boolean[],
): string {
  const emojis = featureEmojis ?? strings.features.map(() => "&#x2022;");
  const featureRows = strings.features
    .map((f, i) =>
      feature(
        emojis[i] ?? "&#x2022;",
        f.title,
        f.desc,
        featureHasBorder?.[i] ?? false,
      ),
    )
    .join("\n            ");

  const bodyContent = `
          ${intro(strings.intro)}
          ${intro(strings.sectionLabel)}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${featureRows}
          </table>
          <p style="margin:0 0 20px;font-size:13px;color:#64748b;text-align:center;">${strings.tierText}</p>
          ${cta(strings.ctaLabel, ctaUrl)}`;

  const foot = footerForLocale(footer.receivedText, footer.unsubscribeLabel);

  return `${HEADER}
        <tr><td style="padding:36px 32px 16px;">
          <p style="margin:0 0 8px;font-size:36px;text-align:center;">${emoji}</p>
          ${heading(strings.heading)}
          <div style="margin-top:20px;">
            ${bodyContent}
          </div>
        </td></tr>
        ${divider()}
${foot}`;
}

export function generateWelcomeNoStocks(
  strings: WelcomeNoStocksStrings,
  footer: TemplateFooterStrings,
): string {
  const baseUrl = "{{base_url}}";
  const featureRows = strings.features
    .map((f, i) =>
      featureWithTier(
        WELCOME_NO_STOCKS_EMOJIS[i] ?? "&#x2022;",
        f.title,
        f.desc,
        WELCOME_NO_STOCKS_BADGES[i] ?? FREE_BADGE,
      ),
    )
    .join("\n            ");

  const foot = footerForLocale(footer.receivedText, footer.unsubscribeLabel);

  return `${HEADER}
        <tr><td style="padding:36px 32px 16px;">
          ${heading(strings.heading)}
          ${paragraph(strings.paragraph)}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${featureRows}
          </table>
          ${cta(strings.ctaPrimary, `${baseUrl}/import?utm_source=email&utm_medium=lifecycle&utm_campaign=welcome_no_stocks`)}
          ${ctaSecondary(strings.ctaSecondary, `${baseUrl}/?utm_source=email&utm_medium=lifecycle&utm_campaign=welcome_no_stocks`)}
        </td></tr>
        ${divider()}
        ${tip(strings.tipText)}
${foot}`;
}

export function generateWelcomeFreeStocks(
  strings: WelcomeFreeStocksStrings,
  footer: TemplateFooterStrings,
): string {
  const baseUrl = "{{base_url}}";
  const featureRows = strings.features
    .map((f, i) =>
      featureWithTier(
        WELCOME_FREE_STOCKS_EMOJIS[i] ?? "&#x2022;",
        f.title,
        f.desc,
        WELCOME_FREE_STOCKS_BADGES[i] ?? FREE_BADGE,
      ),
    )
    .join("\n            ");

  const voucher = voucherBox(
    "EARLYBIRD",
    strings.voucherTitle,
    strings.voucherDiscountDisplay,
    strings.voucherApply,
    strings.voucherValid,
  );

  const foot = footerForLocale(footer.receivedText, footer.unsubscribeLabel);

  return `${HEADER}
        <tr><td style="padding:36px 32px 16px;">
          ${heading(strings.heading)}
          ${intro(strings.intro)}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
            ${featureRows}
          </table>
          ${voucher}
          ${cta(strings.ctaPrimary, `${baseUrl}/profile?utm_source=email&utm_medium=lifecycle&utm_campaign=welcome_free_stocks`)}
          ${ctaSecondary(strings.ctaSecondary, `${baseUrl}/?utm_source=email&utm_medium=lifecycle&utm_campaign=welcome_free_stocks`)}
        </td></tr>
        ${divider()}
        ${tip(strings.tipText)}
${foot}`;
}

export function generateBifolioUpgrade(
  strings: BifolioUpgradeStrings,
  footer: TemplateFooterStrings,
): string {
  const baseUrl = "{{base_url}}";
  const featureRows = strings.features
    .map((f, i) =>
      feature(
        BIFOLIO_UPGRADE_EMOJIS[i] ?? "&#x2022;",
        f.title,
        f.desc,
        true,
      ),
    )
    .join("\n            ");

  const foot = footerForLocale(footer.receivedText, footer.unsubscribeLabel);

  return `${headerWithBadge("Bifolio")}
        <tr><td style="padding:36px 32px 16px;">
          ${heading(strings.heading)}
          ${paragraph(strings.paragraph)}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${featureRows}
          </table>
          ${cta(strings.ctaPrimary, `${baseUrl}/tools/alerts?utm_source=email&utm_medium=lifecycle&utm_campaign=bifolio_upgrade`)}
          ${ctaSecondary(strings.ctaSecondary, `${baseUrl}/profile?utm_source=email&utm_medium=lifecycle&utm_campaign=bifolio_upgrade`)}
        </td></tr>
        ${divider()}
        ${upsellTip(strings.upsellText)}
${foot}`;
}

export function generateTrefolioUpgrade(
  strings: TrefolioUpgradeStrings,
  footer: TemplateFooterStrings,
): string {
  const baseUrl = "{{base_url}}";
  const groupRows = strings.groups
    .map((g) => proFeatureGroup(g.label, g.items))
    .join("\n            ");

  const foot = footerForLocale(footer.receivedText, footer.unsubscribeLabel);

  return `${headerWithBadge("&#x2B50; Trefolio Pro &#x2B50;")}
        <tr><td style="padding:36px 32px 16px;">
          ${heading(strings.heading)}
          ${paragraph(strings.paragraph)}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
            ${groupRows}
          </table>
          <div style="height:12px;"></div>
          ${cta(strings.ctaPrimary, `${baseUrl}/?utm_source=email&utm_medium=lifecycle&utm_campaign=trefolio_upgrade`)}
          ${ctaSecondary(strings.ctaSecondary, `${baseUrl}/?utm_source=email&utm_medium=lifecycle&utm_campaign=trefolio_upgrade`)}
        </td></tr>
        ${divider()}
        ${tip(strings.communityText)}
${foot}`;
}

const REFERRAL_STEP_EMOJIS = ["&#x1F517;", "&#x1F4E7;", "&#x1F381;"];

export function generateReferralProgram(
  strings: ReferralProgramStrings,
  footer: TemplateFooterStrings,
): string {
  const baseUrl = "{{base_url}}";
  const stepRows = strings.steps
    .map((s, i) =>
      feature(REFERRAL_STEP_EMOJIS[i] ?? "&#x2022;", s.title, s.desc, true),
    )
    .join("\n            ");

  const foot = footerForLocale(footer.receivedText, footer.unsubscribeLabel);

  return `${HEADER}
        <tr><td style="padding:36px 32px 16px;">
          <p style="margin:0 0 8px;font-size:48px;text-align:center;">&#x1F91D;</p>
          ${heading(strings.heading)}
          ${intro(strings.intro)}
          ${intro(strings.howItWorks)}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${stepRows}
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
            <tr><td style="padding:20px 24px;background:linear-gradient(135deg,#ecfdf5 0%,#d1fae5 100%);border-radius:12px;border:2px solid #10b981;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#065f46;text-transform:uppercase;letter-spacing:1px;">${strings.referralLinkLabel}</p>
              <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#0f172a;word-break:break-all;font-family:monospace;">{{referral_link}}</p>
              <p style="margin:0;font-size:12px;color:#065f46;">${strings.referralLinkHint}</p>
            </td></tr>
          </table>
          ${cta(strings.ctaLabel, `${baseUrl}/profile?section=referrals&utm_source=email&utm_medium=referral&utm_campaign=referral_program`)}
        </td></tr>
        ${divider()}
        ${tip(strings.tipText)}
${foot}`;
}
