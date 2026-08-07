"use client";

import Link from "next/link";
import { formatCompactNumber } from "@/lib/utils";
import { fill } from "@/lib/screening/copy";
import type { ScreeningCandidateCard } from "@/lib/screening/schemas";
import { BlurredValue, redactedCandidateLabel } from "./BlurredValue";
import { CriteriaList } from "./CriteriaList";
import { AiLabel } from "./ScreeningNotices";
import { useScreeningCopy } from "./use-screening-copy";

function mult(value: number | null): string {
  return value == null ? "—" : `${value.toFixed(2)}x`;
}

function price(value: number | null, currency: string): string {
  if (value == null) return "—";
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${currency}`;
}

function pct(value: number | null): string {
  if (value == null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(0)}%`;
}

function yieldPct(value: number | null): string {
  return value == null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function BusinessBlock({
  card,
  locked,
}: {
  card: ScreeningCandidateCard;
  locked: boolean;
}) {
  const { copy } = useScreeningCopy();
  const business = card.business;
  if (!business) return null;

  const facts = [
    business.employees != null
      ? fill(copy.report.employees, { n: business.employees.toLocaleString("en-US") })
      : null,
    business.listedSince != null
      ? fill(copy.report.listedSince, { year: business.listedSince })
      : null,
  ].filter(Boolean) as string[];

  const externalLinks = [
    business.website ? { label: copy.report.linkWebsite, url: business.website } : null,
    business.irUrl ? { label: copy.report.linkIr, url: business.irUrl } : null,
    business.filings ? { label: business.filings.label, url: business.filings.url } : null,
  ].filter(Boolean) as Array<{ label: string; url: string }>;

  const chip =
    "inline-flex min-h-8 items-center rounded-full border border-teal-500/30 bg-teal-500/[0.08] px-2.5 text-[12px] font-medium text-teal-700 dark:text-teal-300";

  return (
    <div className="mt-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-300">
        {copy.report.businessTitle}
      </p>
      <BlurredValue
        locked={locked}
        as="p"
        className="mt-1.5 text-[13.5px] leading-relaxed text-[color:var(--foreground)]"
      >
        {locked ? copy.report.lockedCell.repeat(16) : business.summary}
      </BlurredValue>
      {facts.length > 0 && (
        <BlurredValue
          locked={locked}
          as="p"
          className="mt-2 text-xs text-[color:var(--muted)]"
        >
          {locked ? copy.report.lockedCell : facts.join(" · ")}
        </BlurredValue>
      )}
      {!locked && (
        <div className="mt-2 flex flex-wrap gap-2">
          {externalLinks.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={chip}
            >
              {link.label} ↗
            </a>
          ))}
          <Link href={`/stock/${encodeURIComponent(card.ticker)}`} className={chip}>
            {copy.report.linkTrefolio}
          </Link>
        </div>
      )}
      {locked && (
        <p className="mt-2 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
          {copy.report.unlockReportChip}
        </p>
      )}
    </div>
  );
}

