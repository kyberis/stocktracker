import { Resend } from "resend";
import { SignJWT, jwtVerify } from "jose";
import {
  findUserByEmail,
  getGlobalResendApiKey,
  countHoldings,
  generateUnsubscribeToken,
  getEmailTemplateBySlug,
  getUserSettings,
  logEmailSend,
  checkAndIncrementRateLimit,
} from "@/lib/db";
import { isEmailNodeEnabled } from "@/lib/email-flows/toggles";
import { trackExternalProvider } from "@/lib/traffic/provider-track";

const VERIFICATION_TOKEN_TTL = 60 * 60 * 24; // 24 hours
const ACCOUNT_DELETION_TOKEN_TTL = 60 * 15; // 15 minutes — short-lived, destructive action
const ACCOUNT_DELETION_EMAIL_COOLDOWN_SECONDS = 60 * 5; // 5 minutes between resends per user

const TEST_EMAIL_DOMAINS = ["test.example.com", "example.com"];

function isTestEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  if (TEST_EMAIL_DOMAINS.includes(domain)) return true;
  return isTreefolioTestEmail(email);
}

/** True for synthetic/E2E accounts that should not receive cron work or outbound mail. */
export function isTestAccountEmail(email: string): boolean {
  return isTestEmail(email);
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
  /**
   * When true, send even if the user turned off marketing/template emails.
   * Use for verification, alerts, billing/support confirmations, and similar transactional mail.
   */
  transactional?: boolean;
  /** BCC recipients (e.g. Trustpilot AFS). */
  bcc?: string | string[];
  /** Email Flows node id — when set, respects the admin on/off toggle. */
  automationKey?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  /** User opted out of marketing/template emails; nothing was sent to Resend. */
  suppressed?: boolean;
}

/** Profile / one-click unsubscribe: allowed to receive marketing & template email (digests, campaigns). */
export async function isMarketingEmailAllowed(userId: string): Promise<boolean> {
  const settings = await getUserSettings(userId);
  return settings.emailNotificationsEnabled;
}

