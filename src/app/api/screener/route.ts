import { NextRequest, NextResponse } from "next/server";
import { requireFeatureAccess } from "@/lib/auth/guards";
import {
  queryScreener,
  getScreenerDistinctSectors,
  getScreenerDistinctCountries,
  getScreenerDistinctExchanges,
  getScreenerDistinctIndustries,
  getScreenerCacheCount,
} from "@/lib/db";
import type { ScreenerFilters } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { session, error } = await requireFeatureAccess(request, "screener");
  if (error) return error;

  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (action === "meta") {
    const sectorParam = url.searchParams.get("sector") || undefined;
    const [sectors, countries, exchanges, industries, total] = await Promise.all([
      getScreenerDistinctSectors(),
      getScreenerDistinctCountries(),
      getScreenerDistinctExchanges(),
      getScreenerDistinctIndustries(sectorParam),
      getScreenerCacheCount(),
    ]);
    return NextResponse.json({ sectors, countries, exchanges, industries, total });
  }

  const filters: ScreenerFilters = {};

  const sector = url.searchParams.get("sector");
  if (sector) filters.sector = sector;

  const industry = url.searchParams.get("industry");
  if (industry) filters.industry = industry;

  const divYieldMin = url.searchParams.get("divYieldMin");
  if (divYieldMin) filters.divYieldMin = parseFloat(divYieldMin);

  const divYieldMax = url.searchParams.get("divYieldMax");
  if (divYieldMax) filters.divYieldMax = parseFloat(divYieldMax);

  const peMin = url.searchParams.get("peMin");
  if (peMin) filters.peMin = parseFloat(peMin);

  const peMax = url.searchParams.get("peMax");
  if (peMax) filters.peMax = parseFloat(peMax);

  const marketCap = url.searchParams.get("marketCap") as ScreenerFilters["marketCap"];
  if (marketCap && ["mega", "large", "mid", "small", "micro"].includes(marketCap)) {
    filters.marketCap = marketCap;
  }

  const exchange = url.searchParams.get("exchange");
  if (exchange) filters.exchange = exchange;

  const country = url.searchParams.get("country");
  if (country) filters.country = country;

  const sortBy = url.searchParams.get("sortBy");
  if (sortBy) filters.sortBy = sortBy;

  const sortDir = url.searchParams.get("sortDir") as "asc" | "desc" | null;
  if (sortDir === "asc" || sortDir === "desc") filters.sortDir = sortDir;

  const page = url.searchParams.get("page");
  if (page) filters.page = parseInt(page, 10);

  const limit = url.searchParams.get("limit");
  if (limit) filters.limit = parseInt(limit, 10);

  const data = await queryScreener(filters);
  return NextResponse.json(data);
}
