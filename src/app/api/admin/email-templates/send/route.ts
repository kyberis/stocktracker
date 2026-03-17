import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { findUserById, getEmailTemplate, getUserSettings, logEmailSend } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";
import { getResendClientForAdmin, getFromAddress } from "@/lib/email";
import { getTemplateSubject, getLocalizedTemplateHtml } from "@/lib/email-i18n";

export const POST = withMetrics("/api/admin/email-templates/send", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const body = await req.json();
  const { templateId, userId, subject: overrideSubject, bodyHtml: overrideHtml, bodyText: overrideText } = body;

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const user = await findUserById(userId);
  if (!user || !user.email) {
    return NextResponse.json({ error: "User not found or has no email" }, { status: 404 });
  }

  const settings = await getUserSettings(userId);
  if (!settings.emailNotificationsEnabled) {
    if (templateId) {
      await logEmailSend({
        templateId,
        userId,
        emailTo: user.email,
        subject: overrideSubject || "(suppressed)",
        bodyHtml: "",
        status: "suppressed",
      });
    }
    return NextResponse.json({ error: "User has disabled email notifications", suppressed: true }, { status: 422 });
  }

  const userLang = settings.language || "en";
  const isSpanish = userLang === "es";
  let subject = overrideSubject || "";
  let html = overrideHtml || "";
  let text = overrideText || "";

  if (templateId) {
    const template = await getEmailTemplate(templateId);
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    if (!subject) subject = getTemplateSubject(template.slug, userLang, template.subject, template.subjectEs);
    if (!html) {
      const localized = getLocalizedTemplateHtml(template.slug, userLang);
      html = localized ?? (isSpanish && template.bodyHtmlEs ? template.bodyHtmlEs : template.bodyHtml);
    }
    if (!text) text = isSpanish && template.bodyTextEs ? template.bodyTextEs : template.bodyText;
  }

  if (!subject || !html) {
    return NextResponse.json({ error: "subject and bodyHtml are required" }, { status: 400 });
  }

  const resend = await getResendClientForAdmin();
  if (!resend) {
    return NextResponse.json({ error: "Resend not configured" }, { status: 500 });
  }

  try {
    const { data, error: sendError } = await resend.emails.send({
      from: getFromAddress(),
      to: user.email,
      subject,
      html,
      text: text || undefined,
      headers: {
        "List-Unsubscribe": `<${process.env.APP_BASE_URL || "https://trefolio.com"}/unsubscribe?userId=${userId}>`,
      },
    });

    if (sendError) {
      return NextResponse.json({ error: sendError.message }, { status: 500 });
    }

    const sendId = await logEmailSend({
      resendId: data?.id || "",
      templateId: templateId || "",
      userId,
      emailTo: user.email,
      subject,
      bodyHtml: html,
      bodyText: text,
      status: "sent",
    });

    return NextResponse.json({ ok: true, sendId, resendId: data?.id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Send failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});
