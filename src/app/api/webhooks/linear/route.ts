import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getFeedbackById, parseFeedbackIdFromLinearContent, upsertFeedbackCompletionDraft } from "@/lib/db/feedback";

export const dynamic = "force-dynamic";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function verifyLinearSignature(rawBody: Buffer, headerSig: string | null, secret: string): boolean {
  if (!headerSig || !secret) return false;
  const computed = createHmac("sha256", secret).update(rawBody).digest();
  let sigBuf: Buffer;
  try {
    sigBuf = Buffer.from(headerSig, "hex");
  } catch {
    return false;
  }
  if (sigBuf.length !== computed.length) return false;
  return timingSafeEqual(computed, sigBuf);
}

function getAppBaseUrl(): string {
  const raw = process.env.APP_BASE_URL || "https://trefolio.com";
  return raw.replace(/\/$/, "");
}

/**
 * Customer-facing draft only — no internal tools, ticket IDs, or links meant for staff.
 * Admin may edit before send; default invites the user back into the product.
 */
function buildCompletionDraft(params: { feedbackSubject: string }): string {
  const subj = escapeHtml(params.feedbackSubject);
  const base = escapeHtml(getAppBaseUrl());
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:24px 16px;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
    <tr><td style="padding:28px 28px 8px;">
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hi,</p>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Thank you again for writing to us about <strong>${subj}</strong>. We have acted on your feedback and shipped updates on our side that should reflect what you were looking for.</p>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;"><strong>We’d love you to come back to trefolio</strong> and see what’s new — open the app, check your portfolio and the areas you use most, and see if things feel better aligned with what you had in mind.</p>
      <p style="margin:0 0 24px;font-size:16px;line-height:1.6;">Your input helps us improve; if something still doesn’t feel right, reply to this email or send us another message from the app’s feedback option.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
        <tr><td align="left">
          <a href="${base}/" style="display:inline-block;padding:12px 24px;background:#10b981;color:#fff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">Open trefolio</a>
        </td></tr>
      </table>
      <p style="margin:0;font-size:15px;line-height:1.5;color:#475569;">— The trefolio team</p>
    </td></tr>
  </table>
  <p style="max-width:560px;margin:16px auto 0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.5;">This message is about feedback you sent us. If you did not expect it, you can ignore this email.</p>
</body>
</html>`;
}

interface LinearIssuePayload {
  action?: string;
  type?: string;
  data?: {
    identifier?: string;
    title?: string;
    description?: string;
    state?: { type?: string; name?: string };
    url?: string;
  };
  updatedFrom?: { state?: { type?: string } };
  webhookTimestamp?: number;
}

export async function POST(req: NextRequest) {
  const secret = process.env.LINEAR_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.warn("[webhooks/linear] LINEAR_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const rawBody = Buffer.from(await req.arrayBuffer());
  const sig =
    req.headers.get("linear-signature") ||
    req.headers.get("Linear-Signature") ||
    req.headers.get("LINEAR-SIGNATURE");

  if (!verifyLinearSignature(rawBody, sig, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: LinearIssuePayload;
  try {
    payload = JSON.parse(rawBody.toString("utf8")) as LinearIssuePayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ts = payload.webhookTimestamp;
  if (typeof ts === "number" && Math.abs(Date.now() - ts) > 5 * 60 * 1000) {
    return NextResponse.json({ error: "Stale webhook" }, { status: 401 });
  }

  if (payload.type !== "Issue" || payload.action !== "update") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const stateType = payload.data?.state?.type;
  if (stateType !== "completed") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const prevType = payload.updatedFrom?.state?.type;
  if (prevType === "completed") {
    return NextResponse.json({ ok: true, ignored: true, reason: "already completed" });
  }

  const title = payload.data?.title ?? "";
  const description = payload.data?.description ?? "";
  const feedbackId = parseFeedbackIdFromLinearContent(title, description);
  if (!feedbackId) {
    return NextResponse.json({ ok: true, ignored: true, reason: "no feedback id in issue" });
  }

  const fb = await getFeedbackById(feedbackId);
  if (!fb) {
    return NextResponse.json({ ok: true, ignored: true, reason: "feedback not found" });
  }

  const draftHtml = buildCompletionDraft({
    feedbackSubject: fb.subject,
  });

  await upsertFeedbackCompletionDraft({ feedbackId, draftHtml });

  return NextResponse.json({ ok: true, feedbackId });
}
