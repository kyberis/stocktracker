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

function buildCompletionDraft(params: {
  feedbackSubject: string;
  identifier: string;
  issueUrl: string;
  issueTitle: string;
}): string {
  const subj = escapeHtml(params.feedbackSubject);
  const id = escapeHtml(params.identifier);
  const title = escapeHtml(params.issueTitle);
  const url = escapeHtml(params.issueUrl);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="font-family:system-ui,sans-serif;max-width:560px;line-height:1.5;color:#0f172a;">
<p>Hi,</p>
<p>Thanks again for your feedback about <strong>${subj}</strong>. We've completed the related work tracked in Linear as <strong>${id}</strong> (${title}).</p>
<p><strong>Please review this draft before sending.</strong> Add specific release notes or product changes below, then send from the admin Feedback tab.</p>
<p style="padding:12px;background:#f8fafc;border-radius:8px;border:1px dashed #cbd5e1;">[Add what shipped / change summary here]</p>
<p>— The trefolio team</p>
<p style="font-size:13px;color:#64748b;"><a href="${url}">Linear issue</a> (internal reference)</p>
</body></html>`;
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

  const identifier = payload.data?.identifier || (title.match(/\b([A-Z][A-Z]+-\d+)\b/) || [])[1] || "Linear";
  const issueUrl = payload.data?.url || "";
  const cleanTitle = title.replace(/\[feedback-[a-f0-9-]{36}\]/i, "").trim() || title;
  const draftHtml = buildCompletionDraft({
    feedbackSubject: fb.subject,
    identifier,
    issueUrl: issueUrl || "https://linear.app",
    issueTitle: cleanTitle,
  });

  await upsertFeedbackCompletionDraft({ feedbackId, draftHtml });

  return NextResponse.json({ ok: true, feedbackId });
}
