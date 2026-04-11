import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { getEmailTemplate, updateEmailTemplate, deleteEmailTemplate, getTemplateStats } from "@/lib/db";
import { getAppRouteParam } from "@/lib/api-route-params";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/admin/email-templates/[id]", async (
  req: NextRequest,
  ctx?: unknown,
) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const id = getAppRouteParam(req, ctx, "id");
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

  const id = getAppRouteParam(req, ctx, "id");
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

  const id = getAppRouteParam(req, ctx, "id");
  await deleteEmailTemplate(id);
  return NextResponse.json({ ok: true });
});
