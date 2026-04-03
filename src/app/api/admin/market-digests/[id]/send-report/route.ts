import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { listEmailSendsByTemplateId, getTemplateStats } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const dynamic = "force-dynamic";

export const GET = withMetrics("/api/admin/market-digests/[id]/send-report", async (
  req: NextRequest,
  ctx: unknown,
) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const { id } = (ctx as { params: { id: string } }).params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const templateId = `digest:${id}`;

  const [sends, stats] = await Promise.all([
    listEmailSendsByTemplateId(templateId),
    getTemplateStats(templateId),
  ]);

  const report = sends.map((s) => ({
    userId: s.userId,
    email: s.emailTo,
    status: s.status,
    sentAt: s.sentAt,
    deliveredAt: s.deliveredAt || null,
    openedAt: s.openedAt || null,
    openCount: s.openCount,
    clickedAt: s.clickedAt || null,
    bouncedAt: s.bouncedAt || null,
    failedAt: s.failedAt || null,
    resendId: s.resendId || null,
  }));

  return NextResponse.json({
    digestId: id,
    summary: stats,
    totalRecipients: sends.length,
    report,
  });
});
