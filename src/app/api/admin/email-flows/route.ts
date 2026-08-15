import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { withMetrics } from "@/lib/with-metrics";
import { enrichEmailFlows } from "@/lib/email-flows/enrich";

export const GET = withMetrics("/api/admin/email-flows", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const payload = await enrichEmailFlows();
  return NextResponse.json(payload);
});
