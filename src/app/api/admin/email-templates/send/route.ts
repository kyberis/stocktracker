import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { findUserById, getEmailTemplate, getUserSettings, logEmailSend } from "@/lib/db";
import { ensureReferralCode } from "@/lib/db/referrals";
import { withMetrics } from "@/lib/with-metrics";
import { sendEmail, htmlToPlainText } from "@/lib/email";
import { getTemplateSubject, getLocalizedTemplateHtml } from "@/lib/email-i18n";

export const POST = withMetrics("/api/admin/email-templates/send", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const body = await req.json();
  const { templateId, userId, locale: localeOverride, subject: overrideSubject, bodyHtml: overrideHtml, bodyText: overrideText } = body;

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

  const userLang = typeof localeOverride === "string" && localeOverride ? localeOverride : (settings.language || "en");
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
      const localized = await getLocalizedTemplateHtml(template.slug, userLang);
      html = localized ?? (isSpanish && template.bodyHtmlEs ? template.bodyHtmlEs : template.bodyHtml);
    }
    if (!text) text = isSpanish && template.bodyTextEs ? template.bodyTextEs : template.bodyText;
  }

  if (!subject || !html) {
    return NextResponse.json({ error: "subject and bodyHtml are required" }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://trefolio.app";

  // Replace {{referral_link}} with user-specific referral link
  if (html.includes("{{referral_link}}") || text.includes("{{referral_link}}")) {
    const referralCode = await ensureReferralCode(userId);
    const referralLink = `${baseUrl}/signup?ref=${referralCode}`;
    html = html.replaceAll("{{referral_link}}", referralLink);
    text = text.replaceAll("{{referral_link}}", referralLink);
  }

  // Replace common placeholders
  html = html.replaceAll("{{base_url}}", baseUrl);
  text = text.replaceAll("{{base_url}}", baseUrl);
  if (user.display_name) {
    html = html.replaceAll("{{name}}", user.display_name);
    text = text.replaceAll("{{name}}", user.display_name);
  }

  const result = await sendEmail({
    to: user.email,
    subject,
    html,
    text: text || htmlToPlainText(html),
    userId,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  const sendId = await logEmailSend({
    resendId: result.messageId || "",
    templateId: templateId || "",
    userId,
    emailTo: user.email,
    subject,
    bodyHtml: html,
    bodyText: text,
    status: "sent",
  });

  return NextResponse.json({ ok: true, sendId, resendId: result.messageId });
});
