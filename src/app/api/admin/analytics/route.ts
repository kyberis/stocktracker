import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { getAnalyticsSummary, getUtmTaxonomyConfig } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/admin/analytics", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const url = new URL(req.url);
  const days = Math.min(Math.max(Number(url.searchParams.get("days")) || 30, 1), 365);

  const [summary, utmTaxonomy] = await Promise.all([
    getAnalyticsSummary(days),
    getUtmTaxonomyConfig(),
  ]);

  const approvedSources = new Set(utmTaxonomy.sources.map((s) => s.toLowerCase()));
  const approvedMediums = new Set(utmTaxonomy.mediums.map((m) => m.toLowerCase()));

  const nonApprovedSources = summary.attributionBySource
    .filter((row) => row.source !== "unknown" && !approvedSources.has(row.source))
    .map((row) => ({ value: row.source, signups: row.signups }))
    .sort((a, b) => b.signups - a.signups);

  const nonApprovedMediums = summary.attributionByMedium
    .filter((row) => row.medium !== "unknown" && !approvedMediums.has(row.medium))
    .map((row) => ({ value: row.medium, signups: row.signups }))
    .sort((a, b) => b.signups - a.signups);

  const unknownSourceSignups = summary.attributionBySource
    .find((row) => row.source === "unknown")?.signups ?? 0;
  const unknownMediumSignups = summary.attributionByMedium
    .find((row) => row.medium === "unknown")?.signups ?? 0;

  return NextResponse.json({
    ...summary,
    utmValidation: {
      approved: {
        sources: utmTaxonomy.sources,
        mediums: utmTaxonomy.mediums,
      },
      unknown: {
        sourcesSignups: unknownSourceSignups,
        mediumsSignups: unknownMediumSignups,
      },
      nonApproved: {
        sources: nonApprovedSources,
        mediums: nonApprovedMediums,
      },
    },
  });
});
