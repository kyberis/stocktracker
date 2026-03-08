import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getGlobalResendApiKey } from "@/lib/db";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { withMetrics } from "@/lib/with-metrics";

const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 200;
const MAX_SUBJECT_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 5000;

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 5;
const ipSubmissions = new Map<string, { count: number; windowStart: number }>();

function checkIpRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipSubmissions.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    ipSubmissions.set(ip, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

function getFromAddress(): string {
  return process.env.RESEND_FROM_ADDRESS || "trefolio <noreply@trefolio.com>";
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const POST = withMetrics("/api/contact", async (req: NextRequest) => {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";

  if (!checkIpRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many messages. Please try again later." },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = String(body.name || "").trim().slice(0, MAX_NAME_LENGTH);
  const email = String(body.email || "").trim().slice(0, MAX_EMAIL_LENGTH);
  const subject = String(body.subject || "").trim().slice(0, MAX_SUBJECT_LENGTH);
  const message = String(body.message || "").trim().slice(0, MAX_MESSAGE_LENGTH);
  const turnstileToken = body.turnstileToken ? String(body.turnstileToken) : null;

  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const turnstileOk = await verifyTurnstileToken(turnstileToken, ip);
  if (!turnstileOk) {
    return NextResponse.json({ error: "CAPTCHA verification failed. Please try again." }, { status: 400 });
  }

  const dbKey = await getGlobalResendApiKey();
  const resendKey = dbKey || process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.error("[contact] Resend API key not configured");
    return NextResponse.json({ error: "Email service is not configured. Please email support@trefolio.com directly." }, { status: 503 });
  }

  const resend = new Resend(resendKey);

  try {
    await resend.emails.send({
      from: getFromAddress(),
      to: "support@trefolio.com",
      replyTo: email,
      subject: `[Contact Form] ${subject}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #0f172a; margin-bottom: 16px;">New Contact Form Submission</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px 12px; border: 1px solid #e2e8f0; background: #f8fafc; font-weight: 600; width: 100px;">Name</td>
              <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${escapeHtml(name)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; border: 1px solid #e2e8f0; background: #f8fafc; font-weight: 600;">Email</td>
              <td style="padding: 8px 12px; border: 1px solid #e2e8f0;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; border: 1px solid #e2e8f0; background: #f8fafc; font-weight: 600;">Subject</td>
              <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${escapeHtml(subject)}</td>
            </tr>
          </table>
          <div style="padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
            <p style="margin: 0; white-space: pre-wrap; font-size: 14px; line-height: 1.6; color: #334155;">${escapeHtml(message)}</p>
          </div>
          <p style="margin-top: 16px; font-size: 12px; color: #94a3b8;">Sent from the trefolio contact form &bull; IP: ${escapeHtml(ip)}</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[contact] Failed to send email:", msg);
    return NextResponse.json({ error: "Failed to send message. Please try again or email support@trefolio.com directly." }, { status: 500 });
  }
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
