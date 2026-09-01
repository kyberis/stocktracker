"use client";

import type { ThesisFact, ThesisReport } from "@/lib/screening/thesis/schemas";
import { buildReadableThesis } from "@/lib/screening/thesis/readable";
import { fill } from "@/lib/screening/copy";
import {
  formatMetric,
  formatMetricValue,
  metricLocaleFromTag,
  type MetricUnit,
} from "@/lib/screening/thesis/metrics/format";
import { AiLabel, ScreeningDisclaimer } from "./ScreeningNotices";
import { useScreeningCopy } from "./use-screening-copy";

const METRIC_FACT_LABEL: Record<string, string> = {
  roic: "EQ:B1",
  interestCoverage: "EQ:E2",
  netDebtToEbitda: "EQ:E1",
  fcfToNetIncome: "EQ:D1",
  fcfYield: "calc:fcf_yield",
  revenueCagr: "EQ:C1",
  shareCountCagr: "EQ:D7",
  grossMarginVol: "EQ:B3",
  peCurrent: "calc:pe_current",
  peHistoric: "calc:hist_pe_avg",
  drawdown52w: "calc:drawdown_52w",
  targetUpside: "calc:upside_pct",
};

const FRACTION_FIELDS = new Set(["EQ:C1", "EQ:D7", "calc:fcf_yield"]);

function formatFactValue(
  fact: ThesisFact,
  locale: string,
): string {
  const loc = metricLocaleFromTag(locale);
  if (typeof fact.value === "boolean") return fact.value ? "yes" : "no";
  if (fact.value == null) return loc === "es" ? "n/d" : "n/a";
  if (typeof fact.value !== "number" || !Number.isFinite(fact.value)) {
    return String(fact.value);
  }
  if (fact.disputed) {
    return loc === "es" ? "n/d — dato no fiable" : "n/a — unreliable figure";
  }
  let n = fact.value;
  let unit = fact.unit as MetricUnit | undefined;
  if (FRACTION_FIELDS.has(fact.field_id) && Math.abs(n) <= 2) {
    n = n * 100;
    unit = "pct";
  }
  if (unit === "x" || unit === "pct" || unit === "pp" || unit === "usd" || unit === "count" || unit === "years") {
    const formatted = formatMetricValue(n, unit, loc);
    const label = fact.period?.fiscal_label;
    return label ? `${formatted} (${label})` : formatted;
  }
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function checkStatusLabel(
  status: "pass" | "fail" | "unknown" | "skipped",
  t: ReturnType<typeof useScreeningCopy>["copy"]["thesisReport"],
): string {
  switch (status) {
    case "pass":
      return t.checkStatusPass;
    case "fail":
      return t.checkStatusFail;
    case "skipped":
      return t.checkStatusSkipped;
    default:
      return t.checkStatusUnknown;
  }
}

function checkStatusClass(status: "pass" | "fail" | "unknown" | "skipped"): string {
  switch (status) {
    case "pass":
      return "bg-teal-500/15 text-teal-800 dark:text-teal-200";
    case "fail":
      return "bg-red-500/15 text-red-800 dark:text-red-300";
    case "skipped":
      return "bg-[color:var(--surface-soft)] text-[color:var(--muted)]";
    default:
      return "bg-amber-500/15 text-amber-900 dark:text-amber-200";
  }
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
          metrics: card.metrics,
        });
        const loc = metricLocaleFromTag(report.locale);
        const metricRows = card.metrics ?? [];
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

            {article.checks.length > 0 ? (
              <>
                <h3 className="mt-5 text-[13px] font-semibold text-[color:var(--foreground)]">
                  {report.locale.startsWith("es")
                    ? "Checks de atractivo"
                    : "Attractiveness checks"}
                </h3>
                <p className="mt-1 text-[12px] leading-relaxed text-[color:var(--muted)]">
                  {report.locale.startsWith("es")
                    ? "Cada bloque muestra el dato, cómo interpretarlo y qué es bueno o malo para este nombre."
                    : "Each block shows the figure, how to read it, and what is good or bad for this name."}
                </p>
                <div className="mt-2 space-y-3">
                  {article.checks.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)]/40 p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[13px] font-semibold text-[color:var(--foreground)]">
                          {c.title}
                        </p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${checkStatusClass(c.status)}`}
                        >
                          {checkStatusLabel(c.status, t)}
                        </span>
                      </div>
                      <p className="mt-2 text-[12px] text-[color:var(--foreground)]">
                        <span className="font-medium text-[color:var(--muted)]">
                          {t.checkDataLabel}:{" "}
                        </span>
                        {c.data}
                      </p>
                      <p className="mt-1.5 text-[12px] text-[color:var(--foreground)]">
                        <span className="font-medium text-[color:var(--muted)]">
                          {t.checkMeaningLabel}:{" "}
                        </span>
                        {c.meaning}
                      </p>
                      <p className="mt-1.5 text-[12px] text-[color:var(--foreground)]">
                        <span className="font-medium text-[color:var(--muted)]">
                          {t.checkInterpretationLabel}:{" "}
                        </span>
                        {c.interpretation}
                      </p>
                    </div>
                  ))}
                </div>
                <h3 className="mt-5 text-[13px] font-semibold text-[color:var(--foreground)]">
                  {report.locale.startsWith("es") ? "Conclusión" : "Conclusion"}
                </h3>
                <p className="mt-1 text-[14px] leading-relaxed text-[color:var(--foreground)]">
                  {article.conclusion}
                </p>
              </>
            ) : null}

            {article.whatHappened ? (
              <>
                <h3 className="mt-5 text-[13px] font-semibold text-[color:var(--foreground)]">
                  {t.sectionWhatHappened}
                </h3>
                <p className="mt-1 text-[14px] leading-relaxed text-[color:var(--foreground)]">
                  {article.whatHappened}
                </p>
              </>
            ) : null}

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

            {metricRows.length > 0 ? (
              <details className="mt-4">
                <summary className="cursor-pointer text-[12px] text-[color:var(--muted)]">
                  {t.sectionNumbers}
                </summary>
                <ul className="mt-2 list-none space-y-1 p-0 text-[12px] text-[color:var(--foreground)]">
                  {metricRows.map((m) => (
                    <li key={m.id}>
                      <span className="text-[color:var(--muted)]">
                        {t.factLabels[METRIC_FACT_LABEL[m.id] ?? ""] ?? m.id}:
                      </span>{" "}
                      {formatMetric(m, loc)}
                    </li>
                  ))}
                </ul>
              </details>
            ) : numberedFacts.length > 0 ? (
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
                      {formatFactValue(f, report.locale)}
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
