import { Resend } from "resend";
import { SignJWT, jwtVerify } from "jose";
import { getGlobalResendApiKey } from "@/lib/db";

const VERIFICATION_TOKEN_TTL = 60 * 60 * 24; // 24 hours

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

export async function createVerificationToken(userId: string, email: string): Promise<string> {
  const secret = new TextEncoder().encode(getSessionSecret());
  return new SignJWT({ userId, email, purpose: "email_verification" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(`${VERIFICATION_TOKEN_TTL}s`)
    .sign(secret);
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

function verificationEmailHtml(verifyUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <!-- Header -->
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
        <!-- Body -->
        <tr><td style="padding:36px 32px 16px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;text-align:center;">Verify your email address</h1>
          <p style="margin:0 0 28px;font-size:15px;color:#475569;text-align:center;line-height:1.6;">
            Thanks for signing up! Please confirm your email to activate your account and start tracking your portfolio.
          </p>
          <!-- CTA Button -->
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr><td align="center">
              <a href="${verifyUrl}" target="_blank" style="display:inline-block;padding:14px 36px;background-color:#10b981;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:10px;letter-spacing:0.2px;">
                Verify Email
              </a>
            </td></tr>
          </table>
          <!-- Fallback link -->
          <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.5;">
            Or copy and paste this link into your browser:
          </p>
          <p style="margin:6px 0 0;font-size:12px;color:#10b981;text-align:center;word-break:break-all;line-height:1.5;">
            <a href="${verifyUrl}" style="color:#10b981;text-decoration:underline;">${verifyUrl}</a>
          </p>
        </td></tr>
        <!-- Divider -->
        <tr><td style="padding:0 32px;">
          <div style="border-top:1px solid #e2e8f0;margin:24px 0;"></div>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:0 32px 32px;">
          <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;text-align:center;line-height:1.5;">
            This link expires in 24 hours.
          </p>
          <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.5;">
            If you didn&rsquo;t create an account on trefolio, you can safely ignore this email.
          </p>
        </td></tr>
      </table>
      <!-- Copyright -->
      <p style="margin:24px 0 0;font-size:11px;color:#94a3b8;text-align:center;">
        &copy; ${new Date().getFullYear()} trefolio &mdash; Portfolio tracking with clear insights
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendVerificationEmail(
  email: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  const resend = await getResendClient();
  if (!resend) {
    console.warn("Resend API key not configured; skipping verification email.");
    return { success: true };
  }

  const verifyUrl = `${getBaseUrl()}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

  try {
    await resend.emails.send({
      from: getFromAddress(),
      to: email,
      subject: "Verify your email — trefolio",
      html: verificationEmailHtml(verifyUrl),
    });
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Failed to send verification email:", msg);
    return { success: false, error: msg };
  }
}

export async function sendAlertEmail(
  email: string,
  alert: { ticker: string; name: string; condition: string; threshold: number; currentPrice: number; currency: string }
): Promise<{ success: boolean; error?: string }> {
  const resend = await getResendClient();
  if (!resend) {
    console.warn("Resend API key not configured; skipping alert email.");
    return { success: true };
  }

  const direction = alert.condition === "above" ? "rose above" : "dropped below";
  const dashboardUrl = `${getBaseUrl()}/`;

  try {
    await resend.emails.send({
      from: getFromAddress(),
      to: email,
      subject: `Price Alert: ${alert.ticker} ${direction} ${alert.currency} ${alert.threshold}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
          <h2 style="color: #10b981;">trefolio — Price Alert</h2>
          <p style="font-size: 16px;"><strong>${alert.name || alert.ticker}</strong> (${alert.ticker}) has ${direction} your target of <strong>${alert.currency} ${alert.threshold.toFixed(2)}</strong>.</p>
          <p style="font-size: 18px; padding: 16px; background: #f0fdf4; border-radius: 8px; text-align: center;">Current price: <strong>${alert.currency} ${alert.currentPrice.toFixed(2)}</strong></p>
          <a href="${dashboardUrl}" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #10b981; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600;">Open Dashboard</a>
          <p style="margin-top: 24px; font-size: 13px; color: #64748b;">This alert has been automatically deactivated. Re-enable it from your Tools page.</p>
        </div>
      `,
    });
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Failed to send alert email:", msg);
    return { success: false, error: msg };
  }
}
