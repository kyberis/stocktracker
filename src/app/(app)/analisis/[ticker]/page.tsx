import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  companyAnalysisReportCacheKey,
  getCompanyAnalysisDbCache,
} from "@/lib/db";
import { analisisCryptoRedirectHref } from "@/lib/asset-detail-href";
import { parseIsinParam, parseTicker } from "@/lib/company-analysis/ticker";
import type { CompanyAnalysisReport } from "@/lib/company-analysis/types";
import { isLegacyEquityCacheForEtf } from "@/lib/company-analysis/instrument";
import {
  analisisTickerUrl,
  buildAnalisisTickerDescription,
  buildAnalisisTickerTitle,
} from "@/lib/company-analysis/seo";
import { disambiguateListing } from "@/lib/market-symbol";
import AnalisisSeoContent from "@/components/company-analysis/AnalisisSeoContent";
import AnalisisShell from "./analisis-shell";

interface PageProps {
  params: Promise<{ ticker: string }>;
  searchParams: Promise<{ exchange?: string; reportId?: string; isin?: string }>;
}

async function loadCachedReport(ticker: string): Promise<CompanyAnalysisReport | null> {
  try {
    for (const kind of ["etf", "equity"] as const) {
      const row = await getCompanyAnalysisDbCache(companyAnalysisReportCacheKey(ticker, kind));
      if (!row) continue;
      const report = JSON.parse(row.payloadJson) as CompanyAnalysisReport;
      if (!report?.ticker) continue;
      if (kind === "equity" && isLegacyEquityCacheForEtf(report)) continue;
      return report;
    }
    return null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { ticker: raw } = await params;
  const { exchange, isin: isinRaw } = await searchParams;
  const ticker = parseTicker(decodeURIComponent(raw));
  if (!ticker) {
    return {
      title: "Invalid ticker — trefolio",
      robots: { index: false, follow: false },
    };
  }

  const listing = disambiguateListing({
    ticker,
    exchange,
    isin: parseIsinParam(isinRaw),
  });
  const report = await loadCachedReport(listing.ticker);
  const title = buildAnalisisTickerTitle(ticker, report);
  const description = buildAnalisisTickerDescription(ticker, report);
  const url = analisisTickerUrl(ticker);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "trefolio",
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function CompanyAnalysisTickerPage({ params, searchParams }: PageProps) {
  const [{ ticker: raw }, { exchange, reportId, isin: isinRaw }] = await Promise.all([
    params,
    searchParams,
  ]);
  const decoded = decodeURIComponent(raw);
  const cryptoHref = analisisCryptoRedirectHref(decoded, exchange);
  if (cryptoHref) redirect(cryptoHref);

  const ticker = parseTicker(decoded);

  if (!ticker) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="card p-6 text-sm text-[color:var(--muted)]">
          Invalid ticker. Use a symbol matching A-Z, 0-9, dot or hyphen (max 10 chars).
        </div>
      </main>
    );
  }

  const isin = parseIsinParam(isinRaw);
  const listing = disambiguateListing({ ticker, exchange, isin });
  const report = await loadCachedReport(listing.ticker);

  return (
    <>
      <AnalisisSeoContent ticker={ticker} report={report} showAuthCta={false} />
      <AnalisisShell
        ticker={ticker}
        exchange={exchange || ""}
        reportId={reportId}
        isin={isin}
      />
    </>
  );
}
