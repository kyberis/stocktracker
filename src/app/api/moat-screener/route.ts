export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { queryMoatCache, getMoatCacheMeta } from "@/lib/db";
import type { MoatScreenerFilters } from "@/lib/db";
import type { CriterionStatus } from "@/lib/types";
import { withMetrics } from "@/lib/with-metrics";

const VALID_STATUSES = new Set<string>(["pass", "warning", "fail"]);

function parseStatus(val: string | null): CriterionStatus | undefined {
  return val && VALID_STATUSES.has(val) ? (val as CriterionStatus) : undefined;
}

export const GET = withMetrics("/api/moat-screener", async (request: NextRequest) => {
  const { session, error } = await requireSession(request);
  if (error || !session) return error;

  const { searchParams } = new URL(request.url);

  if (searchParams.get("action") === "meta") {
    const meta = await getMoatCacheMeta();
    return Response.json(meta, {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  }

  const filters: MoatScreenerFilters = {};

  const scoreMin = searchParams.get("scoreMin");
  if (scoreMin) filters.scoreMin = Number(scoreMin);
  const scoreMax = searchParams.get("scoreMax");
  if (scoreMax) filters.scoreMax = Number(scoreMax);

  filters.verdict = searchParams.get("verdict") || undefined;
  filters.sector = searchParams.get("sector") || undefined;
  filters.industry = searchParams.get("industry") || undefined;

  const peMin = searchParams.get("peMin");
  if (peMin) filters.peMin = Number(peMin);
  const peMax = searchParams.get("peMax");
  if (peMax) filters.peMax = Number(peMax);
  const marketCapMin = searchParams.get("marketCapMin");
  if (marketCapMin) {
    const n = Number(marketCapMin);
    if (Number.isFinite(n)) filters.marketCapMin = n;
  }
  const marketCapMax = searchParams.get("marketCapMax");
  if (marketCapMax) {
    const n = Number(marketCapMax);
    if (Number.isFinite(n)) filters.marketCapMax = n;
  }
  const priceMin = searchParams.get("priceMin");
  if (priceMin) filters.priceMin = Number(priceMin);
  const priceMax = searchParams.get("priceMax");
  if (priceMax) filters.priceMax = Number(priceMax);

  filters.earningsConsistency = parseStatus(searchParams.get("earningsConsistency"));
  filters.grossMargin = parseStatus(searchParams.get("grossMargin"));
  filters.netMargin = parseStatus(searchParams.get("netMargin"));
  filters.retainedEarnings = parseStatus(searchParams.get("retainedEarnings"));
  filters.returnOnEquity = parseStatus(searchParams.get("returnOnEquity"));
  filters.debtSustainability = parseStatus(searchParams.get("debtSustainability"));
  filters.capexEfficiency = parseStatus(searchParams.get("capexEfficiency"));
  filters.productDurability = parseStatus(searchParams.get("productDurability"));

  filters.sortBy = searchParams.get("sortBy") || "score";
  filters.sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";
  filters.page = Number(searchParams.get("page")) || 1;
  filters.limit = Number(searchParams.get("limit")) || 20;

  const result = await queryMoatCache(filters);
  return Response.json(result, {
    headers: { "Cache-Control": "private, max-age=60" },
  });
});
