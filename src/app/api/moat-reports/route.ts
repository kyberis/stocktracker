export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { requireFeatureAccess } from "@/lib/auth/guards";
import { saveMoatReport, listMoatReports } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/moat-reports", async (request: NextRequest) => {
  const { session, error } = await requireFeatureAccess(request, "stock-evaluation");
  if (error || !session) return error;

  const reports = await listMoatReports(session.userId);
  return Response.json(reports);
});

export const POST = withMetrics("/api/moat-reports", async (request: NextRequest) => {
  const { session, error } = await requireFeatureAccess(request, "stock-evaluation");
  if (error || !session) return error;

  let body: {
    symbol?: string;
    companyName?: string;
    evaluationJson?: string;
    totalScore?: number;
    maxScore?: number;
    verdict?: string;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.symbol || !body.evaluationJson) {
    return Response.json({ error: "symbol and evaluationJson required" }, { status: 400 });
  }

  const id = await saveMoatReport(
    session.userId,
    body.symbol,
    body.companyName || body.symbol,
    body.evaluationJson,
    body.totalScore ?? 0,
    body.maxScore ?? 100,
    body.verdict || "",
  );

  return Response.json({ id }, { status: 201 });
});
