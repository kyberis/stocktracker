export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { jsonWithCallCount } from "@/lib/api-providers/response";
import { requireFeatureQuota, requireRateLimit } from "@/lib/auth/guards";
import { getSessionFromRequest } from "@/lib/auth/session";
import { refundFeatureQuota } from "@/lib/feature-quotas";
import {
  buildFullReport,
  buildGapFillReport,
  hasFmpKey,
} from "@/lib/company-analysis/build-report";
import {
  COMPANY_ANALYSIS_L1_TTL_MS,
  deleteCompanyAnalysisCacheKey,
  getCompanyAnalysisCache,
  setCompanyAnalysisCache,
} from "@/lib/company-analysis/cache";
import {
  findReportGaps,
  mergeReportFill,
  WEEK_MS,
} from "@/lib/company-analysis/gaps";
import { withLiveQuote } from "@/lib/company-analysis/live-quote";
import { COMPANY_ANALYSIS_RESPONSE_HEADERS } from "@/lib/company-analysis/http";
import { redactPaidSections } from "@/lib/company-analysis/redact";
import { parseTicker } from "@/lib/company-analysis/ticker";
import type { CompanyAnalysisReport } from "@/lib/company-analysis/types";
import {
  companyAnalysisReportCacheKey,
  deleteCompanyAnalysisDbCacheForTicker,
  getCompanyAnalysisDbCache,
  upsertCompanyAnalysisDbCache,
} from "@/lib/db";
import { json401 } from "@/lib/log-unauthorized";
import { recordMarketDataUsageAsync } from "@/lib/market-data/record-usage";
import {
  resolveFundamentalsProvider,
  resolvePremiumStockDataProvider,
} from "@/lib/market-data/resolve-provider";
import {
  checkPublicAnalysisBuildGlobalBudget,
  checkPublicAnalysisBuildRateLimit,
  checkPublicAnalysisReadRateLimit,
  getClientIp,
  incrementPublicAnalysisBuildGlobalBudget,
} from "@/lib/rate-limit";
import { deferTask } from "@/lib/task-runner";
import { withMetrics } from "@/lib/with-metrics";

function memCacheKey(ticker: string): string {
  return `company-analysis:${ticker}`;
}

function expiresAtIso(fromMs = Date.now()): string {
  return new Date(fromMs + WEEK_MS).toISOString();
}

