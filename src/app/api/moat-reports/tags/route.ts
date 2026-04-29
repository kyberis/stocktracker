export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { listDistinctMoatReportTags } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

/** Distinct tag values across the user's saved moat reports (for filter UI). */
export const GET = withMetrics("/api/moat-reports/tags", async (request: NextRequest) => {
  const { session, error } = await requireSession(request);
  if (error || !session) return error;

  const tags = await listDistinctMoatReportTags(session.userId);
  return Response.json({ tags });
});
