"use client";

import { useState } from "react";
import { fill, type ScreeningCopy } from "@/lib/screening/copy";
import type {
  ScreeningReport,
  ScreeningReportCost,
} from "@/lib/screening/schemas";
import { CandidateCard } from "./CandidateCard";
import { AiLabel, ScreeningDisclaimer } from "./ScreeningNotices";
import { useScreeningCopy } from "./use-screening-copy";

function formatOpsCost(usd: number): string {
  if (usd === 0) return "$0.00";
  if (usd < 0.001) return `$${usd.toFixed(6)}`;
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(3)}`;
}

export function ScreeningReportView({
  report,
  /** Ops-facing variable cost — pass only for admins. */
  cost,
}: {
  report: ScreeningReport;
  cost?: ScreeningReportCost | null;
}) {
  const { copy } = useScreeningCopy();
  const cardsByTicker = new Map(report.cards.map((card) => [card.ticker, card]));
  const ranked = report.priorityOrder
    .map((ticker) => cardsByTicker.get(ticker))
    .filter((card): card is NonNullable<typeof card> => Boolean(card));
  const rankIndexByTicker = new Map(
    ranked.map((card, index) => [card.ticker, index]),
  );

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-300">
          {copy.report.eyebrow}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[color:var(--foreground)] sm:text-3xl">
          {copy.report.title}
        </h1>
        <p className="mt-1 text-xs text-[color:var(--muted)]">
          {fill(copy.report.metaLine, {
            jobId: report.jobId,
            date: report.generatedAt.slice(0, 10),
          })}
        </p>
        {cost && (
          <p
            className="mt-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)]/10 px-3 py-2 text-xs text-[color:var(--muted)]"
            role="note"
          >
            Ops cost:{" "}
            <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatOpsCost(cost.costUsd)}
            </span>
            {" · "}
            LLM {formatOpsCost(cost.breakdown.llmUsd)} · Tavily search{" "}
            {formatOpsCost(cost.breakdown.tavilySearchUsd)} · extract{" "}
            {formatOpsCost(cost.breakdown.tavilyExtractUsd)} · research{" "}
            {formatOpsCost(cost.breakdown.tavilyResearchUsd)}
          </p>
        )}
      </header>

      {report.partial && report.pendingAgentKinds.length > 0 && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-3 py-2 text-xs text-[color:var(--foreground)]">
          {fill(copy.report.partialNotice, { agents: report.pendingAgentKinds.join(", ") })}
        </p>
      )}

      {report.verification && (
        <VerificationBanner
          verification={report.verification}
          issuesByTicker={collectQaIssues(report)}
          copy={copy.report}
        />
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
        <section className="card rounded-[20px] border border-[color:var(--border)] p-4 sm:p-5 lg:col-span-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-300">
            {copy.report.methodologyTitle}
          </h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-[color:var(--muted)]">
            {report.methodologyNote}
          </p>
        </section>

        <section className="card rounded-[20px] border border-[color:var(--border)] p-4 sm:p-5 lg:col-span-8">
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
              <ol className="mt-2 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
                {ranked.map((card, index) => (
                  <li
                    key={card.ticker}
                    className="relative flex gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-3"
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
      </div>

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
                  copy.report.colCheap,
                  copy.report.colFit,
                  copy.report.colSolidity,
                  copy.report.colGrowth,
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
                const cheap =
                  row.cheapLabel != null
                    ? copy.report.cheapLabels[row.cheapLabel]
                    : "—";
                const fit =
                  row.fitLabel != null
                    ? copy.report.fitLabels[row.fitLabel]
                    : "—";
                const solidity =
                  row.solidityLabel != null
                    ? copy.report.solidityLabels[row.solidityLabel]
                    : "—";
                return (
                  <tr key={row.ticker} className="border-b border-[color:var(--border)]">
                    <td className="whitespace-nowrap px-3 py-2 font-semibold text-teal-700 dark:text-teal-300">
                      {row.ticker}
                    </td>
                    <td className="px-3 py-2 text-[color:var(--foreground)]">{row.companyName}</td>
                    <td className="px-3 py-2 text-[13px] text-[color:var(--foreground)]">
                      {cheap}
                    </td>
                    <td className="px-3 py-2 text-[13px] text-[color:var(--foreground)]">
                      {fit}
                    </td>
                    <td className="px-3 py-2 text-[13px] text-[color:var(--foreground)]">
                      {solidity}
                    </td>
                    <td className="px-3 py-2 text-[13px] text-[color:var(--muted)]">
                      {row.growthNote}
                    </td>
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
        <div className="mt-2 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {(ranked.length > 0 ? ranked : report.cards).map((card, index) => (
            <CandidateCard
              key={card.ticker}
              card={card}
              locked={false}
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

function collectQaIssues(
  report: ScreeningReport,
): Array<{ ticker: string; claims: string[] }> {
  const out: Array<{ ticker: string; claims: string[] }> = [];
  for (const card of report.cards) {
    const claims = card.qa?.unsupportedClaims ?? [];
    if (claims.length > 0) {
      out.push({ ticker: card.ticker, claims: [...claims] });
    }
  }
  return out;
}

function VerificationBanner({
  verification,
  issuesByTicker,
  copy,
}: {
  verification: NonNullable<ScreeningReport["verification"]>;
  issuesByTicker: Array<{ ticker: string; claims: string[] }>;
  copy: ScreeningCopy["report"];
}) {
  const [open, setOpen] = useState(false);
  const isDegraded = verification.verdict === "pass_with_degradation";
  const isFail = verification.verdict === "fail";
  const passClean =
    verification.verdict === "pass" && verification.blockingIssueCount === 0;

  let message: string;
  let tone: string;
  let icon: string;
  if (isDegraded) {
    message = copy.verificationDegraded;
    tone = "border-amber-500/40 bg-amber-500/[0.08] text-amber-900 dark:text-amber-100";
    icon = "!";
  } else if (isFail || verification.blockingIssueCount > 0) {
    message = fill(copy.verificationFlagged, {
      count: verification.blockingIssueCount || verification.issueCount,
    });
    tone = "border-rose-500/40 bg-rose-500/[0.08] text-rose-900 dark:text-rose-100";
    icon = "×";
  } else if (passClean) {
    message = copy.verificationVerified;
    tone =
      "border-emerald-500/40 bg-emerald-500/[0.08] text-emerald-900 dark:text-emerald-100";
    icon = "✓";
  } else {
    // pass but with non-blocking warnings
    message = fill(copy.verificationFlagged, {
      count: verification.issueCount,
    });
    tone =
      "border-teal-500/40 bg-teal-500/[0.08] text-teal-900 dark:text-teal-100";
    icon = "✓";
  }

  const hasFlagged = issuesByTicker.length > 0;

  return (
    <section
      className={`rounded-xl border px-3 py-2 text-xs ${tone}`}
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-[11px] font-bold"
          aria-hidden="true"
        >
          {icon}
        </span>
        <span className="font-semibold">{copy.verificationTitle}</span>
        <span aria-hidden="true">·</span>
        <span>{message}</span>
        <span className="ml-auto text-[11px] opacity-70">
          {fill(copy.verificationRoundLabel, { n: verification.roundNumber })}
        </span>
      </div>
      {hasFlagged && (
        <div className="mt-1.5">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-[11px] font-semibold underline decoration-dotted underline-offset-2 hover:opacity-80"
          >
            {open ? copy.verificationCollapse : copy.verificationExpand}
          </button>
          {open && (
            <ul className="mt-2 flex flex-col gap-1.5">
              {issuesByTicker.map((entry) => (
                <li key={entry.ticker} className="rounded-lg bg-white/40 px-2 py-1.5 dark:bg-black/20">
                  <div className="text-[11px] font-semibold">{entry.ticker}</div>
                  <ul className="mt-0.5 list-disc pl-4 text-[11px]">
                    {entry.claims.map((claim, i) => (
                      <li key={i}>{claim}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