export function CandidateCard({
  card,
  locked = false,
  rankIndex = 0,
}: {
  card: ScreeningCandidateCard;
  /** When true, apply teaser lock rules for this card. */
  locked?: boolean;
  /** 0-based priority rank (#1 = 0 stays partially visible). */
  rankIndex?: number;
}) {
  const { copy } = useScreeningCopy();
  const hideIdentity = locked && rankIndex > 0;
  const blurResearch = locked;

  const verdictLabel = card.verdict ? copy.report.verdicts[card.verdict] : null;
  const verdictTone =
    card.verdict === "fuerte"
      ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300";

  const title = hideIdentity
    ? redactedCandidateLabel(rankIndex + 1, copy.report.lockedCandidate)
    : `${card.ticker} — ${card.companyName}`;

  const meta: Array<{ label: string; value: string; alwaysClear?: boolean }> = [
    {
      label: copy.report.metaPrice,
      value: price(card.price, card.currency),
      alwaysClear: !hideIdentity,
    },
    {
      label: copy.report.metaTarget,
      value:
        card.targetPrice == null
          ? "—"
          : `${price(card.targetPrice, card.currency)} (${pct(card.upsidePct)})`,
    },
    {
      label:
        card.multiples.fwdPe != null
          ? copy.report.metaFwdPe
          : copy.report.metaPe,
      value: mult(card.multiples.fwdPe ?? card.multiples.ownHistPe),
    },
    { label: copy.report.metaEvEbitda, value: mult(card.multiples.evEbitda) },
    { label: copy.report.metaNdEbitda, value: mult(card.multiples.ndEbitda) },
    { label: copy.report.metaDividend, value: yieldPct(card.flags.dividendYield) },
    {
      label: copy.report.metaNetCash,
      value:
        card.flags.netCash == null ? "—" : card.flags.netCash ? copy.report.yes : copy.report.no,
    },
    {
      label: copy.report.metaMoat,
      value: card.flags.moatScore == null ? "—" : card.flags.moatScore.toFixed(1),
    },
  ];

  return (
    <article className="card relative rounded-[20px] border border-[color:var(--border)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <BlurredValue
            locked={hideIdentity}
            as="div"
            className="text-lg font-bold text-[color:var(--foreground)] sm:text-xl"
          >
            <h3 className="m-0 text-inherit">{title}</h3>
          </BlurredValue>
          <p className="mt-1 text-[13px] text-[color:var(--muted)]">
            {card.sector} · {card.country}
            {card.mktCapUsd != null && ` · ${formatCompactNumber(card.mktCapUsd)} USD`}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {verdictLabel && (
            <BlurredValue locked={blurResearch}>
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${verdictTone}`}
              >
                {blurResearch ? copy.report.lockedCell : verdictLabel}
              </span>
            </BlurredValue>
          )}
          {card.score != null && (
            <BlurredValue locked={blurResearch}>
              <span className="inline-flex items-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--foreground)]">
                {blurResearch ? copy.report.lockedCell : `${card.score}/8`}
              </span>
            </BlurredValue>
          )}
        </div>
      </div>

      {(!hideIdentity || blurResearch) && (
        <BusinessBlock card={card} locked={blurResearch || hideIdentity} />
      )}

      {(card.sentimentSummary ||
        card.insiderBias ||
        (card.webSignals && card.webSignals.length > 0)) && (
        <BlurredValue
          locked={blurResearch}
          as="div"
          className="mt-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-3"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-300">
            {copy.report.sentimentTitle}
          </p>
          {blurResearch ? (
            <p className="mt-1.5 text-[13.5px] text-[color:var(--muted)]">
              {copy.report.lockedCell.repeat(14)}
            </p>
          ) : (
            <>
              {card.sentimentSummary ? (
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-[color:var(--foreground)]">
                  {card.sentimentSummary}
                </p>
              ) : null}
              {card.insiderBias ? (
                <p className="mt-1.5 text-[12px] text-[color:var(--muted)]">
                  {card.insiderBias === "buying"
                    ? copy.report.insiderBuying
                    : card.insiderBias === "selling"
                      ? copy.report.insiderSelling
                      : card.insiderBias === "mixed"
                        ? copy.report.insiderMixed
                        : copy.report.insiderNone}
                </p>
              ) : null}
              {card.webSignals && card.webSignals.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-4 text-[12.5px] text-[color:var(--muted)]">
                  {card.webSignals.map((s) => (
                    <li key={`${s.kind}-${s.claim.slice(0, 40)}`}>
                      <span className="font-semibold text-[color:var(--foreground)]">
                        {s.kind}
                      </span>
                      {s.confirmation === "single_source_unconfirmed" ? " · ?" : ""}
                      : {s.claim}
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
        </BlurredValue>
      )}

      {(card.positionKind ||
        card.suitability ||
        card.illustrativeAllocationEur ||
        card.illustrativeWeightPct != null) && (
        <BlurredValue
          locked={blurResearch}
          as="div"
          className="mt-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-3"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-300">
            {copy.report.fitRiskTitle}
          </p>
          {blurResearch ? (
            <p className="mt-1.5 text-[13px] text-[color:var(--muted)]">
              {copy.report.lockedCell.repeat(10)}
            </p>
          ) : (
            <ul className="mt-1.5 list-none space-y-1 p-0 text-[13px] text-[color:var(--foreground)]">
              {card.positionKind ? (
                <li>
                  {card.positionKind === "top_up_existing"
                    ? copy.report.positionTopUp
                    : copy.report.positionNew}
                  {card.topUpTicker ? ` (${card.topUpTicker})` : ""}
                </li>
              ) : null}
              {card.illustrativeAllocationEur ? (
                <li className="text-[color:var(--muted)]">
                  {fill(copy.report.illustrativeAllocation, {
                    min: Math.round(card.illustrativeAllocationEur.min),
                    max: Math.round(card.illustrativeAllocationEur.max),
                  })}
                </li>
              ) : null}
              {card.suitability ? (
                <li>
                  {card.suitability === "fit"
                    ? copy.report.suitabilityFit
                    : card.suitability === "poor_fit"
                      ? copy.report.suitabilityPoor
                      : copy.report.suitabilityStretch}
                  {card.illustrativeWeightPct != null
                    ? ` · ${fill(copy.report.illustrativeWeight, {
                        pct: Math.round(card.illustrativeWeightPct),
                      })}`
                    : ""}
                </li>
              ) : null}
              {card.concentrationImpact ? (
                <li className="text-[12.5px] text-[color:var(--muted)]">
                  {card.concentrationImpact}
                </li>
              ) : null}
            </ul>
          )}
        </BlurredValue>
      )}

      <dl className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {meta.map((item) => {
          const lockCell = item.alwaysClear ? false : blurResearch || hideIdentity;
          return (
            <div
              key={item.label}
              className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-2.5 py-2"
            >
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted)]">
                {item.label}
              </dt>
              <BlurredValue
                locked={lockCell}
                as="dd"
                className="mt-0.5 text-sm font-semibold tabular-nums text-[color:var(--foreground)]"
              >
                {lockCell ? copy.report.lockedCell : item.value}
              </BlurredValue>
            </div>
          );
        })}
      </dl>

      {card.catalyst && (
        <BlurredValue
          locked={blurResearch}
          as="p"
          className="mt-3 text-[13px] text-[color:var(--muted)]"
        >
          {blurResearch ? (
            copy.report.lockedCell.repeat(10)
          ) : (
            <>
              <strong className="text-[color:var(--foreground)]">{copy.report.catalyst}:</strong>{" "}
              {card.catalyst}
              {card.catalystDate ? ` (${card.catalystDate})` : ""}
            </>
          )}
        </BlurredValue>
      )}

      <BlurredValue locked={blurResearch} as="div">
        {blurResearch ? (
          <p className="mt-3 text-[13px] text-[color:var(--muted)]">
            {copy.report.lockedCell.repeat(12)}
          </p>
        ) : (
          <CriteriaList passed={card.stepsPassed} failed={card.stepsFailed} score={card.score} />
        )}
      </BlurredValue>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-300">
          {copy.report.thesisTitle}
        </p>
        <AiLabel />
      </div>
      <BlurredValue
        locked={blurResearch}
        as="p"
        className="mt-1.5 text-sm leading-relaxed text-[color:var(--foreground)]"
      >
        {blurResearch ? copy.report.lockedCell.repeat(20) : card.thesis}
      </BlurredValue>

      {card.risks.length > 0 && (
        <>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-300">
            {copy.report.risksTitle}
          </p>
          <BlurredValue locked={blurResearch} as="div">
            {blurResearch ? (
              <p className="mt-1.5 text-[13px] text-[color:var(--muted)]">
                {copy.report.lockedCell.repeat(10)}
              </p>
            ) : (
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[13px] text-[color:var(--muted)]">
                {card.risks.map((risk) => (
                  <li key={risk}>{risk}</li>
                ))}
              </ul>
            )}
          </BlurredValue>
        </>
      )}

      {card.sources.length > 0 && !blurResearch && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-semibold text-teal-700 dark:text-teal-300">
            {fill(copy.report.sourcesToggle, { n: card.sources.length })}
          </summary>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[11px] text-[color:var(--muted)]">
            {card.sources.map((source) => (
              <li key={`${source.url}-${source.field}`}>
                {source.label || source.field} · {source.asOf}
              </li>
            ))}
          </ul>
        </details>
      )}
      {blurResearch && card.sources.length > 0 && (
        <p className="mt-3 text-xs font-semibold text-amber-700 dark:text-amber-300">
          {copy.report.unlockReportChip}
        </p>
      )}
    </article>
  );
}
