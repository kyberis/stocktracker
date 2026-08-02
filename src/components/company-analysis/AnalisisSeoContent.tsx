import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import type { CompanyAnalysisReport } from "@/lib/company-analysis/types";
import {
  ANALISIS_FINANCIAL_DISCLAIMER,
  ANALISIS_HUB_URL,
  buildAnalisisTickerJsonLd,
} from "@/lib/company-analysis/seo";

/**
 * Server-rendered summary for crawlers and LLMs.
 * Never includes price, change %, or market cap — those load client-side only
 * and are marked data-nosnippet so search snippets stay stable.
 */
export default function AnalisisSeoContent({
  ticker,
  report,
}: {
  ticker: string;
  report: CompanyAnalysisReport | null;
}) {
  const name = report?.profile?.name?.trim() || ticker;
  const description =
    report?.profile?.description?.trim() ||
    `${name} (${ticker}) company analysis on trefolio — fundamentals, technicals, news, and AI narrative for European investors.`;
  const sector = report?.profile?.sector?.trim();
  const industry = report?.profile?.industry?.trim();
  const exchange = report?.profile?.exchange?.trim();
  const schemas = buildAnalisisTickerJsonLd({ ticker, report });

  return (
    <>
      {schemas.map((data, i) => (
        <JsonLd key={i} data={data} />
      ))}
      <article className="mx-auto max-w-6xl space-y-3 px-4 pt-6 sm:px-6">
        <nav aria-label="Breadcrumb" className="text-xs text-[color:var(--muted)]">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href={ANALISIS_HUB_URL} className="underline-offset-2 hover:underline">
                Stock analysis
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-[color:var(--foreground)]">
              {name} ({ticker})
            </li>
          </ol>
        </nav>
        <h1 className="text-xl font-bold tracking-tight text-[color:var(--foreground)] sm:text-2xl">
          {name} ({ticker}) stock analysis
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-[color:var(--muted)]">
          {description.length > 600 ? `${description.slice(0, 597)}…` : description}
        </p>
        {(sector || industry || exchange) && (
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[color:var(--foreground)]">
            {exchange && (
              <li>
                <span className="text-[color:var(--muted)]">Exchange:</span> {exchange}
              </li>
            )}
            {sector && (
              <li>
                <span className="text-[color:var(--muted)]">Sector:</span> {sector}
              </li>
            )}
            {industry && (
              <li>
                <span className="text-[color:var(--muted)]">Industry:</span> {industry}
              </li>
            )}
          </ul>
        )}
        <p className="text-xs leading-relaxed text-[color:var(--muted)]">{ANALISIS_FINANCIAL_DISCLAIMER}</p>
        <p className="text-xs text-[color:var(--muted)]">
          <Link href="/signup" className="underline-offset-2 hover:underline">
            Sign up free
          </Link>
          {" · "}
          <Link href="/login" className="underline-offset-2 hover:underline">
            Log in
          </Link>
          {" for live charts, AI narrative, and portfolio tools."}
        </p>
      </article>
    </>
  );
}
