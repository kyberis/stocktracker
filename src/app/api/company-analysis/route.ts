export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { jsonWithCallCount } from "@/lib/api-providers/response";
import { requireFeatureQuota, requireRateLimit, requireSession } from "@/lib/auth/guards";
import { refundFeatureQuota } from "@/lib/feature-quotas";
import {
  buildFullReport,
  buildGapFillReport,
  hasFmpKey,
} from "@/lib/company-analysis/build-report";
import {
  COMPANY_ANALYSIS_WEEK_MS,
  getCompanyAnalysisCache,
  setCompanyAnalysisCache,
} from "@/lib/company-analysis/cache";
import {
  findReportGaps,
  mergeReportFill,
  WEEK_MS,
} from "@/lib/company-analysis/gaps";
import { parseTicker } from "@/lib/company-analysis/ticker";
import type { CompanyAnalysisReport } from "@/lib/company-analysis/types";
import {
  companyAnalysisReportCacheKey,
  getCompanyAnalysisDbCache,
  upsertCompanyAnalysisDbCache,
} from "@/lib/db";
import { json401 } from "@/lib/log-unauthorized";
import { recordMarketDataUsageAsync } from "@/lib/market-data/record-usage";
import {
  resolveFundamentalsProvider,
  resolvePremiumStockDataProvider,
} from "@/lib/market-data/resolve-provider";
import { deferTask } from "@/lib/task-runner";
import { withMetrics } from "@/lib/with-metrics";

function memCacheKey(ticker: string): string {
  return `company-analysis:${ticker}`;
}

function expiresAtIso(fromMs = Date.now()): string {
  return new Date(fromMs + WEEK_MS).toISOString();
}

function withCacheFlag(report: CompanyAnalysisReport, cached: boolean): CompanyAnalysisReport {
  return { ...report, cached };
}

async function loadDurableReport(ticker: string): Promise<{
  report: CompanyAnalysisReport;
  generatedAt: string;
  expiresAt: string;
} | null> {
  const mem = getCompanyAnalysisCache<CompanyAnalysisReport>(memCacheKey(ticker));
  if (mem?.generatedAt) {
    return {
      report: mem,
      generatedAt: mem.generatedAt,
      expiresAt: expiresAtIso(Date.parse(mem.generatedAt) || Date.now()),
    };
  }

  const row = await getCompanyAnalysisDbCache(companyAnalysisReportCacheKey(ticker));
  if (!row) return null;
  try {
    const report = JSON.parse(row.payloadJson) as CompanyAnalysisReport;
    if (!report?.ticker || !report?.fundamentals) return null;
    const generatedAt = report.generatedAt || row.generatedAt;
    const normalized = {
      ...report,
      generatedAt,
      updatedAt: report.updatedAt || row.updatedAt,
    };
    setCompanyAnalysisCache(memCacheKey(ticker), normalized, COMPANY_ANALYSIS_WEEK_MS);
    return { report: normalized, generatedAt, expiresAt: row.expiresAt };
  } catch {
    return null;
  }
}

async function persistReport(
  report: CompanyAnalysisReport,
  generatedAt: string,
  expiresAt: string,
): Promise<void> {
  setCompanyAnalysisCache(memCacheKey(report.ticker), report, COMPANY_ANALYSIS_WEEK_MS);
  await upsertCompanyAnalysisDbCache({
    cacheKey: companyAnalysisReportCacheKey(report.ticker),
    ticker: report.ticker,
    kind: "report",
    payload: report,
    generatedAt,
    expiresAt,
  });
}

