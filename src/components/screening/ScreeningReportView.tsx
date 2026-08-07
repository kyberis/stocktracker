"use client";

import { useState } from "react";
import { fill } from "@/lib/screening/copy";
import type { ScreeningReport } from "@/lib/screening/schemas";
import {
  BlurredValue,
  redactedCandidateLabel,
  splitSummaryHook,
} from "./BlurredValue";
import { CandidateCard } from "./CandidateCard";
import { AiLabel, MockNotice, ScreeningDisclaimer } from "./ScreeningNotices";
import { useScreeningCopy } from "./use-screening-copy";

export function ScreeningReportView({
  report,
  mocked,
}: {
  report: ScreeningReport;
  mocked: boolean;
}) {
  const { copy, language } = useScreeningCopy();
  const [previewLocked, setPreviewLocked] = useState(false);
  const cardsByTicker = new Map(report.cards.map((card) => [card.ticker, card]));
  const ranked = report.priorityOrder
    .map((ticker) => cardsByTicker.get(ticker))
    .filter((card): card is NonNullable<typeof card> => Boolean(card));
  const reportLanguageDiffers =
    report.locale.split("-")[0] !== (language || "en").split("-")[0];

  const { hook: summaryHook, rest: summaryRest } = splitSummaryHook(
    report.executiveSummary,
  );
  const rankIndexByTicker = new Map(
    ranked.map((card, index) => [card.ticker, index]),
  );

  return (
    <div className="flex flex-col gap-5">
      <header>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-300">
              {copy.report.eyebrow}
            </p>
            <h1 className="mt-1 text-xl font-bold text-[color:var(--foreground)] sm:text-2xl">
              {copy.report.title}
            </h1>
            <p className="mt-1 text-xs text-[color:var(--muted)]">
              {fill(copy.report.metaLine, {
                jobId: report.jobId,
                date: report.generatedAt.slice(0, 10),
                count: report.cards.length,
              })}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <button
              type="button"
              onClick={() => setPreviewLocked((v) => !v)}
              className={`inline-flex min-h-9 items-center rounded-full border px-3 text-[12px] font-semibold transition-colors ${
                previewLocked
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200"
                  : "border-[color:var(--border)] bg-[color:var(--surface-soft)] text-[color:var(--foreground)]"
              }`}
              aria-pressed={previewLocked}
            >
              {previewLocked
                ? copy.report.blurToggleUnlock
                : copy.report.blurToggleLock}
            </button>
            <p className="max-w-[220px] text-right text-[10px] leading-snug text-[color:var(--muted)]">
              {copy.report.blurToggleHint}
            </p>
          </div>
        </div>
      </header>

      {mocked && <MockNotice />}
      {mocked && reportLanguageDiffers && (
        <p className="text-xs text-[color:var(--muted)]">{copy.common.localeNotice}</p>
      )}

      {report.partial && report.pendingAgentKinds.length > 0 && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-3 py-2 text-xs text-[color:var(--foreground)]">
          {fill(copy.report.partialNotice, { agents: report.pendingAgentKinds.join(", ") })}
        </p>
      )}

      <section className="card rounded-[20px] border border-[color:var(--border)] p-4 sm:p-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-300">
          {copy.report.methodologyTitle}
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[color:var(--muted)]">
          {report.methodologyNote}
        </p>
      </section>

      <section className="card rounded-[20px] border border-[color:var(--border)] p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-300">
            {copy.report.summaryTitle}
          </h2>
          <AiLabel />
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--foreground)]">
          {summaryHook}
          {summaryRest ? " " : ""}
        </p>
        {summaryRest ? (
          <BlurredValue
            locked={previewLocked}
            as="p"
            className="mt-1 text-sm leading-relaxed text-[color:var(--foreground)]"
          >
            {previewLocked ? copy.report.lockedCell.repeat(12) : summaryRest}
          </BlurredValue>
        ) : null}

        {ranked.length === 0 && (
          <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-3 py-2 text-[13px] text-[color:var(--foreground)]">
            {copy.report.emptyCandidates}
          </p>
        )}

        {ranked.length > 0 && (
          <>
            <h3 className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--muted)]">
              {copy.report.priorityTitle}
            </h3>
            <ol className="mt-2 list-none space-y-2 p-0">
              {ranked.map((card, index) => {
                const hideIdentity = previewLocked && index > 0;
                const identity = hideIdentity
                  ? redactedCandidateLabel(index + 1, copy.report.lockedCandidate)
                  : `${card.ticker} — ${card.companyName}`;
                const reason = hideIdentity
                  ? copy.report.lockedCell.repeat(8)
                  : previewLocked
                    ? copy.report.lockedCell.repeat(8)
                    : card.priorityReason;
                return (
                  <li
                    key={card.ticker}
                    className="relative flex gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-3"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-teal-500/15 text-xs font-bold text-teal-700 dark:text-teal-300">
                      {index + 1}
                    </span>
                    <span className="min-w-0">
                      <BlurredValue
                        locked={hideIdentity}
                        className="block text-sm font-semibold text-[color:var(--foreground)]"
                      >
                        {identity}
                      </BlurredValue>
                      <BlurredValue
                        locked={previewLocked}
                        className="mt-0.5 block text-[13px] text-[color:var(--muted)]"
                      >
                        {reason}
                      </BlurredValue>
                    </span>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </section>

      <section className="card overflow-hidden rounded-[20px] border border-[color:var(--border)]">
        <h2 className="px-4 pt-4 text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-300 sm:px-5">
          {copy.report.comparisonTitle}
        </h2>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm tabular-nums">
            <thead>
              <tr className="border-b border-[color:var(--border)] bg-[color:var(--surface-soft)] text-left">
                {[
                  copy.report.colTicker,
                  copy.report.colCompany,
                  copy.report.colValuation,
                  copy.report.colGrowth,
                  copy.report.colScore,
                  copy.report.colVerdict,
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--muted)]"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.comparisonRows.map((row) => {
                const rankIndex = rankIndexByTicker.get(row.ticker) ?? 99;
                const hideIdentity = previewLocked && rankIndex > 0;
                const tickerLabel = hideIdentity
                  ? redactedCandidateLabel(rankIndex + 1, copy.report.lockedCandidate)
                  : row.ticker;
                const companyLabel = hideIdentity
                  ? copy.report.lockedCell
                  : row.companyName;
                const valuation = previewLocked
                  ? copy.report.lockedCell
                  : row.valuationNote;
                const growth = previewLocked ? copy.report.lockedCell : row.growthNote;
                const score = previewLocked ? copy.report.lockedCell : (row.score ?? "—");
                const verdict = previewLocked
                  ? copy.report.lockedCell
                  : row.verdict
                    ? (copy.report.verdicts[
                        row.verdict as keyof typeof copy.report.verdicts
                      ] ?? row.verdict)
                    : "—";
                return (
                  <tr key={row.ticker} className="border-b border-[color:var(--border)]">
                    <BlurredValue
                      locked={hideIdentity}
                      as="td"
                      className="whitespace-nowrap px-3 py-2 font-semibold text-teal-700 dark:text-teal-300"
                    >
                      {tickerLabel}
                    </BlurredValue>
                    <BlurredValue
                      locked={hideIdentity}
                      as="td"
                      className="px-3 py-2 text-[color:var(--foreground)]"
                    >
                      {companyLabel}
                    </BlurredValue>
                    <BlurredValue
                      locked={previewLocked}
                      as="td"
                      className="px-3 py-2 text-[13px] text-[color:var(--muted)]"
                    >
                      {valuation}
                    </BlurredValue>
                    <BlurredValue
                      locked={previewLocked}
                      as="td"
                      className="px-3 py-2 text-[13px] text-[color:var(--muted)]"
                    >
                      {growth}
                    </BlurredValue>
                    <BlurredValue
                      locked={previewLocked}
                      as="td"
                      className="px-3 py-2 text-[color:var(--foreground)]"
                    >
                      {score}
                    </BlurredValue>
                    <BlurredValue
                      locked={previewLocked}
                      as="td"
                      className="px-3 py-2 text-[13px] text-[color:var(--muted)]"
                    >
                      {verdict}
                    </BlurredValue>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-300">
          {copy.report.cardsTitle}
        </h2>
        <div className="mt-2 flex flex-col gap-4">
          {(ranked.length > 0 ? ranked : report.cards).map((card, index) => (
            <CandidateCard
              key={card.ticker}
              card={card}
              locked={previewLocked}
              rankIndex={rankIndexByTicker.get(card.ticker) ?? index}
            />
          ))}
        </div>
      </section>

      <aside
        className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-3"
        role="note"
      >
        <p className="text-[11px] leading-relaxed text-[color:var(--muted)]">{report.disclaimer}</p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-[color:var(--muted)]">
          {copy.report.externalLinksNote}
        </p>
        <ScreeningDisclaimer className="mt-1.5" />
      </aside>
    </div>
  );
}
