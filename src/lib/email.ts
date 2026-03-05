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
  return process.env.APP_SESSION_SECRET || "stocktracker-dev-session-secret-change-me";
}

function getBaseUrl(): string {
  return process.env.APP_BASE_URL || "http://localhost:3000";
}

function getFromAddress(): string {
  return process.env.RESEND_FROM_ADDRESS || "StockTracker <noreply@stocktracker.eu>";
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
      subject: "Verify your email — StockTracker",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
          <h2 style="color: #10b981;">StockTracker</h2>
          <p>Click the button below to verify your email address:</p>
          <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background: #10b981; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600;">Verify Email</a>
          <p style="margin-top: 24px; font-size: 13px; color: #64748b;">This link expires in 24 hours. If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
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
          <h2 style="color: #10b981;">StockTracker — Price Alert</h2>
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
