import { NextRequest, NextResponse } from "next/server";

import { getWarrenOpsMetrics } from "@/lib/db/ops-metrics";

export const dynamic = "force-dynamic";

/**
 * Service-to-service metrics for trefolio-accounts ops digest.
 * Auth: Bearer IDP_SERVICE_TOKEN (same secret as other IdP → product calls).
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const [scheme, token] = auth.split(" ");
  const expected = process.env.IDP_SERVICE_TOKEN?.trim();
  if (!expected || scheme !== "Bearer" || token !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const totals = await getWarrenOpsMetrics();
  const totalsRecord: Record<string, number> = { ...totals };
  return NextResponse.json({
    product: "trefolio" as const,
    generatedAt: new Date().toISOString(),
    totals: totalsRecord,
  });
}