/** Cached report body + live quote overlay (not written back to durable cache). */
async function respondCachedReport(report: CompanyAnalysisReport): Promise<Response> {
  const withQuote = await withLiveQuote(report);
  return Response.json(withCacheFlag(withQuote, true), {
    headers: COMPANY_ANALYSIS_RESPONSE_HEADERS,
  });
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
    setCompanyAnalysisCache(memCacheKey(ticker), normalized, COMPANY_ANALYSIS_L1_TTL_MS);
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
  setCompanyAnalysisCache(memCacheKey(report.ticker), report, COMPANY_ANALYSIS_L1_TTL_MS);
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
  const session = await getSessionFromRequest(request);

  // Regeneration is always a real, session-gated action — never available anonymously.
  if (fresh && !session) {
    return json401(request, { source: "api/company-analysis", reason: "fresh_requires_session" });
  }

  if (!session) {
    const ip = getClientIp(request);
    const readLimit = await checkPublicAnalysisReadRateLimit(ip);
    if (!readLimit.allowed) {
      return Response.json(
        { error: "Too many requests, please try again shortly." },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }
  }

  if (!fresh) {
    const durable = await loadDurableReport(ticker);
    if (durable) {
      const gaps = findReportGaps(durable.report);

      // Anonymous reads never attempt a gap-fill (that path is user-rate-limited
      // and provider-metered) — serve the durable report as-is, redacted, with
      // a live quote overlay (price is not day-cached).
      if (gaps.length === 0 || !session) {
        const payload = session ? durable.report : redactPaidSections(durable.report);
        return respondCachedReport(payload);
      }

      // Partial refill for unavailable sections only — no company_analysis quota.
      const rl = await requireRateLimit(request, "fmp");
      if (rl.error) {
        return respondCachedReport(durable.report);
      }

      const fundamentalsResolved = await resolveFundamentalsProvider(session.userId);
      const premiumResolved = await resolvePremiumStockDataProvider(
        session.userId,
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
        const withQuote = await withLiveQuote(merged);
        return jsonWithCallCount(provider, withQuote, {
          headers: { ...COMPANY_ANALYSIS_RESPONSE_HEADERS },
        });
      } catch (err) {
        console.warn(
          "[company-analysis] gap fill failed:",
          err instanceof Error ? err.message : err,
        );
        return respondCachedReport(durable.report);
      } finally {
        const count = (provider.callCount ?? 0) + (intelProvider.callCount ?? 0);
        if (count > 0) {
          const backend = premiumResolved?.backend ?? fundamentalsResolved.backend;
          if (backend === "fmp") {
            deferTask(() => recordMarketDataUsageAsync(session.userId, "fmp", count));
          }
        }
      }
    }
  }

  // Cache miss (or fresh=1, which already required a session above).
  if (!session) {
    return buildForAnonymousVisitor(request, ticker);
  }

  const { error } = await requireFeatureQuota(request, "company_analysis");
  if (error) return error;

  if (fresh) {
    deleteCompanyAnalysisCacheKey(memCacheKey(ticker));
    await deleteCompanyAnalysisDbCacheForTicker(ticker);
  }

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
      headers: { ...COMPANY_ANALYSIS_RESPONSE_HEADERS },
    });
  } catch (err) {
    console.error("[company-analysis] Error:", err instanceof Error ? err.message : err);
    await refundFeatureQuota(session.userId, "company_analysis");
    return Response.json({ error: "Failed to build company analysis" }, { status: 500 });
  } finally {
    const count = (provider.callCount ?? 0) + (intelProvider.callCount ?? 0);
    if (count > 0) {
      const backend = premiumResolved?.backend ?? fundamentalsResolved.backend;
      if (backend === "fmp") {
        deferTask(() => recordMarketDataUsageAsync(session.userId, "fmp", count));
      }
    }
  }
});

/**
 * A never-before-cached ticker requested by an anonymous visitor. No
 * per-user quota exists to charge (there's no user), so this is gated by an
 * IP rate limit plus a global daily budget instead — the shared cache this
 * writes to benefits every future visitor, logged in or not.
 */
async function buildForAnonymousVisitor(request: NextRequest, ticker: string): Promise<Response> {
  const ip = getClientIp(request);

  const ipLimit = await checkPublicAnalysisBuildRateLimit(ip);
  if (!ipLimit.allowed) {
    return Response.json(
      { error: "Too many new-ticker requests, please try again later." },
      { status: 429, headers: { "Retry-After": "3600" } },
    );
  }

  const globalBudget = await checkPublicAnalysisBuildGlobalBudget();
  if (!globalBudget.allowed) {
    return Response.json(
      { error: "This ticker hasn't been analyzed yet and today's public analysis budget is used up — try again tomorrow, or log in." },
      { status: 429 },
    );
  }

  const fundamentalsResolved = await resolveFundamentalsProvider(null);
  const premiumResolved = await resolvePremiumStockDataProvider(null, "intelligence");
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
      return Response.json({ error: `No market data available for ${ticker}` }, { status: 404 });
    }

    await persistReport(report, generatedAt, expiresAtIso());
    await incrementPublicAnalysisBuildGlobalBudget();

    return jsonWithCallCount(provider, redactPaidSections(report), {
      headers: { ...COMPANY_ANALYSIS_RESPONSE_HEADERS },
    });
  } catch (err) {
    console.error("[company-analysis] anonymous build error:", err instanceof Error ? err.message : err);
    return Response.json({ error: "Failed to build company analysis" }, { status: 500 });
  }
}
