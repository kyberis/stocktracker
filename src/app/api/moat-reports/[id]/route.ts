export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import {
  getMoatReport,
  normalizeMoatReportTags,
  updateMoatReportAiNarrative,
  updateMoatReportTags,
  deleteMoatReport,
} from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

function extractId(req: NextRequest): string {
  const parts = req.nextUrl.pathname.split("/");
  return parts[parts.length - 1];
}

export const GET = withMetrics("/api/moat-reports/[id]", async (request: NextRequest) => {
  const { session, error } = await requireSession(request);
  if (error || !session) return error;

  const id = extractId(request);
  const report = await getMoatReport(id, session.userId);
  if (!report) {
    return Response.json({ error: "Report not found" }, { status: 404 });
  }

  return Response.json(report);
});

export const PATCH = withMetrics("/api/moat-reports/[id] PATCH", async (request: NextRequest) => {
  const { session, error } = await requireSession(request);
  if (error || !session) return error;

  const id = extractId(request);
  let body: { aiNarrative?: string; tags?: string[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (typeof body.aiNarrative === "string") {
    await updateMoatReportAiNarrative(id, session.userId, body.aiNarrative);
  }

  if (body.tags !== undefined) {
    const tags = normalizeMoatReportTags(body.tags);
    const ok = await updateMoatReportTags(id, session.userId, tags);
    if (!ok) {
      return Response.json({ error: "Report not found" }, { status: 404 });
    }
  }

  return Response.json({ ok: true });
});

export const DELETE = withMetrics("/api/moat-reports/[id] DELETE", async (request: NextRequest) => {
  const { session, error } = await requireSession(request);
  if (error || !session) return error;

  const id = extractId(request);
  const deleted = await deleteMoatReport(id, session.userId);
  if (!deleted) {
    return Response.json({ error: "Report not found" }, { status: 404 });
  }

  return Response.json({ ok: true });
});
