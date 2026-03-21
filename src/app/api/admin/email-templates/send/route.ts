import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { findUserById, getEmailTemplate, getUserSettings, logEmailSend } from "@/lib/db";
import { ensureReferralCode } from "@/lib/db/referrals";
import { ensureInitialized } from "@/lib/db/client";
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
  let templateSlug = "";

  if (templateId) {
    const template = await getEmailTemplate(templateId);
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    templateSlug = template.slug;
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

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://trefolio.com";

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
  const displayName = user.display_name || "there";
  html = html.replaceAll("{{name}}", displayName);
  text = text.replaceAll("{{name}}", displayName);
  html = html.replaceAll("{{display_name}}", displayName);
  text = text.replaceAll("{{display_name}}", displayName);

  html = html.replaceAll("{{growth_box}}", "");
  text = text.replaceAll("{{growth_box}}", "");

  if (html.includes("{{trial_token}}") || text.includes("{{trial_token}}")) {
    let token = user.trial_token;
    if (!token) {
      token = randomBytes(32).toString("hex");
      const client = await ensureInitialized();
      await client.execute({
        sql: "UPDATE users SET trial_token = ?, trial_invited_at = CASE WHEN trial_invited_at = '' THEN datetime('now') ELSE trial_invited_at END WHERE id = ?",
        args: [token, userId],
      });
    }
    html = html.replaceAll("{{trial_token}}", token);
    text = text.replaceAll("{{trial_token}}", token);
  }

  const isTrialTemplate = templateSlug.startsWith("trial-");
  const result = await sendEmail({
    to: user.email,
    subject,
    html,
    text: text || htmlToPlainText(html),
    userId,
    ...(isTrialTemplate && { from: "Marcos from trefolio <communications@trefolio.com>", replyTo: "communications@trefolio.com" }),
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