export async function sendEmail(opts: SendEmailOptions): Promise<SendEmailResult> {
  if (opts.automationKey) {
    try {
      if (!(await isEmailNodeEnabled(opts.automationKey))) {
        return { success: true, suppressed: true };
      }
    } catch (err) {
      console.error("[sendEmail] email node toggle check failed:", err);
    }
  }

  // Marketing/template opt-out (user_settings.email_notifications_enabled) applies to every
  // subscription tier (free, starter, pro). Plan does not bypass unsubscribe.
  let recipientUserId = opts.userId;
  if (!opts.internal && !opts.transactional && !recipientUserId && typeof opts.to === "string") {
    const u = await findUserByEmail(opts.to.trim());
    recipientUserId = u?.id;
  }

  // Must run before the Resend check so missing API keys do not skip unsubscribe.
  if (!opts.internal && !opts.transactional && recipientUserId) {
    const settings = await getUserSettings(recipientUserId);
    if (!settings.emailNotificationsEnabled) {
      return { success: true, suppressed: true };
    }
  }

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

  const listUnsubscribeUserId = opts.internal || opts.transactional ? opts.userId : (recipientUserId ?? opts.userId);
  if (!opts.internal && listUnsubscribeUserId) {
    const unsubUrl = await generateUnsubscribeUrl(listUnsubscribeUserId);
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
    trackExternalProvider("resend");
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

/**
 * Deletion-confirmation token for users with no usable password (OAuth/passkey
 * signups not yet migrated to the IdP). Scoped with its own `purpose` claim so
 * it can never be replayed against email verification (or vice versa), and a
 * short TTL since it authorizes a destructive action. No test-email
 * short-circuit — unlike createVerificationToken, this must never return a
 * predictable constant.
 */
export async function createAccountDeletionToken(userId: string, email: string): Promise<string> {
  const secret = new TextEncoder().encode(getSessionSecret());
  return new SignJWT({ userId, email, purpose: "account_deletion" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(`${ACCOUNT_DELETION_TOKEN_TTL}s`)
    .sign(secret);
}

export async function verifyAccountDeletionToken(
  token: string
): Promise<{ userId: string; email: string } | null> {
  try {
    const secret = new TextEncoder().encode(getSessionSecret());
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    if (payload.purpose !== "account_deletion") return null;
    return {
      userId: String(payload.userId),
      email: String(payload.email),
    };
  } catch {
    return null;
  }
}

/**
 * Per-user send cooldown backed by the shared `rate_limits` table (Turso), not
 * in-memory — must hold across serverless instances/cold starts. Returns
 * false if a deletion-confirmation email was already sent within the last
 * ACCOUNT_DELETION_EMAIL_COOLDOWN_SECONDS.
 */
export async function canSendAccountDeletionEmail(userId: string): Promise<boolean> {
  const windowKey = String(Math.floor(Date.now() / 1000 / ACCOUNT_DELETION_EMAIL_COOLDOWN_SECONDS));
  const { allowed } = await checkAndIncrementRateLimit(
    userId,
    "account_deletion_email",
    1,
    windowKey,
  );
  return allowed;
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
    automationKey: "verify",
  });
  if (!result.success) console.error("Failed to send verification email:", result.error);
  return result;
}

interface AccountDeletionStrings {
  subject: string;
  heading: string;
  body: string;
  ctaLabel: string;
  fallbackLink: string;
  expiry: string;
  ignore: string;
}

const accountDeletionStrings: Record<string, AccountDeletionStrings> = {
  en: {
    subject: "Confirm account deletion — trefolio",
    heading: "Confirm you want to delete your account",
    body: "We received a request to permanently delete your trefolio account and all its data. This can't be undone. Click below to confirm.",
    ctaLabel: "Delete my account",
    fallbackLink: "Or copy and paste this link into your browser:",
    expiry: "This link expires in 15 minutes.",
    ignore: "If you didn't request this, you can safely ignore this email — your account will not be deleted.",
  },
  es: {
    subject: "Confirma la eliminaci&#243;n de tu cuenta — trefolio",
    heading: "Confirma que quieres eliminar tu cuenta",
    body: "Hemos recibido una solicitud para eliminar permanentemente tu cuenta de trefolio y todos sus datos. Esta acci&#243;n no se puede deshacer. Haz clic abajo para confirmar.",
    ctaLabel: "Eliminar mi cuenta",
    fallbackLink: "O copia y pega este enlace en tu navegador:",
    expiry: "Este enlace caduca en 15 minutos.",
    ignore: "Si no has solicitado esto, puedes ignorar este correo sin problema — tu cuenta no ser&#225; eliminada.",
  },
};

function accountDeletionEmailHtml(confirmUrl: string, locale: EmailLocale = "en"): string {
  const s = accountDeletionStrings[locale] ?? accountDeletionStrings.en;
  return `<!DOCTYPE html>
<html lang="${locale}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#b91c1c 0%,#ef4444 100%);padding:32px 32px 28px;text-align:center;">
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
              <a href="${confirmUrl}" target="_blank" style="display:inline-block;padding:14px 36px;background-color:#dc2626;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:10px;letter-spacing:0.2px;">${s.ctaLabel}</a>
            </td></tr>
          </table>
          <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.5;">${s.fallbackLink}</p>
          <p style="margin:6px 0 0;font-size:12px;color:#dc2626;text-align:center;word-break:break-all;line-height:1.5;">
            <a href="${confirmUrl}" style="color:#dc2626;text-decoration:underline;">${confirmUrl}</a>
          </p>
        </td></tr>
        <tr><td style="padding:0 32px;"><div style="border-top:1px solid #e2e8f0;margin:24px 0;"></div></td></tr>
        <tr><td style="padding:0 32px 32px;">
          <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;text-align:center;line-height:1.5;">${s.expiry}</p>
          <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.5;">${s.ignore}</p>
        </td></tr>
      </table>
      <p style="margin:24px 0 0;font-size:11px;color:#94a3b8;text-align:center;">
        &copy; ${new Date().getFullYear()} trefolio
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Sends the deletion-confirmation link for users with no usable password
 * (see createAccountDeletionToken). Requires clicking through to a page that
 * requires an explicit button press — never auto-confirms on link open — so
 * mail-client link-prefetchers can't trigger deletion by themselves.
 */
export async function sendAccountDeletionEmail(
  email: string,
  token: string,
  locale: EmailLocale = "en",
): Promise<{ success: boolean; error?: string }> {
  if (isTestEmail(email)) return { success: true };

  const confirmUrl = `${getBaseUrl()}/delete-account/confirm?token=${encodeURIComponent(token)}`;
  const s = accountDeletionStrings[locale] ?? accountDeletionStrings.en;

  const result = await sendEmail({
    to: email,
    subject: s.subject,
    html: accountDeletionEmailHtml(confirmUrl, locale),
    internal: true,
    automationKey: "account-delete",
  });
  if (!result.success) console.error("Failed to send account deletion email:", result.error);
  return result;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderAlertHeadlinesHtml(
  headlines: Array<{ title: string; source: string; url: string }>,
  locale: string,
): string {
  if (headlines.length === 0) return "";
  const s = thresholdAlertStrings[locale] ?? thresholdAlertStrings.en;
  const heading = s.headlinesHeading ?? thresholdAlertStrings.en.headlinesHeading ?? "Recent headlines";
  const disclaimer =
    s.headlinesDisclaimer ??
    thresholdAlertStrings.en.headlinesDisclaimer ??
    "Headlines are for context only and are not investment advice.";
  const items = headlines
    .map((h) => {
      const title = escapeHtml(h.title);
      const source = h.source ? ` <span style="color:#94a3b8;">(${escapeHtml(h.source)})</span>` : "";
      return `<li style="margin:0 0 8px;"><a href="${escapeHtml(h.url)}" style="color:#0f766e;text-decoration:underline;">${title}</a>${source}</li>`;
    })
    .join("");
  return `
        <div style="margin-top: 20px; padding: 14px 16px; background: #f8fafc; border-radius: 8px;">
          <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #334155;">${heading}</p>
          <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #334155;">${items}</ul>
          <p style="margin: 10px 0 0; font-size: 11px; color: #94a3b8;">${disclaimer}</p>
        </div>`;
}

export async function sendAlertEmail(
  email: string,
  alert: {
    ticker: string;
    name: string;
    condition: string;
    threshold: number;
    currentPrice: number;
    currency: string;
    headlines?: Array<{ title: string; source: string; url: string }>;
  },
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
  const headlinesHtml = renderAlertHeadlinesHtml(alert.headlines ?? [], locale);

  const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
        <h2 style="color: #10b981;">${s.heading}</h2>
        <p style="font-size: 16px;">${body}</p>
        <p style="font-size: 18px; padding: 16px; background: #f0fdf4; border-radius: 8px; text-align: center;">${s.currentPriceLabel} <strong>${alert.currency} ${alert.currentPrice.toFixed(2)}</strong></p>
        ${headlinesHtml}
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
    transactional: true,
    automationKey: "price-alert",
  });
  if (!result.success) console.error("Failed to send alert email:", result.error);
  return result;
}

/**
 * One-time activation nudge: the first time a newly-connected broker sync
 * produces holdings. Sent by the snaptrade-sync cron via
 * sendFirstSyncCompleteHoldingsNotification, at most once per connection
 * (see claimFirstSyncNotification). Must stay transactional — this fires
 * shortly after a user's very first broker connection, and a silent
 * suppression here would be the worst possible outcome for an
 * activation-critical email.
 */
export async function sendFirstSyncCompleteEmail(
  email: string,
  data: { positionCount: number },
  locale: EmailLocale = "en",
  userId?: string,
): Promise<{ success: boolean; error?: string }> {
  if (isTestEmail(email)) return { success: true };

  const s = firstSyncCompleteStrings[locale] ?? firstSyncCompleteStrings.en;
  const dashboardUrl = `${getBaseUrl()}/`;
  const body = s.bodyTemplate.replace("{{count}}", String(data.positionCount));

  const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
        <h2 style="color: #10b981;">${s.heading}</h2>
        <p style="font-size: 16px;">${body}</p>
        <a href="${dashboardUrl}" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #10b981; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600;">${s.ctaLabel}</a>
        <p style="margin-top: 16px; font-size: 11px; color: #94a3b8; text-align: center;">
          <a href="{{unsubscribe_url}}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a> from email notifications
        </p>
      </div>`;

  const result = await sendEmail({
    to: email,
    subject: s.subject,
    html,
    userId,
    transactional: true,
    automationKey: "first-sync",
  });
  if (!result.success) console.error("Failed to send first-sync-complete email:", result.error);
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
    headlines?: Array<{ title: string; source: string; url: string }>;
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

  const headlinesHtml = renderAlertHeadlinesHtml(alert.headlines ?? [], locale);

  const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
        <h2 style="color: #10b981;">${s.heading}</h2>
        <p style="font-size: 16px;">${body}</p>
        <p style="font-size: 18px; padding: 16px; background: ${bgColor}; border-radius: 8px; text-align: center;">
          ${s.currentPriceLabel} <strong>${alert.currency} ${alert.currentPrice.toFixed(2)}</strong>
        </p>
        ${alert.isPortfolioWide ? `<p style="font-size: 13px; color: #64748b;">${s.portfolioWideNotice}</p>` : ""}
        ${headlinesHtml}
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
    transactional: true,
    automationKey: "percent-alert",
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
import { firstSyncCompleteStrings } from "./email-i18n/first-sync-strings";
import { getMembershipGrantStrings } from "./email-i18n/membership-grant-copy";
import { resolveIdpMembershipGrantActivateUrl, resolveIdpTrialActivateUrl } from "./idp/config";
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
    automationKey: "welcome",
  });
  if (!result.success) console.error("Failed to send welcome email:", result.error);
  return result;
}

