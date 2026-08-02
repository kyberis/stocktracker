import type { CompanyAnalysisReport } from "@/lib/company-analysis/types";

export const ANALISIS_HUB_URL = "https://trefolio.com/analisis";

export function analisisTickerUrl(ticker: string): string {
  return `${ANALISIS_HUB_URL}/${encodeURIComponent(ticker.toUpperCase())}`;
}

export function buildAnalisisHubMetadata() {
  const title = "Stock analysis — trefolio";
  const description =
    "trefolio company analysis for European investors. Search a ticker for fundamentals, technicals, news, and AI narrative. Free to start — not investment advice.";
  return {
    title,
    description,
    alternates: { canonical: ANALISIS_HUB_URL },
    openGraph: {
      title,
      description,
      url: ANALISIS_HUB_URL,
      siteName: "trefolio",
      locale: "en_US",
      type: "website" as const,
    },
    twitter: {
      card: "summary_large_image" as const,
      title,
      description,
    },
  };
}

/**
 * Pure metadata builders for indexable HTML.
 * Never include live quote fields (price, change, marketCap) — they change
 * constantly and must not appear in titles, descriptions, or JSON-LD.
 */
export function buildAnalisisTickerTitle(ticker: string, report: CompanyAnalysisReport | null): string {
  const name = report?.profile?.name?.trim();
  if (name) return `${name} (${ticker}) stock analysis — trefolio`;
  return `${ticker} stock analysis — trefolio`;
}

export function buildAnalisisTickerDescription(
  ticker: string,
  report: CompanyAnalysisReport | null,
): string {
  const name = report?.profile?.name?.trim() || ticker;
  const sector = report?.profile?.sector?.trim();
  const industry = report?.profile?.industry?.trim();
  const bits = [
    `${name} company analysis on trefolio`,
    sector ? `Sector: ${sector}` : null,
    industry ? `Industry: ${industry}` : null,
    "Fundamentals, technicals, news, and AI narrative for European investors",
    "Informational only — not investment advice. Free to start.",
  ].filter(Boolean);
  return bits.join(". ") + ".";
}

export function buildAnalisisTickerJsonLd(args: {
  ticker: string;
  report: CompanyAnalysisReport | null;
}): Record<string, unknown>[] {
  const { ticker, report } = args;
  const url = analisisTickerUrl(ticker);
  const name = report?.profile?.name?.trim() || ticker;
  const description =
    report?.profile?.description?.trim() ||
    `${name} (${ticker}) stock analysis on trefolio — fundamentals, technicals, and AI narrative. Not investment advice.`;

  const corporation: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Corporation",
    name,
    tickerSymbol: ticker,
    description: description.slice(0, 500),
    url,
  };
  if (report?.profile?.exchange) {
    corporation.exchange = report.profile.exchange;
  }

  const webPage: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: buildAnalisisTickerTitle(ticker, report),
    description: buildAnalisisTickerDescription(ticker, report),
    url,
    isPartOf: {
      "@type": "WebSite",
      name: "trefolio",
      url: "https://trefolio.com",
    },
  };

  const breadcrumb: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Stock analysis",
        item: ANALISIS_HUB_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: `${name} (${ticker})`,
        item: url,
      },
    ],
  };

  return [corporation, webPage, breadcrumb];
}

export const ANALISIS_FINANCIAL_DISCLAIMER =
  "trefolio is not a financial advisor. Market data and AI narratives are for informational purposes only and may contain errors. Past performance does not guarantee future results. This is not investment advice.";
