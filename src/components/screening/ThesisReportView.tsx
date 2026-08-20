"use client";

import type { ThesisReport, ThesisVerdict } from "@/lib/screening/thesis/schemas";
import { AiLabel, ScreeningDisclaimer } from "./ScreeningNotices";
import { useScreeningCopy } from "./use-screening-copy";

function verdictLabel(copy: ReturnType<typeof useScreeningCopy>["copy"], v: ThesisVerdict): string {
  return copy.thesisReport.verdicts[v] ?? v;
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
        const draft = card.thesis_draft;
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
            <p className="mt-2 text-[13px] font-semibold text-[color:var(--foreground)]">
              {t.verdict}: {verdictLabel(copy, card.assessment.verdict)}
              {card.assessment.total != null
                ? ` · ${Math.round(card.assessment.total)}`
                : ""}
            </p>
            <ul className="mt-2 list-none space-y-1 p-0 text-[12px] text-[color:var(--muted)]">
              {card.assessment.gates.map((g) => (
                <li key={g.field_id}>
                  {g.field_id}:{" "}
                  {g.passed === true
                    ? t.gatePass
                    : g.passed === false
                      ? t.gateFail
                      : t.gateUnknown}
                  {g.value != null ? ` (${String(g.value)})` : ""}
                </li>
              ))}
            </ul>

            {draft ? (
              <>
                <h3 className="mt-4 text-[13px] font-semibold text-[color:var(--foreground)]">
                  {t.statement}
                </h3>
                <p className="mt-1 text-[14px] text-[color:var(--foreground)]">{draft.statement}</p>
                <h3 className="mt-4 text-[13px] font-semibold text-[color:var(--foreground)]">
                  {t.variant}
                </h3>
                <p className="mt-1 text-[13px] text-[color:var(--muted)]">
                  <strong>{t.consensus}:</strong> {draft.variant_perception.consensus_view}
                </p>
                <p className="mt-1 text-[13px] text-[color:var(--muted)]">
                  <strong>{t.ourView}:</strong> {draft.variant_perception.our_view}
                </p>
                <h3 className="mt-4 text-[13px] font-semibold text-[color:var(--foreground)]">
                  {t.killCriteria}
                </h3>
                {draft.kill_criteria.length === 0 ? (
                  <p className="mt-1 text-[13px] text-amber-700 dark:text-amber-300">{t.killGap}</p>
                ) : (
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-[13px] text-[color:var(--foreground)]">
                    {draft.kill_criteria.map((k) => (
                      <li key={`${k.metric_field_id}-${k.operator}`}>
                        {k.label ?? k.metric_field_id} {k.operator} {String(k.threshold)}
                      </li>
                    ))}
                  </ul>
                )}
                <h3 className="mt-4 text-[13px] font-semibold text-[color:var(--foreground)]">
                  {t.premortem}
                </h3>
                <p className="mt-1 text-[13px] text-[color:var(--foreground)]">{draft.premortem}</p>
                <p className="mt-3 text-[12px] text-[color:var(--muted)]">
                  {t.conviction}: {draft.conviction}/5 · {t.horizon}: {draft.horizon_months}m
                </p>
              </>
            ) : (
              <p className="mt-3 text-[13px] text-amber-700 dark:text-amber-300">{t.noDraft}</p>
            )}

            <h3 className="mt-4 text-[13px] font-semibold text-[color:var(--foreground)]">
              {t.gaps}
            </h3>
            {card.gaps.length === 0 &&
            card.soft_assessments.every((s) => s.confidence !== "insufficient_evidence") ? (
              <p className="mt-1 text-[13px] text-[color:var(--muted)]">{t.noGaps}</p>
            ) : (
              <ul className="mt-1 list-disc space-y-1 pl-5 text-[13px] text-[color:var(--muted)]">
                {card.gaps.map((g) => (
                  <li key={g}>{g}</li>
                ))}
                {card.soft_assessments
                  .filter((s) => s.confidence === "insufficient_evidence")
                  .map((s) => (
                    <li key={s.field_id}>
                      {s.field_id}: {t.insufficientEvidence}
                    </li>
                  ))}
              </ul>
            )}
          </section>
        );
      })}

      <p className="text-[12px] text-[color:var(--muted)]">{report.disclaimer}</p>
      <ScreeningDisclaimer />
    </article>
  );
}
