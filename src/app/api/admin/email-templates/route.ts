import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { listEmailTemplates, createEmailTemplate } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/admin/email-templates", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const templates = await listEmailTemplates();
  return NextResponse.json(templates);
});

export const POST = withMetrics("/api/admin/email-templates", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const body = await req.json();
  const { slug, name, subject, subjectEs, bodyHtml, bodyHtmlEs, bodyText, bodyTextEs, category, experienceLevel } = body;

  if (!slug || !name || !subject || !bodyHtml) {
    return NextResponse.json({ error: "slug, name, subject, and bodyHtml are required" }, { status: 400 });
  }

  try {
    const template = await createEmailTemplate({
      slug, name, subject, subjectEs, bodyHtml, bodyHtmlEs, bodyText, bodyTextEs, category, experienceLevel,
    });
    return NextResponse.json(template, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to create template";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
});
