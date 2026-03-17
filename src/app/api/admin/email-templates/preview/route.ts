import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { getEmailTemplate } from "@/lib/db";
import { getTemplateSubject, getLocalizedTemplateHtml } from "@/lib/email-i18n";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const templateId = searchParams.get("templateId");
  const locale = searchParams.get("locale") || "en";

  if (!templateId) {
    return NextResponse.json({ error: "templateId is required" }, { status: 400 });
  }

  const template = await getEmailTemplate(templateId);
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const subject = getTemplateSubject(template.slug, locale, template.subject, template.subjectEs);

  const isSpanish = locale === "es";
  let bodyHtml: string;

  const localized = await getLocalizedTemplateHtml(template.slug, locale);
  if (localized) {
    bodyHtml = localized;
  } else if (isSpanish && template.bodyHtmlEs) {
    bodyHtml = template.bodyHtmlEs;
  } else {
    bodyHtml = template.bodyHtml;
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://trefolio.app";
  bodyHtml = bodyHtml
    .replaceAll("{{base_url}}", baseUrl)
    .replaceAll("{{referral_link}}", `${baseUrl}/signup?ref=EXAMPLE1`)
    .replaceAll("{{name}}", "John")
    .replaceAll("{{unsubscribe_url}}", "#");

  return NextResponse.json({ subject, bodyHtml });
}
