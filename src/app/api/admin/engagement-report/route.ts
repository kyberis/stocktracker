import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { withMetrics } from "@/lib/with-metrics";
import { insertEngagementReport, listEngagementReports, getEngagementReport } from "@/lib/db";
import { buildEngagementSnapshot } from "@/lib/engagement-report/snapshot";
import { generateEngagementNarrative } from "@/lib/engagement-report/generate";
import { renderEngagementReportHtml } from "@/lib/engagement-report/render-html";

export const maxDuration = 120;

const generateSchema = z.object({
  periodDays: z.union([z.literal(7), z.literal(30), z.literal(90)]).default(30),
});

export const GET = withMetrics("/api/admin/engagement-report", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const report = await getEngagementReport(id);
    if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
    let surveyProposals = [];
    let narrative = null;
    try {
      surveyProposals = JSON.parse(report.surveyProposalsJson);
    } catch {
      surveyProposals = [];
    }
    try {
      narrative = JSON.parse(report.narrativeJson);
    } catch {
      narrative = null;
    }
    return NextResponse.json({
      report: {
        id: report.id,
        periodDays: report.periodDays,
        html: report.html,
        createdAt: report.createdAt,
        createdBy: report.createdBy,
        usedFallback: report.usedFallback,
        model: report.model,
        surveyProposals,
        narrative,
        snapshot: JSON.parse(report.snapshotJson),
      },
    });
  }

  const reports = await listEngagementReports(30);
  return NextResponse.json({ reports });
});

export const POST = withMetrics("/api/admin/engagement-report", async (req: NextRequest) => {
  const { session, error } = await requireAdmin(req);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const snapshot = await buildEngagementSnapshot(parsed.data.periodDays);
  const { output, usedFallback, model } = await generateEngagementNarrative(snapshot, {
    headers: req.headers,
    adminUserId: session!.userId,
  });
  const html = renderEngagementReportHtml(snapshot, output, { usedFallback, model });
  const report = await insertEngagementReport({
    periodDays: snapshot.periodDays,
    snapshot,
    html,
    ai: output,
    createdBy: session!.userId,
    usedFallback,
    model,
  });

  return NextResponse.json({
    report: {
      id: report.id,
      periodDays: report.periodDays,
      html: report.html,
      createdAt: report.createdAt,
      usedFallback: report.usedFallback,
      model: report.model,
      surveyProposals: output.surveyProposals,
      narrative: {
        narrativeSections: output.narrativeSections,
        insights: output.insights,
        recommendations: output.recommendations,
      },
      snapshot,
    },
  });
});
