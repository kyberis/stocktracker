import type { Metadata } from "next";
import CompanyAnalysisSearch from "@/components/company-analysis/CompanyAnalysisSearch";
import { JsonLd } from "@/components/JsonLd";
import { buildAnalisisHubMetadata, ANALISIS_HUB_URL } from "@/lib/company-analysis/seo";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export const metadata: Metadata = buildAnalisisHubMetadata();

export default async function CompanyAnalysisPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Stock analysis — trefolio",
          description:
            "Search a ticker for company analysis: fundamentals, technicals, news, and AI narrative. Informational only — not investment advice.",
          url: ANALISIS_HUB_URL,
          isPartOf: {
            "@type": "WebSite",
            name: "trefolio",
            url: "https://trefolio.com",
          },
        }}
      />
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-[color:var(--foreground)]">
          Stock analysis
        </h1>
        <p className="text-sm text-[color:var(--muted)]">
          Search a US-listed ticker for fundamentals, technicals, news, and an AI narrative.
          Market data and AI output are for informational purposes only — not investment advice.
        </p>
      </header>
      <CompanyAnalysisSearch initialQuery={q?.trim() || ""} />
    </main>
  );
}
