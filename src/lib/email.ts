import { Resend } from "resend";
import { SignJWT, jwtVerify } from "jose";
import { getGlobalResendApiKey, countHoldings, generateUnsubscribeToken, getEmailTemplateBySlug, logEmailSend } from "@/lib/db";

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
  /** Override the default noreply sender (e.g. for personal trial emails). */
  from?: string;
  /** Skip List-Unsubscribe headers (e.g. verification or internal emails). */
  internal?: boolean;
  /** BCC recipients (e.g. Trustpilot AFS). */
  bcc?: string | string[];
}

export async function sendEmail(
  opts: SendEmailOptions,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const resend = await getResendClient();
  if (!resend) {
    console.warn("Resend API key not configured; skipping email.");
    return { success: true };
  }

  let html = opts.html;
  let text = opts.text || "";

  const headers: Record<string, string> = {
    "Reply-To": opts.replyTo || SUPPORT_EMAIL,
    ...opts.headers,
  };

  if (!opts.internal && opts.userId) {
    const unsubUrl = await generateUnsubscribeUrl(opts.userId);
    headers["List-Unsubscribe"] = `<${unsubUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
    html = html.replaceAll("{{unsubscribe_url}}", unsubUrl);
    if (text) text = text.replaceAll("{{unsubscribe_url}}", unsubUrl);
  } else if (!opts.internal) {
    const base = process.env.APP_BASE_URL || "https://trefolio.com";
    headers["List-Unsubscribe"] = `<${base}/unsubscribe>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }

  const plainText = text || htmlToPlainText(html);

  try {
    const { data, error } = await resend.emails.send({
      from: opts.from || getFromAddress(),
      to: opts.to,
      subject: opts.subject,
      html,
      text: plainText,
      headers,
      ...(opts.bcc ? { bcc: opts.bcc } : {}),
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
              ${emailLogoCell()}
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
  userId?: string,
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
        <p style="margin-top: 16px; font-size: 11px; color: #94a3b8; text-align: center;">
          <a href="{{unsubscribe_url}}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a> from email notifications
        </p>
      </div>`;

  const result = await sendEmail({
    to: email,
    subject: `Price Alert: ${alert.ticker} ${direction} ${alert.currency} ${alert.threshold}`,
    html,
    userId,
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
  userId?: string,
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
        <p style="margin-top: 16px; font-size: 11px; color: #94a3b8; text-align: center;">
          <a href="{{unsubscribe_url}}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a> from email notifications
        </p>
      </div>`;

  const result = await sendEmail({
    to: email,
    subject: `Price Alert: ${alert.ticker} ${direction} ${absPercent}% ${basisLabel}`,
    html,
    userId,
  });
  if (!result.success) console.error("Failed to send percent alert email:", result.error);
  return result;
}

// ---------------------------------------------------------------------------
// Unsubscribe URL
// ---------------------------------------------------------------------------

export async function generateUnsubscribeUrl(userId: string): Promise<string> {
  const base = process.env.APP_BASE_URL || "https://trefolio.com";
  const token = await generateUnsubscribeToken(userId);
  return `${base}/unsubscribe?token=${encodeURIComponent(token)}`;
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

function emailLogoCell(): string {
  const base = getBaseUrl();
  return `<td style="width:36px;height:36px;vertical-align:middle;">
                <img src="${base}/email-logo@2x.png" alt="" width="36" height="36" style="display:block;width:36px;height:36px;border-radius:8px;" />
              </td>`;
}

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
              ${emailLogoCell()}
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
${emailFooter(c.footer, utm("/profile", campaign), c.manage, "{{unsubscribe_url}}")}`;
}

export async function sendWelcomeEmail(
  email: string,
  displayName: string,
  locale: EmailLocale = "en",
  userId?: string,
): Promise<{ success: boolean; error?: string }> {
  if (isTestEmail(email)) return { success: true };

  const c = i18nWelcome[locale] ?? i18nWelcome.en;
  const result = await sendEmail({
    to: email,
    subject: c.subject,
    html: welcomeEmailHtml(displayName, locale),
    userId,
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
${emailFooter(c.footer, utm("/profile", campaign), c.manage, "{{unsubscribe_url}}")}`;
}

export async function sendBifolioUpgradeEmail(
  email: string,
  displayName: string,
  locale: EmailLocale = "en",
  userId?: string,
): Promise<{ success: boolean; error?: string }> {
  if (isTestEmail(email)) return { success: true };

  const c = i18nBifolio[locale] ?? i18nBifolio.en;
  const result = await sendEmail({
    to: email,
    subject: c.subject,
    html: bifolioUpgradeHtml(displayName, locale),
    userId,
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
${emailFooter(c.footer, utm("/profile", campaign), c.manage, "{{unsubscribe_url}}")}`;
}

export async function sendTrefolioUpgradeEmail(
  email: string,
  displayName: string,
  locale: EmailLocale = "en",
  userId?: string,
): Promise<{ success: boolean; error?: string }> {
  if (isTestEmail(email)) return { success: true };

  const c = i18nTrefolio[locale] ?? i18nTrefolio.en;
  const result = await sendEmail({
    to: email,
    subject: c.subject,
    html: trefolioUpgradeHtml(displayName, locale),
    userId,
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
  eventType: "new_subscription" | "plan_change" | "cancellation",
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

  const eventLabel =
    eventType === "new_subscription" ? "New Subscription"
    : eventType === "cancellation" ? "Subscription Cancelled"
    : "Plan Change";
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

// ---------------------------------------------------------------------------
// 6. 7-day Pro trial (transactional)
// ---------------------------------------------------------------------------

const TRIAL_FROM = "Marcos from trefolio <communications@trefolio.com>";

function trialInvitationHtml(
  displayName: string,
  activateUrl: string,
  _locale: EmailLocale,
): string {
  const name = displayName || "there";
  const campaign = "trial_invitation";
  const groups = [
    ["Data &amp; Analysis", ["Alpha Vantage premium data", "Fundamentals: income, balance sheet, cash flow", "Economic indicators dashboard"]],
    ["Intelligence", ["News feed with sentiment analysis", "Insider trades &amp; institutional holdings", "AI analysis: 30 calls/day, unlimited monthly"]],
    ["Advanced Tools", ["Sharpe ratio, max drawdown, volatility", "Full portfolio performance history", "Stock screener: 600+ stocks, 6 filters"]],
    ["Alerts &amp; Limits", ["WhatsApp &amp; device notifications", "Unlimited price alerts &amp; holdings", "Up to 5 portfolios"]],
  ]
    .map(([label, items]) => proFeatureGroup(label as string, items as string[]))
    .join("");
  return `${emailHeader("7-DAY PRO TRIAL")}
        <tr><td style="padding:36px 32px 16px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;text-align:center;">Your Pro trial is waiting</h1>
          <p style="margin:0 0 28px;font-size:15px;color:#475569;text-align:center;line-height:1.6;">Hi ${name}, you&rsquo;ve been building your portfolio on trefolio &mdash; now experience the full toolkit for 7 days, completely free.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
            ${groups}
          </table>
          <div style="height:12px;"></div>
          ${primaryCta("Activate your free trial", activateUrl)}
          <p style="margin:20px 0 0;font-size:13px;color:#64748b;text-align:center;line-height:1.5;">No credit card required. After 7 days, your account returns to the Free plan &mdash; no surprises.</p>
          <div style="margin-top:24px;padding-top:20px;border-top:1px solid #e2e8f0;">
            <p style="margin:0 0 4px;font-size:14px;color:#475569;line-height:1.6;">I built trefolio because I wanted a better way to track my own portfolio. I hope you&rsquo;ll enjoy having the full experience.</p>
            <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">Let me know what you think &mdash; just reply to this email.</p>
            <p style="margin:12px 0 0;font-size:14px;color:#0f172a;font-weight:600;">Marcos</p>
            <p style="margin:0;font-size:12px;color:#64748b;">Founder, trefolio</p>
          </div>
        </td></tr>
${emailFooter(
    "You received this email because you signed up for trefolio.",
    utm("/profile", campaign),
    "Manage email preferences",
    "{{unsubscribe_url}}",
  )}`;
}

export async function sendTrialInvitationEmail(
  email: string,
  displayName: string,
  token: string,
  locale: EmailLocale = "en",
  userId?: string,
): Promise<{ success: boolean; error?: string }> {
  if (isTestEmail(email)) return { success: true };

  const activateUrl = utm(`/trial/activate?token=${encodeURIComponent(token)}`, "trial_invitation");
  const html = trialInvitationHtml(displayName, activateUrl, locale);
  const subject = "Your 7-day Trefolio Pro trial is ready";

  const result = await sendEmail({
    to: email,
    subject,
    html,
    from: TRIAL_FROM,
    replyTo: "communications@trefolio.com",
    userId,
  });
  if (!result.success) console.error("Failed to send trial invitation email:", result.error);

  if (userId) {
    try {
      const tpl = await getEmailTemplateBySlug("trial-invitation");
      await logEmailSend({
        resendId: result.messageId || "",
        templateId: tpl?.id || "",
        userId,
        emailTo: email,
        subject,
        bodyHtml: html,
        bodyText: htmlToPlainText(html),
        status: result.success ? "sent" : "failed",
      });
    } catch (e) {
      console.error("[trial-invitation] Failed to log email send:", e);
    }
  }

  return result;
}

function growthBox(pct: number): string {
  const isPositive = pct > 0;
  const emoji = isPositive ? "&#x1F4A1;" : "&#x1F6E1;&#xFE0F;";
  const bg = isPositive ? "#f0fdf4" : "#fffbeb";
  const border = isPositive ? "#bbf7d0" : "#fde68a";
  const title = isPositive
    ? `Your portfolio grew ${pct}% during the trial`
    : `Markets shifted &mdash; your portfolio moved ${pct}% during the trial`;
  const desc = isPositive
    ? "With Pro, you could keep tracking detailed performance metrics and get AI insights on your next moves."
    : "With Pro, you&rsquo;d get AI alerts and deeper analytics to react faster to market movements.";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
            <tr><td style="padding:14px 16px;background:${bg};border-radius:10px;border:1px solid ${border};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                <td style="width:32px;font-size:20px;vertical-align:top;padding-top:2px;">${emoji}</td>
                <td style="padding-left:8px;">
                  <strong style="color:#0f172a;font-size:14px;">${title}</strong>
                  <p style="margin:4px 0 0;font-size:13px;color:#475569;line-height:1.4;">${desc}</p>
                </td>
              </tr></table>
            </td></tr>
          </table>`;
}

function trialExpiredHtml(displayName: string, _locale: EmailLocale, growthPct?: number): string {
  const name = displayName || "there";
  const campaign = "trial_expired";
  const growthHtml = growthPct != null ? growthBox(growthPct) : "";
  return `${emailHeader()}
        <tr><td style="padding:36px 32px 16px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;text-align:center;">Your Pro trial has ended</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;text-align:center;line-height:1.6;">Hi ${name}, your 7-day Trefolio Pro trial is over. Here&rsquo;s what you&rsquo;ll miss:</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${featureRow("&#x1F4CA;", "Advanced Analytics", "Sharpe ratio, max drawdown, volatility, and full growth history")}
            ${featureRow("&#x1F9E0;", "AI Analysis", "30 calls/day with deep stock insights and portfolio reviews")}
            ${featureRow("&#x1F4C8;", "Company Fundamentals", "Income statements, balance sheets, insider trades, and institutional holdings")}
            ${featureRow("&#x1F514;", "Premium Alerts", "WhatsApp notifications, unlimited alerts, and up to 5 portfolios")}
          </table>
          ${growthHtml}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;"><tr><td style="padding:14px 16px;background:#eff6ff;border-radius:10px;border:1px solid #bfdbfe;">
            <p style="margin:0;font-size:14px;color:#1e40af;text-align:center;line-height:1.5;">Plans start at &euro;4.99/month. Cancel anytime.</p>
          </td></tr></table>
          ${primaryCta("Subscribe to Trefolio Pro", utm("/pricing", campaign))}
          <div style="margin-top:24px;padding-top:20px;border-top:1px solid #e2e8f0;">
            <p style="margin:0 0 4px;font-size:14px;color:#475569;line-height:1.6;">I hope the trial gave you a real taste of what trefolio can do. If you have feedback, I&rsquo;d genuinely love to hear it.</p>
            <p style="margin:12px 0 0;font-size:14px;color:#0f172a;font-weight:600;">Marcos</p>
            <p style="margin:0;font-size:12px;color:#64748b;">Founder, trefolio</p>
          </div>
        </td></tr>
${emailFooter(
    "You received this email because you signed up for trefolio.",
    utm("/profile", campaign),
    "Manage email preferences",
    "{{unsubscribe_url}}",
  )}`;
}

export async function sendTrialExpiredEmail(
  email: string,
  displayName: string,
  locale: EmailLocale = "en",
  userId?: string,
  growthPct?: number,
): Promise<{ success: boolean; error?: string }> {
  if (isTestEmail(email)) return { success: true };

  const html = trialExpiredHtml(displayName, locale, growthPct);
  const subject = "Your Trefolio Pro trial has ended";

  const result = await sendEmail({
    to: email,
    subject,
    html,
    from: TRIAL_FROM,
    replyTo: "communications@trefolio.com",
    userId,
  });
  if (!result.success) console.error("Failed to send trial expired email:", result.error);

  if (userId) {
    try {
      const tpl = await getEmailTemplateBySlug("trial-expired");
      await logEmailSend({
        resendId: result.messageId || "",
        templateId: tpl?.id || "",
        userId,
        emailTo: email,
        subject,
        bodyHtml: html,
        bodyText: htmlToPlainText(html),
        status: result.success ? "sent" : "failed",
      });
    } catch (e) {
      console.error("[trial-expired] Failed to log email send:", e);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Trustpilot AFS — BCC triggers an automatic Trustpilot review invitation.
// Only sent to users who gave 4-5 stars on the satisfaction survey.
// ---------------------------------------------------------------------------

const TRUSTPILOT_AFS_EMAIL = "trefolio.com+8acd094c6c@invite.trustpilot.com";

const satisfactionThankYouCopy = {
  en: {
    subject: "Thank you for your feedback!",
    heading: "We're glad you're enjoying trefolio",
    body: "Your {{rating}}-star rating means a lot to our team. If you have a minute, sharing your experience on Trustpilot helps other investors discover trefolio.",
    cta: "Leave a Trustpilot Review",
    footer: "You received this because you submitted feedback on trefolio.",
    manage: "Manage preferences",
  },
  es: {
    subject: "¡Gracias por tu opinión!",
    heading: "Nos alegra que disfrutes trefolio",
    body: "Tu valoración de {{rating}} estrellas significa mucho para nuestro equipo. Si tienes un minuto, compartir tu experiencia en Trustpilot ayuda a otros inversores a descubrir trefolio.",
    cta: "Dejar una reseña en Trustpilot",
    footer: "Recibiste este correo porque enviaste tu opinión en trefolio.",
    manage: "Gestionar preferencias",
  },
} as const;

type AfsLocale = keyof typeof satisfactionThankYouCopy;

function satisfactionThankYouHtml(rating: number, locale: AfsLocale): string {
  const c = satisfactionThankYouCopy[locale] ?? satisfactionThankYouCopy.en;
  const campaign = "satisfaction_trustpilot";
  const trustpilotUrl = "https://www.trustpilot.com/evaluate/trefolio.app";
  const dashboardUrl = utm("/", campaign);
  const stars = Array.from({ length: 5 }, (_, i) =>
    `<span style="font-size:24px;color:${i < rating ? "#fbbf24" : "#cbd5e1"};">&#9733;</span>`
  ).join("");

  return `${emailHeader()}
        <tr><td style="padding:32px 32px 0;">
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0f172a;">${c.heading}</h1>
          <div style="text-align:center;margin:0 0 16px;">${stars}</div>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">${c.body.replace("{{rating}}", String(rating))}</p>
          ${primaryCta(c.cta, trustpilotUrl)}
        </td></tr>
${emailFooter(c.footer, dashboardUrl, c.manage, "{{unsubscribe_url}}")}`;
}

export async function sendSatisfactionTrustpilotEmail(
  email: string,
  rating: number,
  locale: EmailLocale = "en",
  userId?: string,
): Promise<{ success: boolean; error?: string }> {
  if (isTestEmail(email)) return { success: true };
  if (rating < 4) return { success: true };

  const afsLocale: AfsLocale = locale === "es" ? "es" : "en";
  const c = satisfactionThankYouCopy[afsLocale];
  const html = satisfactionThankYouHtml(rating, afsLocale);

  const result = await sendEmail({
    to: email,
    subject: c.subject,
    html,
    userId,
    bcc: TRUSTPILOT_AFS_EMAIL,
  });
  if (!result.success) console.error("Failed to send satisfaction Trustpilot email:", result.error);

  if (userId) {
    try {
      const tpl = await getEmailTemplateBySlug("satisfaction-trustpilot");
      await logEmailSend({
        resendId: result.messageId || "",
        templateId: tpl?.id || "",
        userId,
        emailTo: email,
        subject: c.subject,
        bodyHtml: html,
        bodyText: htmlToPlainText(html),
        status: result.success ? "sent" : "failed",
      });
    } catch (e) {
      console.error("[satisfaction-trustpilot] Failed to log email send:", e);
    }
  }

  return result;
}
