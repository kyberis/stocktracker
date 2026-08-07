"use client";

import { fill } from "@/lib/screening/copy";
import type { ScreeningReport } from "@/lib/screening/schemas";
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
  const cardsByTicker = new Map(report.cards.map((card) => [card.ticker, card]));
  const ranked = report.priorityOrder
    .map((ticker) => cardsByTicker.get(ticker))
    .filter((card): card is NonNullable<typeof card> => Boolean(card));
  const reportLanguageDiffers =
    report.locale.split("-")[0] !== (language || "en").split("-")[0];

  return (
    <div className="flex flex-col gap-5">
      <header>
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
          {report.executiveSummary}
        </p>

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
              {ranked.map((card, index) => (
                <li
                  key={card.ticker}
                  className="flex gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-3"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-teal-500/15 text-xs font-bold text-teal-700 dark:text-teal-300">
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-[color:var(--foreground)]">
                      {card.ticker} — {card.companyName}
                    </span>
                    <span className="mt-0.5 block text-[13px] text-[color:var(--muted)]">
                      {card.priorityReason}
                    </span>
                  </span>
                </li>
              ))}
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
              {report.comparisonRows.map((row) => (
                <tr key={row.ticker} className="border-b border-[color:var(--border)]">
                  <td className="whitespace-nowrap px-3 py-2 font-semibold text-teal-700 dark:text-teal-300">
                    {row.ticker}
                  </td>
                  <td className="px-3 py-2 text-[color:var(--foreground)]">{row.companyName}</td>
                  <td className="px-3 py-2 text-[13px] text-[color:var(--muted)]">
                    {row.valuationNote}
                  </td>
                  <td className="px-3 py-2 text-[13px] text-[color:var(--muted)]">
                    {row.growthNote}
                  </td>
                  <td className="px-3 py-2 text-[color:var(--foreground)]">{row.score ?? "—"}</td>
                  <td className="px-3 py-2 text-[13px] text-[color:var(--muted)]">
                    {row.verdict
                      ? (copy.report.verdicts[row.verdict as keyof typeof copy.report.verdicts] ??
                        row.verdict)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-300">
          {copy.report.cardsTitle}
        </h2>
        <div className="mt-2 flex flex-col gap-4">
          {report.cards.map((card) => (
            <CandidateCard key={card.ticker} card={card} />
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
