import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { parseBody } from "@/lib/api-response";
import { sendFeedbackCompletionSchema } from "@/lib/schemas";
import { withMetrics } from "@/lib/with-metrics";
import { getFeedbackById, markFeedbackCompletionEmailSent } from "@/lib/db/feedback";
import { findUserById } from "@/lib/db";
import { sendFeedbackCompletionEmail } from "@/lib/email";

export const POST = withMetrics("/api/admin/feedback/send-completion", async (req: NextRequest) => {
  const { session, error } = await requireAdmin(req);
  if (error || !session) return error;

  const result = await parseBody(req, sendFeedbackCompletionSchema);
  if (!result.success) return result.error;
  const { id, html, subject } = result.data;

  const fb = await getFeedbackById(id);
  if (!fb) {
    return NextResponse.json({ error: "Feedback not found." }, { status: 404 });
  }
  if (fb.completionEmailSentAt) {
    return NextResponse.json({ error: "Completion email was already sent." }, { status: 400 });
  }

  const bodyHtml = (html && html.trim()) || fb.completionEmailDraft;
  if (!bodyHtml?.trim()) {
    return NextResponse.json({ error: "No email body: provide html or save a draft first." }, { status: 400 });
  }

  const user = await findUserById(fb.userId);
  if (!user?.email) {
    return NextResponse.json({ error: "User has no email." }, { status: 400 });
  }

  const emailSubject =
    subject?.trim() ||
    (fb.subject.trim() ? `Update: ${fb.subject.trim().slice(0, 80)}` : "Update on your trefolio feedback");

  const sendResult = await sendFeedbackCompletionEmail(user.email, fb.userId, emailSubject, bodyHtml);
  if (!sendResult.success) {
    return NextResponse.json({ error: sendResult.error || "Failed to send email." }, { status: 502 });
  }

  await markFeedbackCompletionEmailSent(id);
  return NextResponse.json({ ok: true });
});
