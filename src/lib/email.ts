import { Resend } from "resend";
import { SignJWT, jwtVerify } from "jose";
import { getGlobalResendApiKey, countHoldings } from "@/lib/db";

const VERIFICATION_TOKEN_TTL = 60 * 60 * 24; // 24 hours

const TEST_EMAIL_DOMAINS = ["test.example.com", "example.com"];

function isTestEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  if (TEST_EMAIL_DOMAINS.includes(domain)) return true;
  return isTreefolioTestEmail(email);
}

const TREFOLIO_TEST_PREFIX = "test+";
const TREFOLIO_TEST_DOMAIN = "trefolio.com";
export const TEST_VERIFICATION_TOKEN = "trefolio-test-verify-000";

export function isTreefolioTestEmail(email: string): boolean {
  const lower = email.toLowerCase();
  const [local, domain] = lower.split("@");
  return domain === TREFOLIO_TEST_DOMAIN && local.startsWith(TREFOLIO_TEST_PREFIX);
}

async function getResendClient(): Promise<Resend | null> {
  const dbKey = await getGlobalResendApiKey();
  const key = dbKey || process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function getSessionSecret(): string {
  return process.env.APP_SESSION_SECRET || "trefolio-dev-session-secret-change-me";
}

function getBaseUrl(): string {
  return process.env.APP_BASE_URL || "http://localhost:3000";
}

function getFromAddress(): string {
  return process.env.RESEND_FROM_ADDRESS || "trefolio <noreply@trefolio.com>";
}

export { getFromAddress };

const SUPPORT_EMAIL = "support@trefolio.com";

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<li>/gi, "- ")
    .replace(/<a[^>]+href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, "$2 ($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&mdash;/g, "—")
    .replace(/&copy;/g, "(c)")
    .replace(/&#x1F340;/g, "")
    .replace(/&#x[0-9A-Fa-f]+;/g, "")
    .replace(/&#\d+;/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ---------------------------------------------------------------------------
// Centralized send — ALL outbound email goes through this function.
// It guarantees: Reply-To, List-Unsubscribe (RFC 8058), plain-text part.
// ---------------------------------------------------------------------------

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  userId?: string;
  replyTo?: string;
  headers?: Record<string, string>;
  /** Skip List-Unsubscribe headers (e.g. verification or internal emails). */
  internal?: boolean;
}

export async function sendEmail(
  opts: SendEmailOptions,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const resend = await getResendClient();
  if (!resend) {
    console.warn("Resend API key not configured; skipping email.");
    return { success: true };
  }

  const plainText = opts.text || htmlToPlainText(opts.html);

  const headers: Record<string, string> = {
    "Reply-To": opts.replyTo || SUPPORT_EMAIL,
    ...opts.headers,
  };

  if (!opts.internal) {
    const base = process.env.APP_BASE_URL || "https://trefolio.com";
    const unsubUrl = opts.userId
      ? `${base}/unsubscribe?userId=${opts.userId}`
      : `${base}/unsubscribe`;
    headers["List-Unsubscribe"] = `<${unsubUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }

  try {
    const { data, error } = await resend.emails.send({
      from: getFromAddress(),
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: plainText,
      headers,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

export async function createVerificationToken(userId: string, email: string): Promise<string> {
  if (isTreefolioTestEmail(email)) return TEST_VERIFICATION_TOKEN;
  const secret = new TextEncoder().encode(getSessionSecret());
  return new SignJWT({ userId, email, purpose: "email_verification" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(`${VERIFICATION_TOKEN_TTL}s`)
    .sign(secret);
}

export function isTestVerificationToken(token: string): boolean {
  return token === TEST_VERIFICATION_TOKEN;
}

export async function verifyVerificationToken(
  token: string
): Promise<{ userId: string; email: string } | null> {
  try {
    const secret = new TextEncoder().encode(getSessionSecret());
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    if (payload.purpose !== "email_verification") return null;
    return {
      userId: String(payload.userId),
      email: String(payload.email),
    };
  } catch {
    return null;
  }
}

function verificationEmailHtml(verifyUrl: string, locale: EmailLocale = "en"): string {
  const s = verificationStrings[locale] ?? verificationStrings.en;
  return `<!DOCTYPE html>
<html lang="${locale}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#059669 0%,#10b981 100%);padding:32px 32px 28px;text-align:center;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr>
              <td style="width:36px;height:36px;background:#0f172a;border-radius:8px;text-align:center;vertical-align:middle;">
                <span style="color:#10b981;font-size:18px;font-weight:800;line-height:36px;">t</span>
              </td>
              <td style="padding-left:10px;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">trefolio</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:36px 32px 16px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;text-align:center;">${s.heading}</h1>
          <p style="margin:0 0 28px;font-size:15px;color:#475569;text-align:center;line-height:1.6;">${s.body}</p>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr><td align="center">
              <a href="${verifyUrl}" target="_blank" style="display:inline-block;padding:14px 36px;background-color:#10b981;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:10px;letter-spacing:0.2px;">${s.ctaLabel}</a>
            </td></tr>
          </table>
          <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.5;">${s.fallbackLink}</p>
          <p style="margin:6px 0 0;font-size:12px;color:#10b981;text-align:center;word-break:break-all;line-height:1.5;">
            <a href="${verifyUrl}" style="color:#10b981;text-decoration:underline;">${verifyUrl}</a>
          </p>
        </td></tr>
        <tr><td style="padding:0 32px;"><div style="border-top:1px solid #e2e8f0;margin:24px 0;"></div></td></tr>
        <tr><td style="padding:0 32px 32px;">
          <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;text-align:center;line-height:1.5;">${s.expiry}</p>
          <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.5;">${s.ignore}</p>
        </td></tr>
      </table>
      <p style="margin:24px 0 0;font-size:11px;color:#94a3b8;text-align:center;">
        &copy; ${new Date().getFullYear()} trefolio &mdash; Every portfolio deserves a bit of luck &#x1F340;
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendVerificationEmail(
  email: string,
  token: string,
  locale: EmailLocale = "en",
): Promise<{ success: boolean; error?: string }> {
  if (isTestEmail(email)) return { success: true };

  const verifyUrl = `${getBaseUrl()}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  const s = verificationStrings[locale] ?? verificationStrings.en;

  const result = await sendEmail({
    to: email,
    subject: s.subject,
    html: verificationEmailHtml(verifyUrl, locale),
    internal: true,
  });
  if (!result.success) console.error("Failed to send verification email:", result.error);
  return result;
}

export async function sendAlertEmail(
  email: string,
  alert: { ticker: string; name: string; condition: string; threshold: number; currentPrice: number; currency: string },
  locale: EmailLocale = "en",
): Promise<{ success: boolean; error?: string }> {
  if (isTestEmail(email)) return { success: true };

  const s = thresholdAlertStrings[locale] ?? thresholdAlertStrings.en;
  const direction = alert.condition === "above" ? s.roseAbove : s.droppedBelow;
  const dashboardUrl = `${getBaseUrl()}/`;
  const body = s.bodyTemplate
    .replace("{{name}}", `<strong>${alert.name || alert.ticker}</strong>`)
    .replace("{{ticker}}", alert.ticker)
    .replace("{{direction}}", direction)
    .replace("{{currency}}", alert.currency)
    .replace("{{threshold}}", `<strong>${alert.currency} ${alert.threshold.toFixed(2)}</strong>`);

  const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
        <h2 style="color: #10b981;">${s.heading}</h2>
        <p style="font-size: 16px;">${body}</p>
        <p style="font-size: 18px; padding: 16px; background: #f0fdf4; border-radius: 8px; text-align: center;">${s.currentPriceLabel} <strong>${alert.currency} ${alert.currentPrice.toFixed(2)}</strong></p>
        <a href="${dashboardUrl}" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #10b981; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600;">${s.ctaLabel}</a>
        <p style="margin-top: 24px; font-size: 13px; color: #64748b;">${s.deactivatedNotice}</p>
      </div>`;

  const result = await sendEmail({
    to: email,
    subject: `Price Alert: ${alert.ticker} ${direction} ${alert.currency} ${alert.threshold}`,
    html,
  });
  if (!result.success) console.error("Failed to send alert email:", result.error);
  return result;
}

export async function sendPercentAlertEmail(
  email: string,
  alert: {
    ticker: string;
    name: string;
    currentPrice: number;
    currency: string;
    percentChange: number;
    percentBasis: "daily" | "purchase";
    isPortfolioWide: boolean;
  },
  locale: EmailLocale = "en",
): Promise<{ success: boolean; error?: string }> {
  if (isTestEmail(email)) return { success: true };

  const s = percentAlertStrings[locale] ?? percentAlertStrings.en;
  const direction = alert.percentChange >= 0 ? s.up : s.down;
  const absPercent = Math.abs(alert.percentChange).toFixed(2);
  const basisLabel = alert.percentBasis === "daily" ? s.today : s.sincePurchase;
  const dashboardUrl = `${getBaseUrl()}/`;

  const bgColor = alert.percentChange >= 0 ? "#f0fdf4" : "#fef2f2";
  const textColor = alert.percentChange >= 0 ? "#16a34a" : "#dc2626";
  const directionWithPercent = `<span style="color: ${textColor}; font-weight: 700;">${direction} ${absPercent}%</span>`;
  const body = s.bodyTemplate
    .replace("{{name}}", `<strong>${alert.name || alert.ticker}</strong>`)
    .replace("{{ticker}}", alert.ticker)
    .replace("{{directionWithPercent}}", directionWithPercent)
    .replace("{{basis}}", basisLabel);

  const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
        <h2 style="color: #10b981;">${s.heading}</h2>
        <p style="font-size: 16px;">${body}</p>
        <p style="font-size: 18px; padding: 16px; background: ${bgColor}; border-radius: 8px; text-align: center;">
          ${s.currentPriceLabel} <strong>${alert.currency} ${alert.currentPrice.toFixed(2)}</strong>
        </p>
        ${alert.isPortfolioWide ? `<p style="font-size: 13px; color: #64748b;">${s.portfolioWideNotice}</p>` : ""}
        <a href="${dashboardUrl}" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #10b981; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600;">${s.ctaLabel}</a>
        <p style="margin-top: 24px; font-size: 13px; color: #64748b;">${alert.isPortfolioWide ? s.activeNotice : s.deactivatedNotice}</p>
      </div>`;

  const result = await sendEmail({
    to: email,
    subject: `Price Alert: ${alert.ticker} ${direction} ${absPercent}% ${basisLabel}`,
    html,
  });
  if (!result.success) console.error("Failed to send percent alert email:", result.error);
  return result;
}

// ---------------------------------------------------------------------------
// Unsubscribe token
// ---------------------------------------------------------------------------

const UNSUBSCRIBE_TOKEN_TTL = 60 * 60 * 24 * 365; // 1 year

export async function createUnsubscribeToken(userId: string): Promise<string> {
  const secret = new TextEncoder().encode(getSessionSecret());
  return new SignJWT({ userId, purpose: "email_unsubscribe" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(`${UNSUBSCRIBE_TOKEN_TTL}s`)
    .sign(secret);
}

export async function verifyUnsubscribeToken(token: string): Promise<string | null> {
  try {
    const secret = new TextEncoder().encode(getSessionSecret());
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    if (payload.purpose !== "email_unsubscribe") return null;
    return String(payload.userId);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Shared email layout helpers
// ---------------------------------------------------------------------------

import type { EmailLocale } from "./email-i18n";
import {
  welcomeCopy as i18nWelcome,
  bifolioCopy as i18nBifolio,
  trefolioCopy as i18nTrefolio,
  resolveIntro,
  getEmailLocale,
} from "./email-i18n";
import {
  verificationStrings,
  thresholdAlertStrings,
  percentAlertStrings,
} from "./email-i18n/alert-strings";
export type { EmailLocale } from "./email-i18n";
export { getEmailLocale } from "./email-i18n";

function emailHeader(tierBadge?: string): string {
  const badge = tierBadge
    ? `<p style="margin:12px 0 0;color:rgba(255,255,255,0.9);font-size:13px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;">${tierBadge}</p>`
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#059669 0%,#10b981 100%);padding:32px 32px 28px;text-align:center;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr>
              <td style="width:36px;height:36px;background:#0f172a;border-radius:8px;text-align:center;vertical-align:middle;">
                <span style="color:#10b981;font-size:18px;font-weight:800;line-height:36px;">t</span>
              </td>
              <td style="padding-left:10px;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">trefolio</td>
            </tr>
          </table>${badge}
        </td></tr>`;
}

function emailFooter(footerText: string, manageUrl: string, manageLabel: string, unsubscribeUrl?: string): string {
  const unsubLink = unsubscribeUrl
    ? `<p style="margin:8px 0 0;font-size:11px;color:#94a3b8;text-align:center;line-height:1.5;">
            <a href="${unsubscribeUrl}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a> from email notifications
          </p>`
    : "";
  return `        <tr><td style="padding:0 32px;"><div style="border-top:1px solid #e2e8f0;margin:24px 0;"></div></td></tr>
        <tr><td style="padding:0 32px 32px;">
          <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.5;">
            ${footerText} <a href="${manageUrl}" style="color:#94a3b8;text-decoration:underline;">${manageLabel}</a>
          </p>${unsubLink}
        </td></tr>
      </table>
      <p style="margin:24px 0 0;font-size:11px;color:#94a3b8;text-align:center;">
        &copy; ${new Date().getFullYear()} trefolio &mdash; Every portfolio deserves a bit of luck &#x1F340;
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}

function primaryCta(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr><td align="center">
              <a href="${url}" target="_blank" style="display:inline-block;padding:14px 36px;background-color:#10b981;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:10px;letter-spacing:0.2px;">${label}</a>
            </td></tr>
          </table>`;
}

function secondaryCta(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:12px;">
            <tr><td align="center">
              <a href="${url}" target="_blank" style="display:inline-block;padding:10px 24px;background-color:transparent;color:#10b981;font-size:14px;font-weight:600;text-decoration:none;border:1.5px solid #10b981;border-radius:10px;">${label}</a>
            </td></tr>
          </table>`;
}

function featureRow(emoji: string, title: string, desc: string, borderLeft = false): string {
  const borderStyle = borderLeft ? "border-left:4px solid #10b981;" : "";
  return `<tr><td style="padding:12px 16px;background:#f0fdf4;border-radius:10px;${borderStyle}">
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

function utm(path: string, campaign: string): string {
  const base = getBaseUrl();
  const separator = path.includes("?") ? "&" : "?";
  return `${base}${path}${separator}utm_source=email&utm_medium=transactional&utm_campaign=${campaign}`;
}

// ---------------------------------------------------------------------------
// 1. Welcome email (35 European languages via email-i18n)
// ---------------------------------------------------------------------------

function welcomeEmailHtml(displayName: string, locale: EmailLocale): string {
  const c = i18nWelcome[locale] ?? i18nWelcome.en;
  const name = displayName || c.fallbackName;
  const campaign = "welcome";
  return `${emailHeader()}
        <tr><td style="padding:36px 32px 16px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;text-align:center;">${c.heading}</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;text-align:center;line-height:1.6;">${resolveIntro(c.intro, name)}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${featureRow("&#x1F4C8;", c.f1Title, c.f1Desc)}
            ${featureRow("&#x1F4B0;", c.f2Title, c.f2Desc)}
            ${featureRow("&#x1F916;", c.f3Title, c.f3Desc)}
            ${featureRow("&#x1F4E5;", c.f4Title, c.f4Desc)}
          </table>
          ${primaryCta(c.ctaPrimary, utm("/import", campaign))}
          ${secondaryCta(c.ctaSecondary, utm("/", campaign))}
        </td></tr>
        <tr><td style="padding:0 32px;"><div style="border-top:1px solid #e2e8f0;margin:24px 0;"></div></td></tr>
        <tr><td style="padding:0 32px 12px;">
          <p style="margin:0;font-size:13px;color:#64748b;text-align:center;line-height:1.5;">
            <strong style="color:#475569;">${c.tipLabel}</strong> ${c.tip} <a href="${utm("/profile", campaign)}" style="color:#10b981;text-decoration:underline;">${c.tipLink}</a>.
          </p>
        </td></tr>
${emailFooter(c.footer, utm("/profile", campaign), c.manage)}`;
}

export async function sendWelcomeEmail(
  email: string,
  displayName: string,
  locale: EmailLocale = "en",
): Promise<{ success: boolean; error?: string }> {
  if (isTestEmail(email)) return { success: true };

  const c = i18nWelcome[locale] ?? i18nWelcome.en;
  const result = await sendEmail({
    to: email,
    subject: c.subject,
    html: welcomeEmailHtml(displayName, locale),
  });
  if (!result.success) console.error("Failed to send welcome email:", result.error);
  return result;
}

// ---------------------------------------------------------------------------
// 2. Bifolio (starter) upgrade email (35 European languages)
// ---------------------------------------------------------------------------

function bifolioUpgradeHtml(displayName: string, locale: EmailLocale): string {
  const c = i18nBifolio[locale] ?? i18nBifolio.en;
  const name = displayName || c.fallbackName;
  const campaign = "bifolio_upgrade";
  return `${emailHeader("Bifolio")}
        <tr><td style="padding:36px 32px 16px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;text-align:center;">${c.heading}</h1>
          <p style="margin:0 0 28px;font-size:15px;color:#475569;text-align:center;line-height:1.6;">${resolveIntro(c.intro, name)}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${featureRow("&#x1F517;", c.f1Title, c.f1Desc, true)}
            ${featureRow("&#x1F4CA;", c.f2Title, c.f2Desc, true)}
            ${featureRow("&#x1F514;", c.f3Title, c.f3Desc, true)}
            ${featureRow("&#x1F4C8;", c.f4Title, c.f4Desc, true)}
          </table>
          ${primaryCta(c.ctaPrimary, utm("/tools/alerts", campaign))}
          ${secondaryCta(c.ctaSecondary, utm("/profile", campaign))}
        </td></tr>
        <tr><td style="padding:0 32px;"><div style="border-top:1px solid #e2e8f0;margin:24px 0;"></div></td></tr>
        <tr><td style="padding:0 32px 12px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:14px 16px;background:#fefce8;border-radius:10px;border:1px solid #fde68a;">
            <p style="margin:0;font-size:13px;color:#92400e;text-align:center;line-height:1.5;">
              ${c.upsell} <a href="${utm("/profile", campaign)}" style="color:#b45309;text-decoration:underline;font-weight:600;">${c.upsellLink}</a>
            </p>
          </td></tr></table>
        </td></tr>
${emailFooter(c.footer, utm("/profile", campaign), c.manage)}`;
}

export async function sendBifolioUpgradeEmail(
  email: string,
  displayName: string,
  locale: EmailLocale = "en",
): Promise<{ success: boolean; error?: string }> {
  if (isTestEmail(email)) return { success: true };

  const c = i18nBifolio[locale] ?? i18nBifolio.en;
  const result = await sendEmail({
    to: email,
    subject: c.subject,
    html: bifolioUpgradeHtml(displayName, locale),
  });
  if (!result.success) console.error("Failed to send Bifolio upgrade email:", result.error);
  return result;
}

// ---------------------------------------------------------------------------
// 3. Trefolio Pro upgrade email
// ---------------------------------------------------------------------------

function proFeatureGroup(label: string, items: string[]): string {
  const checks = items.map((i) => `&#x2705; ${i}`).join("<br>");
  return `<tr><td style="padding:4px 0 6px;"><p style="margin:0;font-size:11px;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:1px;">${label}</p></td></tr>
          <tr><td style="padding:10px 16px;background:#f0fdf4;border-radius:10px;border-left:4px solid #10b981;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-size:13px;color:#0f172a;line-height:1.7;">${checks}</td></tr></table>
          </td></tr>
          <tr><td style="height:12px;"></td></tr>`;
}

// ---------------------------------------------------------------------------
// 3. Trefolio Pro upgrade email (35 European languages)
// ---------------------------------------------------------------------------

function trefolioUpgradeHtml(displayName: string, locale: EmailLocale): string {
  const c = i18nTrefolio[locale] ?? i18nTrefolio.en;
  const name = displayName || c.fallbackName;
  const campaign = "trefolio_upgrade";
  const groups = [
    [c.g1Label, c.g1Items],
    [c.g2Label, c.g2Items],
    [c.g3Label, c.g3Items],
    [c.g4Label, c.g4Items],
    [c.g5Label, c.g5Items],
  ].map(([label, items]) => proFeatureGroup(label as string, items as string[])).join("");
  return `${emailHeader("&#x2B50; Trefolio Pro &#x2B50;")}
        <tr><td style="padding:36px 32px 16px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;text-align:center;">${c.heading}</h1>
          <p style="margin:0 0 28px;font-size:15px;color:#475569;text-align:center;line-height:1.6;">${resolveIntro(c.intro, name)}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
            ${groups}
          </table>
          <div style="height:12px;"></div>
          ${primaryCta(c.ctaPrimary, utm("/", campaign))}
          ${secondaryCta(c.ctaSecondary, utm("/", campaign))}
        </td></tr>
        <tr><td style="padding:0 32px;"><div style="border-top:1px solid #e2e8f0;margin:24px 0;"></div></td></tr>
        <tr><td style="padding:0 32px 12px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:14px 16px;background:#eff6ff;border-radius:10px;border:1px solid #bfdbfe;">
            <p style="margin:0;font-size:13px;color:#1e40af;text-align:center;line-height:1.5;">${c.community}</p>
          </td></tr></table>
        </td></tr>
${emailFooter(c.footer, utm("/profile", campaign), c.manage)}`;
}

export async function sendTrefolioUpgradeEmail(
  email: string,
  displayName: string,
  locale: EmailLocale = "en",
): Promise<{ success: boolean; error?: string }> {
  if (isTestEmail(email)) return { success: true };

  const c = i18nTrefolio[locale] ?? i18nTrefolio.en;
  const result = await sendEmail({
    to: email,
    subject: c.subject,
    html: trefolioUpgradeHtml(displayName, locale),
  });
  if (!result.success) console.error("Failed to send Trefolio upgrade email:", result.error);
  return result;
}

// ---------------------------------------------------------------------------
// 4. Admin new customer notification (production only)
// ---------------------------------------------------------------------------

const ADMIN_NOTIFICATION_EMAIL = "info@trefolio.com";

export async function sendAdminNewCustomerNotification(
  userEmail: string,
  displayName: string,
  authProvider: string,
): Promise<void> {
  if (process.env.NODE_ENV !== "production") return;

  const providerLabel = authProvider.charAt(0).toUpperCase() + authProvider.slice(1);

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 0;">
      <h2 style="color:#10b981;margin:0 0 16px;">trefolio — New Customer</h2>
      <table style="width:100%;border-collapse:collapse;font-size:15px;">
        <tr><td style="padding:8px 0;color:#64748b;">Name</td><td style="padding:8px 0;font-weight:600;">${displayName || "—"}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Email</td><td style="padding:8px 0;">${userEmail}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Auth Provider</td><td style="padding:8px 0;">${providerLabel}</td></tr>
      </table>
    </div>`;

  const result = await sendEmail({
    to: ADMIN_NOTIFICATION_EMAIL,
    subject: `[trefolio] New Customer: ${displayName || userEmail}`,
    html,
    internal: true,
  });
  if (!result.success) console.error("Failed to send admin new customer notification:", result.error);
}

// ---------------------------------------------------------------------------
// 5. Admin subscription notification (production only)
// ---------------------------------------------------------------------------

export async function sendAdminSubscriptionNotification(
  userId: string,
  userEmail: string,
  displayName: string,
  newPlan: string,
  eventType: "new_subscription" | "plan_change",
): Promise<void> {
  if (process.env.NODE_ENV !== "production") return;

  let holdingCount = 0;
  try {
    holdingCount = await countHoldings(userId);
  } catch {
    // non-critical — send notification even if count lookup fails
  }

  const hasPortfolio = holdingCount > 0;
  const portfolioLine = hasPortfolio
    ? `<strong>${holdingCount}</strong> holding${holdingCount === 1 ? "" : "s"} in portfolio`
    : "No holdings yet";

  const eventLabel = eventType === "new_subscription" ? "New Subscription" : "Plan Change";
  const planLabel = newPlan.charAt(0).toUpperCase() + newPlan.slice(1);

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 0;">
      <h2 style="color:#10b981;margin:0 0 16px;">trefolio — ${eventLabel}</h2>
      <table style="width:100%;border-collapse:collapse;font-size:15px;">
        <tr><td style="padding:8px 0;color:#64748b;">User</td><td style="padding:8px 0;font-weight:600;">${displayName || "—"}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Email</td><td style="padding:8px 0;">${userEmail}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">New Plan</td><td style="padding:8px 0;font-weight:600;">${planLabel}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Portfolio</td><td style="padding:8px 0;">${portfolioLine}</td></tr>
      </table>
    </div>`;

  const result = await sendEmail({
    to: ADMIN_NOTIFICATION_EMAIL,
    subject: `[trefolio] ${eventLabel}: ${displayName || userEmail} → ${planLabel}`,
    html,
    internal: true,
  });
  if (!result.success) console.error("Failed to send admin subscription notification:", result.error);
}
