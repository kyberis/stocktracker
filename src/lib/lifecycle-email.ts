import { getEmailTemplateBySlug, logEmailSend } from "@/lib/db";
import { sendEmail, htmlToPlainText } from "@/lib/email";
import { getTemplateSubject, getLocalizedTemplateHtml } from "@/lib/email-i18n";

export interface LifecycleSendResult {
  sent: boolean;
  suppressed: boolean;
  skipped?: "template_not_found";
}

/**
 * Sends one of the DB-seeded, 35-locale email-i18n templates (welcome-no-stocks,
 * feature-*, etc.) to a user, resolving subject/body the same way the admin
 * manual-send endpoint does: DB content for en/es, generated i18n HTML for
 * everything else. Shared by the activation and win-back lifecycle crons.
 */
export async function sendLifecycleTemplateEmail(opts: {
  slug: string;
  userId: string;
  email: string;
  displayName: string;
  locale: string;
}): Promise<LifecycleSendResult> {
  const template = await getEmailTemplateBySlug(opts.slug);
  if (!template) return { sent: false, suppressed: false, skipped: "template_not_found" };

  const isSpanish = opts.locale === "es";
  const subject = getTemplateSubject(template.slug, opts.locale, template.subject, template.subjectEs);
  const localized = await getLocalizedTemplateHtml(template.slug, opts.locale);
  let html = localized ?? (isSpanish && template.bodyHtmlEs ? template.bodyHtmlEs : template.bodyHtml);
  let text = isSpanish && template.bodyTextEs ? template.bodyTextEs : template.bodyText;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://trefolio.com";
  const displayName = opts.displayName || "there";
  for (const [token, value] of [
    ["{{base_url}}", baseUrl],
    ["{{name}}", displayName],
    ["{{display_name}}", displayName],
    ["{{growth_box}}", ""],
  ] as const) {
    html = html.replaceAll(token, value);
    text = text.replaceAll(token, value);
  }

  const result = await sendEmail({
    to: opts.email,
    subject,
    html,
    text: text || htmlToPlainText(html),
    userId: opts.userId,
  });

  await logEmailSend({
    resendId: result.messageId || "",
    templateId: template.id,
    userId: opts.userId,
    emailTo: opts.email,
    subject,
    bodyHtml: html,
    bodyText: text,
    status: result.suppressed ? "suppressed" : result.success ? "sent" : "failed",
  }).catch(() => {});

  return { sent: !!result.success, suppressed: !!result.suppressed };
}
