import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { getEmailTemplate, updateEmailTemplate, deleteEmailTemplate, getTemplateStats } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/admin/email-templates/[id]", async (
  req: NextRequest,
  ctx?: unknown,
) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const { id } = (ctx as { params: { id: string } }).params;
  const template = await getEmailTemplate(id);
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const stats = await getTemplateStats(id);
  return NextResponse.json({ ...template, stats });
});

export const PUT = withMetrics("/api/admin/email-templates/[id]", async (
  req: NextRequest,
  ctx?: unknown,
) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const { id } = (ctx as { params: { id: string } }).params;
  const body = await req.json();

  const updated = await updateEmailTemplate(id, body);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(updated);
});

export const DELETE = withMetrics("/api/admin/email-templates/[id]", async (
  req: NextRequest,
  ctx?: unknown,
) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const { id } = (ctx as { params: { id: string } }).params;
  await deleteEmailTemplate(id);
  return NextResponse.json({ ok: true });
});
