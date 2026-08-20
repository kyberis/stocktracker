"use client";

import type { ThesisReport } from "@/lib/screening/thesis/schemas";
import { buildReadableThesis } from "@/lib/screening/thesis/readable";
import { fill } from "@/lib/screening/copy";
import { AiLabel, ScreeningDisclaimer } from "./ScreeningNotices";
import { useScreeningCopy } from "./use-screening-copy";

function formatFactValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  if (value == null) return "—";
  return String(value);
}

export function ThesisReportView({ report }: { report: ThesisReport }) {
  const { copy } = useScreeningCopy();
  const t = copy.thesisReport;

  return (
    <article className="space-y-6">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-300">
          {t.eyebrow}
        </p>
        <h1 className="mt-1 text-xl font-bold text-[color:var(--foreground)]">{t.title}</h1>
        <p className="mt-2 text-[13px] text-[color:var(--muted)]">{t.subtitle}</p>
        <div className="mt-2">
          <AiLabel />
        </div>
      </header>

      {report.cards.map((card) => {
        const article = buildReadableThesis({
          locale: report.locale,
          companyName: card.companyName,
          ticker: card.ticker,
          industry: card.industry,
          businessSummary: card.businessSummary,
          assessment: card.assessment,
          facts: card.facts,
          soft: card.soft_assessments,
          draft: card.thesis_draft,
        });
        const numberedFacts = card.facts
          .filter((f) => f.value != null && typeof f.value !== "boolean")
          .slice(0, 16);

        return (
          <section
            key={card.ticker}
            className="card rounded-[20px] border border-[color:var(--border)] p-4 sm:p-5"
          >
            <h2 className="text-base font-bold text-[color:var(--foreground)]">
              {card.companyName}{" "}
              <span className="font-mono text-[13px] text-[color:var(--muted)]">
                {card.ticker}
              </span>
            </h2>
            <p className="mt-2 text-[15px] font-semibold leading-snug text-[color:var(--foreground)]">
              {article.headline}
            </p>
            {card.assessment.total != null ? (
              <p className="mt-1 text-[12px] text-[color:var(--muted)]">
                {fill(t.filingSnapshot, { score: Math.round(card.assessment.total) })}
              </p>
            ) : null}

            <h3 className="mt-5 text-[13px] font-semibold text-[color:var(--foreground)]">
              {t.sectionBusiness}
            </h3>
            <p className="mt-1 text-[14px] leading-relaxed text-[color:var(--foreground)]">
              {article.business}
            </p>

            {article.strengths.length > 0 ? (
              <>
                <h3 className="mt-5 text-[13px] font-semibold text-[color:var(--foreground)]">
                  {t.sectionStrengths}
                </h3>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-[13px] text-[color:var(--foreground)]">
                  {article.strengths.map((s) => (
                    <li key={s.text}>{s.text}</li>
                  ))}
                </ul>
              </>
            ) : null}

            {article.weaknesses.length > 0 ? (
              <>
                <h3 className="mt-5 text-[13px] font-semibold text-[color:var(--foreground)]">
                  {t.sectionWeaknesses}
                </h3>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-[13px] text-[color:var(--foreground)]">
                  {article.weaknesses.map((s) => (
                    <li key={s.text}>{s.text}</li>
                  ))}
                </ul>
              </>
            ) : null}

            <h3 className="mt-5 text-[13px] font-semibold text-[color:var(--foreground)]">
              {t.sectionOutlook}
            </h3>
            <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--foreground)]">
              {article.outlook}
            </p>

            {article.invalidation ? (
              <>
                <h3 className="mt-5 text-[13px] font-semibold text-[color:var(--foreground)]">
                  {t.sectionInvalidation}
                </h3>
                <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--foreground)]">
                  {article.invalidation}
                </p>
              </>
            ) : null}

            {article.openQuestions ? (
              <>
                <h3 className="mt-5 text-[13px] font-semibold text-[color:var(--foreground)]">
                  {t.sectionOpen}
                </h3>
                <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--muted)]">
                  {article.openQuestions}
                </p>
              </>
            ) : null}

            <p className="mt-4 text-[12px] text-[color:var(--muted)]">
              {t.horizon}: {fill(t.horizonHint, { value: article.horizonMonths })}
              {" · "}
              {t.conviction}:{" "}
              {fill(t.convictionHint, { value: article.conviction })}
            </p>

            {numberedFacts.length > 0 ? (
              <details className="mt-4">
                <summary className="cursor-pointer text-[12px] text-[color:var(--muted)]">
                  {t.sectionNumbers}
                </summary>
                <ul className="mt-2 list-none space-y-1 p-0 text-[12px] text-[color:var(--foreground)]">
                  {numberedFacts.map((f) => (
                    <li key={f.field_id}>
                      <span className="text-[color:var(--muted)]">
                        {t.factLabels[f.field_id] ?? f.field_id}:
                      </span>{" "}
                      {formatFactValue(f.value)}
                      {f.unit && f.unit !== "flag" && f.unit !== "ratio"
                        ? ` ${f.unit}`
                        : ""}
                    </li>
                  ))}
                </ul>
              </details>
            ) : (
              <p className="mt-3 text-[12px] text-[color:var(--muted)]">{t.noFacts}</p>
            )}
          </section>
        );
      })}

      <p className="text-[12px] text-[color:var(--muted)]">{report.disclaimer}</p>
      <ScreeningDisclaimer />
    </article>
  );
}