export const GET = withMetrics("/api/company-analysis", async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const ticker = parseTicker(searchParams.get("symbol") ?? searchParams.get("ticker"));
  if (!ticker) {
    return Response.json(
      { error: "Valid ticker required (pattern ^[A-Z0-9.\\-]{1,10}$)" },
      { status: 400 },
    );
  }

  const fresh = searchParams.get("fresh") === "1";

  if (!fresh) {
    const durable = await loadDurableReport(ticker);
    if (durable) {
      const { error: sessionErr } = await requireSession(request);
      if (sessionErr) return sessionErr;

      const gaps = findReportGaps(durable.report);
      if (gaps.length === 0) {
        return Response.json(withCacheFlag(durable.report, true), {
          headers: { "Cache-Control": "private, max-age=3600" },
        });
      }

      // Partial refill for unavailable sections only — no company_analysis quota.
      const { session } = await requireSession(request);
      const rl = await requireRateLimit(request, "fmp");
      if (rl.error) {
        return Response.json(withCacheFlag(durable.report, true), {
          headers: { "Cache-Control": "private, max-age=3600" },
        });
      }

      const fundamentalsResolved = await resolveFundamentalsProvider(session?.userId ?? null);
      const premiumResolved = await resolvePremiumStockDataProvider(
        session?.userId ?? null,
        "intelligence",
      );
      const provider = fundamentalsResolved.provider;
      const intelProvider = premiumResolved?.provider ?? provider;

      try {
        const fill = await buildGapFillReport(
          ticker,
          gaps,
          {
            provider,
            intelProvider,
            usedYahoo: fundamentalsResolved.backend === "yahoo" || !premiumResolved,
            usedFmp: Boolean(premiumResolved) || hasFmpKey(),
          },
          durable.generatedAt,
        );
        const merged = withCacheFlag(
          {
            ...mergeReportFill(durable.report, fill),
            generatedAt: durable.generatedAt,
            updatedAt: new Date().toISOString(),
          },
          true,
        );
        await persistReport(merged, durable.generatedAt, durable.expiresAt);
        return jsonWithCallCount(provider, merged, {
          headers: { "Cache-Control": "private, max-age=3600" },
        });
      } catch (err) {
        console.warn(
          "[company-analysis] gap fill failed:",
          err instanceof Error ? err.message : err,
        );
        return Response.json(withCacheFlag(durable.report, true), {
          headers: { "Cache-Control": "private, max-age=3600" },
        });
      } finally {
        const count = (provider.callCount ?? 0) + (intelProvider.callCount ?? 0);
        if (session?.userId && count > 0) {
          const backend = premiumResolved?.backend ?? fundamentalsResolved.backend;
          if (backend === "fmp") {
            deferTask(() => recordMarketDataUsageAsync(session.userId, "fmp", count));
          }
        }
      }
    }
  }

  const { session, error } = await requireFeatureQuota(request, "company_analysis");
  if (error) return error;
  if (!session) return json401(request, { source: "api/company-analysis", reason: "no_session" });

  const rl = await requireRateLimit(request, "fmp");
  if (rl.error) {
    await refundFeatureQuota(session.userId, "company_analysis");
    return rl.error;
  }

  const fundamentalsResolved = await resolveFundamentalsProvider(session.userId);
  const premiumResolved = await resolvePremiumStockDataProvider(session.userId, "intelligence");
  const provider = fundamentalsResolved.provider;
  const intelProvider = premiumResolved?.provider ?? provider;

  try {
    const generatedAt = new Date().toISOString();
    const report = await buildFullReport(
      ticker,
      {
        provider,
        intelProvider,
        usedYahoo: fundamentalsResolved.backend === "yahoo" || !premiumResolved,
        usedFmp: Boolean(premiumResolved) || hasFmpKey(),
      },
      generatedAt,
    );

    if (!report) {
      await refundFeatureQuota(session.userId, "company_analysis");
      return Response.json(
        { error: `No market data available for ${ticker}` },
        { status: 404 },
      );
    }

    await persistReport(report, generatedAt, expiresAtIso());

    return jsonWithCallCount(provider, report, {
      headers: { "Cache-Control": "private, max-age=3600" },
    });
  } catch (err) {
    console.error("[company-analysis] Error:", err instanceof Error ? err.message : err);
    await refundFeatureQuota(session.userId, "company_analysis");
    return Response.json({ error: "Failed to build company analysis" }, { status: 500 });
  } finally {
    const count = (provider.callCount ?? 0) + (intelProvider.callCount ?? 0);
    if (session.userId && count > 0) {
      const backend = premiumResolved?.backend ?? fundamentalsResolved.backend;
      if (backend === "fmp") {
        deferTask(() => recordMarketDataUsageAsync(session.userId, "fmp", count));
      }
    }
  }
});