// ---------------------------------------------------------------------------
// 2. trefolio (starter) upgrade email (35 European languages)
// ---------------------------------------------------------------------------

function bifolioUpgradeHtml(displayName: string, locale: EmailLocale): string {
  const c = i18nBifolio[locale] ?? i18nBifolio.en;
  const name = displayName || c.fallbackName;
  const campaign = "bifolio_upgrade";
  return `${emailHeader()}
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
    automationKey: "upgrade-bifolio",
  });
  if (!result.success) console.error("Failed to send trefolio upgrade email:", result.error);
  return result;
}

// ---------------------------------------------------------------------------
// 3. trefolio upgrade email
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
// 3. trefolio upgrade email (35 European languages)
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
  return `${emailHeader()}
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
    automationKey: "upgrade-trefolio",
  });
  if (!result.success) console.error("Failed to send trefolio upgrade email:", result.error);
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
): Promise<SendEmailResult> {
  if (isTestEmail(email)) return { success: true };

  const activateUrl =
    resolveIdpTrialActivateUrl(token) ??
    utm(`/trial/activate?token=${encodeURIComponent(token)}`, "trial_invitation");
  const html = trialInvitationHtml(displayName, activateUrl, locale);
  const subject = "Your 7-day trefolio trial is ready";

  const result = await sendEmail({
    to: email,
    subject,
    html,
    from: TRIAL_FROM,
    replyTo: "communications@trefolio.com",
    userId,
    automationKey: "trial-invite",
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
        status: result.suppressed ? "suppressed" : result.success ? "sent" : "failed",
      });
    } catch (e) {
      console.error("[trial-invitation] Failed to log email send:", e);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// 6b. Admin membership grant (pending activation; transactional, user locale)
// ---------------------------------------------------------------------------

function membershipGrantInvitationHtml(
  displayName: string,
  locale: EmailLocale,
  plan: "pro",
  days: number,
  activateUrl: string,
): string {
  const c = getMembershipGrantStrings(locale);
  const name = displayName || c.fallbackName;
  const planName = c.planNamePro;
  const fill = (s: string) =>
    s
      .replace(/\{\{name\}\}/g, name)
      .replace(/\{\{days\}\}/g, String(days))
      .replace(/\{\{planName\}\}/g, planName);
  const campaign = "membership_grant_invitation";
  return `${emailHeader()}
        <tr><td style="padding:36px 32px 16px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;text-align:center;">${fill(c.heading)}</h1>
          <p style="margin:0 0 12px;font-size:15px;color:#475569;text-align:left;line-height:1.6;">${fill(c.greetingLine)}</p>
          <p style="margin:0 0 12px;font-size:15px;color:#475569;text-align:left;line-height:1.6;">${fill(c.supportGrantLine)}</p>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;text-align:left;line-height:1.6;">${fill(c.planDaysLine)}</p>
          ${primaryCta(fill(c.activateCta), activateUrl)}
        </td></tr>
${emailFooter(fill(c.footer), utm("/profile", campaign), c.managePreferences, "{{unsubscribe_url}}")}`;
}

function membershipGrantPlainText(
  displayName: string,
  locale: EmailLocale,
  plan: "pro",
  days: number,
  activateUrl: string,
): string {
  const c = getMembershipGrantStrings(locale);
  const name = displayName || c.fallbackName;
  const planName = c.planNamePro;
  const fill = (s: string) =>
    s
      .replace(/\{\{name\}\}/g, name)
      .replace(/\{\{days\}\}/g, String(days))
      .replace(/\{\{planName\}\}/g, planName)
      .replace(/&mdash;/g, "—")
      .replace(/&rsquo;/g, "'")
      .replace(/&nbsp;/g, " ");
  return [
    fill(c.heading),
    "",
    fill(c.greetingLine),
    "",
    fill(c.supportGrantLine),
    "",
    fill(c.planDaysLine),
    "",
    `${fill(c.activateCta)}: ${activateUrl}`,
    "",
    fill(c.footer),
  ].join("\n");
}

export async function sendMembershipGrantInvitationEmail(opts: {
  to: string;
  displayName: string;
  userId: string;
  locale: EmailLocale;
  plan: "pro";
  days: number;
  token: string;
  baseUrl?: string;
}): Promise<SendEmailResult> {
  if (isTestEmail(opts.to)) return { success: true };
  const base = (opts.baseUrl || getBaseUrl()).replace(/\/$/, "");
  const activateUrl =
    resolveIdpMembershipGrantActivateUrl(opts.token) ??
    `${base}/membership-grant/activate?token=${encodeURIComponent(opts.token)}&utm_source=email&utm_medium=transactional&utm_campaign=membership_grant_invitation`;
  const c = getMembershipGrantStrings(opts.locale);
  const name = opts.displayName || c.fallbackName;
  const planName = c.planNamePro;
  const fillSubject = (s: string) =>
    s
      .replace(/\{\{name\}\}/g, name)
      .replace(/\{\{days\}\}/g, String(opts.days))
      .replace(/\{\{planName\}\}/g, planName);
  const html = membershipGrantInvitationHtml(opts.displayName, opts.locale, opts.plan, opts.days, activateUrl);
  const text = membershipGrantPlainText(opts.displayName, opts.locale, opts.plan, opts.days, activateUrl);
  const subject = fillSubject(c.subject);

  return sendEmail({
    to: opts.to,
    subject,
    html,
    text,
    userId: opts.userId,
    transactional: true,
    automationKey: "membership-grant",
  });
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
          <p style="margin:0 0 24px;font-size:15px;color:#475569;text-align:center;line-height:1.6;">Hi ${name}, your 7-day trefolio trial is over. Here&rsquo;s what you&rsquo;ll miss:</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${featureRow("&#x1F4CA;", "Advanced Analytics", "Sharpe ratio, max drawdown, volatility, and full growth history")}
            ${featureRow("&#x1F9E0;", "AI Analysis", "30 calls/day with deep stock insights and portfolio reviews")}
            ${featureRow("&#x1F4C8;", "Company Fundamentals", "Income statements, balance sheets, insider trades, and institutional holdings")}
            ${featureRow("&#x1F514;", "Premium Alerts", "WhatsApp notifications and unlimited alerts")}
          </table>
          ${growthHtml}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;"><tr><td style="padding:14px 16px;background:#eff6ff;border-radius:10px;border:1px solid #bfdbfe;">
            <p style="margin:0;font-size:14px;color:#1e40af;text-align:center;line-height:1.5;">Plans start at &euro;4.99/month. Cancel anytime.</p>
          </td></tr></table>
          ${primaryCta("Subscribe to trefolio", utm("/pricing", campaign))}
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
): Promise<SendEmailResult> {
  if (isTestEmail(email)) return { success: true };

  const html = trialExpiredHtml(displayName, locale, growthPct);
  const subject = "Your trefolio trial has ended";

  const result = await sendEmail({
    to: email,
    subject,
    html,
    from: TRIAL_FROM,
    replyTo: "communications@trefolio.com",
    userId,
    automationKey: "trial-expired",
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
        status: result.suppressed ? "suppressed" : result.success ? "sent" : "failed",
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
    automationKey: "trustpilot",
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
        status: result.suppressed ? "suppressed" : result.success ? "sent" : "failed",
      });
    } catch (e) {
      console.error("[satisfaction-trustpilot] Failed to log email send:", e);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Feedback pipeline (auto-ack + completion) — copy aligns with automated-user-comms skill
// ---------------------------------------------------------------------------

type FeedbackMailLocale = "en" | "es";

export function feedbackMailLocaleFromAppLanguage(language: string | undefined): FeedbackMailLocale {
  const l = (language || "en").toLowerCase();
  return l.startsWith("es") ? "es" : "en";
}

const feedbackAutoAckCopy: Record<
  FeedbackMailLocale,
  { subject: string; heading: string; line1: string; line2: string; disclaimer: string }
> = {
  en: {
    subject: "We received your feedback",
    heading: "Thank you",
    line1: "Thanks for taking the time to write to us about:",
    line2:
      "We've logged your message and our team will take it into account when prioritizing improvements. You don't need to do anything else.",
    disclaimer:
      "This is an automated confirmation. If you need urgent help, reply to this email or contact support.",
  },
  es: {
    subject: "Hemos recibido tu comentario",
    heading: "Gracias",
    line1: "Gracias por escribirnos sobre:",
    line2:
      "Hemos registrado tu mensaje y lo tendremos en cuenta al priorizar mejoras. No necesitas hacer nada más.",
    disclaimer:
      "Este es un correo automático de confirmación. Si necesitas ayuda urgente, responde a este correo o contacta con soporte.",
  },
};

/** Plain-text reply stored in `feedback.admin_reply` and reflected in the app. */
export function buildFeedbackAutoAckAdminReply(locale: FeedbackMailLocale, subject: string): string {
  const s = subject.trim() || "your message";
  if (locale === "es") {
    return `Gracias por tu mensaje sobre "${s}". Lo tendremos en cuenta mientras priorizamos el trabajo en el producto.`;
  }
  return `Thanks for your message about "${s}". We'll take it into account as we prioritize work on the product.`;
}

function feedbackAutoAckHtml(locale: FeedbackMailLocale, subjectLine: string): string {
  const c = feedbackAutoAckCopy[locale];
  const esc = (t: string) =>
    t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const subj = esc(subjectLine.trim() || "—");
  return `${emailHeader()}
        <tr><td style="padding:32px 32px 0;">
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0f172a;">${c.heading}</h1>
          <p style="margin:0 0 12px;font-size:15px;color:#475569;line-height:1.6;">${c.line1}</p>
          <p style="margin:0 0 24px;font-size:15px;font-weight:600;color:#0f172a;line-height:1.5;">${subj}</p>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">${c.line2}</p>
          <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.5;">${c.disclaimer}</p>
        </td></tr>
${emailFooter(
    "You're receiving this because you submitted feedback in trefolio.",
    `${getBaseUrl()}/`,
    "Open dashboard",
    "{{unsubscribe_url}}",
  )}`;
}

export async function sendFeedbackAutoAckEmail(
  email: string,
  userId: string,
  subjectLine: string,
  locale: FeedbackMailLocale,
): Promise<{ success: boolean; error?: string }> {
  if (isTestEmail(email)) return { success: true };

  const c = feedbackAutoAckCopy[locale];
  const html = feedbackAutoAckHtml(locale, subjectLine);

  const result = await sendEmail({
    to: email,
    subject: c.subject,
    html,
    userId,
    transactional: true,
    automationKey: "feedback-ack",
  });
  if (!result.success) console.error("Failed to send feedback auto-ack email:", result.error);

  try {
    await logEmailSend({
      resendId: result.messageId || "",
      templateId: "",
      userId,
      emailTo: email,
      subject: c.subject,
      bodyHtml: html,
      bodyText: htmlToPlainText(html),
      status: result.suppressed ? "suppressed" : result.success ? "sent" : "failed",
    });
  } catch (e) {
    console.error("[feedback-auto-ack] logEmailSend:", e);
  }

  return result;
}

export async function sendFeedbackCompletionEmail(
  email: string,
  userId: string,
  subjectLine: string,
  htmlBody: string,
): Promise<{ success: boolean; error?: string }> {
  if (isTestEmail(email)) return { success: true };

  const result = await sendEmail({
    to: email,
    subject: subjectLine,
    html: htmlBody,
    userId,
    transactional: true,
    automationKey: "feedback-done",
  });
  if (!result.success) console.error("Failed to send feedback completion email:", result.error);

  try {
    await logEmailSend({
      resendId: result.messageId || "",
      templateId: "",
      userId,
      emailTo: email,
      subject: subjectLine,
      bodyHtml: htmlBody,
      bodyText: htmlToPlainText(htmlBody),
      status: result.suppressed ? "suppressed" : result.success ? "sent" : "failed",
    });
  } catch (e) {
    console.error("[feedback-completion] logEmailSend:", e);
  }

  return result;
}

export async function sendEngagementSurveyEmail(
  email: string,
  userId: string,
  displayName: string,
  surveyUrl: string,
  surveyTitle: string,
  locale: EmailLocale = "en",
): Promise<{ success: boolean; error?: string; suppressed?: boolean }> {
  if (isTestEmail(email)) return { success: true };

  const isEs = locale === "es";
  const name = displayName || (isEs ? "hola" : "there");
  const subject = isEs
    ? `Tu opinión sobre trefolio: ${surveyTitle}`.slice(0, 58)
    : `Quick trefolio survey: ${surveyTitle}`.slice(0, 58);
  const html = `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#0f172a;">
  <p style="font-size:16px;">${isEs ? `Hola ${name},` : `Hi ${name},`}</p>
  <p style="font-size:15px;line-height:1.55;">
    ${isEs
      ? "Estamos mejorando trefolio y nos gustaría tu opinión en una encuesta corta (2–3 minutos). Tus respuestas nos ayudan a priorizar qué construir."
      : "We're improving trefolio and would value your input in a short survey (2–3 minutes). Your answers help us prioritize what to build next."}
  </p>
  <p style="margin:28px 0;">
    <a href="${surveyUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;">
      ${isEs ? "Responder la encuesta" : "Take the survey"}
    </a>
  </p>
  <p style="font-size:13px;color:#64748b;">
    ${isEs
      ? "Si el botón no funciona, copia este enlace:"
      : "If the button does not work, copy this link:"}
    <br/><a href="${surveyUrl}" style="color:#4f46e5;word-break:break-all;">${surveyUrl}</a>
  </p>
  <p style="font-size:12px;color:#94a3b8;margin-top:32px;">
    ${isEs
      ? 'Recibes este mensaje porque tienes una cuenta en trefolio. Puedes '
      : "You're receiving this because you have a trefolio account. You can "}
    <a href="{{unsubscribe_url}}" style="color:#94a3b8;text-decoration:underline;">${isEs ? "darte de baja" : "unsubscribe"}</a>
    ${isEs ? " de emails de producto." : " from product emails."}
  </p>
</div>`;

  const result = await sendEmail({
    to: email,
    subject,
    html,
    userId,
    transactional: false,
    automationKey: "engagement-survey",
  });
  if (!result.success) console.error("Failed to send engagement survey email:", result.error);

  try {
    await logEmailSend({
      resendId: result.messageId || "",
      templateId: "",
      userId,
      emailTo: email,
      subject,
      bodyHtml: html,
      bodyText: htmlToPlainText(html),
      status: result.suppressed ? "suppressed" : result.success ? "sent" : "failed",
    });
  } catch (e) {
    console.error("[engagement-survey] logEmailSend:", e);
  }

  return result;
}

export function getCodeOwnedEmailPreview(
  sender: import("@/lib/email-flows/registry").HardcodedEmailSender,
  locale: EmailLocale = "en",
): { subject: string; html: string } {
  const base = getBaseUrl();
  switch (sender) {
    case "sendVerificationEmail": {
      const s = verificationStrings[locale] ?? verificationStrings.en;
      return {
        subject: s.subject,
        html: verificationEmailHtml(`${base}/api/auth/verify-email?token=PREVIEW`, locale),
      };
    }
    case "sendWelcomeEmail": {
      const c = i18nWelcome[locale] ?? i18nWelcome.en;
      return { subject: c.subject, html: welcomeEmailHtml("Alex", locale) };
    }
    case "sendBifolioUpgradeEmail": {
      const c = i18nBifolio[locale] ?? i18nBifolio.en;
      return { subject: c.subject, html: bifolioUpgradeHtml("Alex", locale) };
    }
    case "sendTrefolioUpgradeEmail": {
      const c = i18nTrefolio[locale] ?? i18nTrefolio.en;
      return { subject: c.subject, html: trefolioUpgradeHtml("Alex", locale) };
    }
    case "sendAccountDeletionEmail": {
      const s = accountDeletionStrings[locale] ?? accountDeletionStrings.en;
      return {
        subject: s.subject,
        html: accountDeletionEmailHtml(`${base}/delete-account/confirm?token=PREVIEW`, locale),
      };
    }
    case "sendAlertEmail": {
      const s = thresholdAlertStrings[locale] ?? thresholdAlertStrings.en;
      return {
        subject: `Price Alert: AAPL ${s.roseAbove} USD 200`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 0;">
          <h2 style="color:#10b981;">${s.heading}</h2>
          <p style="font-size:16px;">${s.bodyTemplate
            .replace("{{name}}", "<strong>Apple</strong>")
            .replace("{{ticker}}", "AAPL")
            .replace("{{direction}}", s.roseAbove)
            .replace("{{currency}}", "USD")
            .replace("{{threshold}}", "<strong>USD 200.00</strong>")}</p>
          <p style="font-size:18px;padding:16px;background:#f0fdf4;border-radius:8px;text-align:center;">${s.currentPriceLabel} <strong>USD 201.50</strong></p>
          <div style="margin-top:20px;padding:14px 16px;background:#f8fafc;border-radius:8px;">
            <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#334155;">${s.headlinesHeading ?? "Recent headlines"}</p>
            <ul style="margin:0;padding-left:18px;font-size:13px;color:#334155;">
              <li><a href="https://example.com/news">Apple reports quarterly results</a></li>
            </ul>
            <p style="margin:10px 0 0;font-size:11px;color:#94a3b8;">${s.headlinesDisclaimer ?? "Headlines are for context only and are not investment advice."}</p>
          </div>
        </div>`,
      };
    }
    case "sendPercentAlertEmail": {
      const s = percentAlertStrings[locale] ?? percentAlertStrings.en;
      const hs = thresholdAlertStrings[locale] ?? thresholdAlertStrings.en;
      return {
        subject: `Price Alert: AAPL ${s.up} 3.20% ${s.today}`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 0;">
          <h2 style="color:#10b981;">${s.heading}</h2>
          <p style="font-size:16px;">${s.bodyTemplate
            .replace("{{name}}", "<strong>Apple</strong>")
            .replace("{{ticker}}", "AAPL")
            .replace("{{directionWithPercent}}", `<span style="color:#16a34a;font-weight:700;">${s.up} 3.20%</span>`)
            .replace("{{basis}}", s.today)}</p>
          <div style="margin-top:20px;padding:14px 16px;background:#f8fafc;border-radius:8px;">
            <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#334155;">${hs.headlinesHeading ?? "Recent headlines"}</p>
            <ul style="margin:0;padding-left:18px;font-size:13px;color:#334155;">
              <li><a href="https://example.com/news">Apple reports quarterly results</a></li>
            </ul>
            <p style="margin:10px 0 0;font-size:11px;color:#94a3b8;">${hs.headlinesDisclaimer ?? "Headlines are for context only and are not investment advice."}</p>
          </div>
        </div>`,
      };
    }
    case "sendFirstSyncCompleteEmail": {
      const s = firstSyncCompleteStrings[locale] ?? firstSyncCompleteStrings.en;
      return {
        subject: s.subject,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 0;">
          <h2 style="color:#10b981;">${s.heading}</h2>
          <p style="font-size:16px;">${s.bodyTemplate.replace("{{count}}", "12")}</p>
        </div>`,
      };
    }
    case "sendTrialInvitationEmail": {
      return {
        subject: "Your 7-day trefolio trial is ready",
        html: trialInvitationHtml("Alex", `${base}/trial/activate?token=PREVIEW`, locale),
      };
    }
    case "sendTrialExpiredEmail": {
      return {
        subject: "Your trefolio trial has ended",
        html: trialExpiredHtml("Alex", locale, 4.2),
      };
    }
    case "sendMembershipGrantInvitationEmail": {
      const c = getMembershipGrantStrings(locale);
      const url = `${base}/membership-grant/activate?token=PREVIEW`;
      return {
        subject: c.subject.replace("{{name}}", "Alex").replace("{{days}}", "30").replace("{{planName}}", c.planNamePro),
        html: membershipGrantInvitationHtml("Alex", locale, "pro", 30, url),
      };
    }
    case "sendSatisfactionTrustpilotEmail": {
      const afs = locale === "es" ? "es" : "en";
      const c = satisfactionThankYouCopy[afs];
      return { subject: c.subject, html: satisfactionThankYouHtml(5, afs) };
    }
    case "sendFeedbackAutoAckEmail": {
      const loc = locale === "es" ? "es" : "en";
      const c = feedbackAutoAckCopy[loc];
      return { subject: c.subject, html: feedbackAutoAckHtml(loc, "Chart is hard to read") };
    }
    case "sendFeedbackCompletionEmail": {
      return {
        subject: locale === "es" ? "Revisamos tu comentario" : "We looked into your feedback",
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
          <p>${locale === "es"
            ? "El cuerpo lo escribe un admin al cerrar el ticket. No hay plantilla fija."
            : "An admin writes this body when closing a feedback ticket. There is no fixed template."}</p>
        </div>`,
      };
    }
    case "buildWeeklyDigestEmailHtml": {
      return {
        subject: "Your Weekly Portfolio Digest — 2026-08-03 to 2026-08-10",
        html: "<p>See weekly-digest preview in enrich.</p>",
      };
    }
    case "sendEngagementSurveyEmail": {
      const url = `${base}/survey/PREVIEW`;
      return {
        subject: locale === "es" ? "Tu opinión sobre trefolio" : "Quick trefolio survey",
        html: locale === "es"
          ? `<p>Hola Alex — responde esta encuesta corta: <a href="${url}">${url}</a></p>`
          : `<p>Hi Alex — please take this short survey: <a href="${url}">${url}</a></p>`,
      };
    }
    default: {
      const _never: never = sender;
      return { subject: String(_never), html: "<p>No preview</p>" };
    }
  }
}

