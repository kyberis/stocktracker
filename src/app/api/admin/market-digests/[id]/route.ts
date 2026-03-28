import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import {
  getMarketDigestWithTranslations,
  updateTranslation,
  publishDigest,
  archiveDigest,
} from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/admin/market-digests/[id]", async (
  req: NextRequest,
  ctx: unknown,
) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const { id } = (ctx as { params: { id: string } }).params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const digest = await getMarketDigestWithTranslations(id);
  if (!digest) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ digest });
});

export const PUT = withMetrics("/api/admin/market-digests/[id]", async (
  req: NextRequest,
  ctx: unknown,
) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const { id } = (ctx as { params: { id: string } }).params;

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  let body: {
    action?: "publish" | "archive";
    translationId?: string;
    title?: string;
    summary?: string;
    keyPoints?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (body.action === "publish") {
    await publishDigest(id);
    return NextResponse.json({ ok: true, action: "published" });
  }

  if (body.action === "archive") {
    await archiveDigest(id);
    return NextResponse.json({ ok: true, action: "archived" });
  }

  if (body.translationId) {
    await updateTranslation(body.translationId, {
      title: body.title,
      summary: body.summary,
      keyPoints: body.keyPoints,
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
});
