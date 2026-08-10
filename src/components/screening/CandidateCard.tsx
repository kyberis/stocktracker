"use client";

import Link from "next/link";
import FiftyTwoWeekRangeBar from "@/components/FiftyTwoWeekRangeBar";
import { formatCompactNumber } from "@/lib/utils";
import { fill } from "@/lib/screening/copy";
import { ensureCardCategories } from "@/lib/screening/ensure-categories";
import { levelsFromDistancePct } from "@/lib/screening/fifty-two-week-range";
import type { ScreeningCandidateCard } from "@/lib/screening/schemas";
import { BlurredValue, redactedCandidateLabel } from "./BlurredValue";
import { CriteriaList } from "./CriteriaList";
import { ScreeningPriceChart } from "./ScreeningPriceChart";
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

function toneClass(value: number | null): string {
  if (value == null) return "text-[color:var(--foreground)]";
  if (value > 0) return "text-emerald-700 dark:text-emerald-300";
  if (value < 0) return "text-rose-700 dark:text-rose-300";
  return "text-[color:var(--foreground)]";
}

function TechnicalsBlock({
  card,
  locked,
}: {
  card: ScreeningCandidateCard;
  locked: boolean;
}) {
  const { copy, language } = useScreeningCopy();
  const t = card.technicals;

  const rangeLevels = t
    ? levelsFromDistancePct({
        price: card.price,
        distanceTo52wHighPct: t.distanceTo52wHighPct,
        distanceTo52wLowPct: t.distanceTo52wLowPct,
        closeHigh12m: t.closeHigh12m,
        closeLow12m: t.closeLow12m,
      })
    : null;
  const hasRange = rangeLevels != null;

  const trendLabel =
    t?.aboveMa200 == null
      ? "—"
      : t.aboveMa200
        ? copy.report.metaTrendAboveMa200
        : copy.report.metaTrendBelowMa200;
  const trendTone =
    t?.aboveMa200 == null
      ? "text-[color:var(--foreground)]"
      : t.aboveMa200
        ? "text-emerald-700 dark:text-emerald-300"
        : "text-rose-700 dark:text-rose-300";

  const rows: Array<{
    label: string;
    value: string;
    tone?: string;
  }> | null = t
    ? [
        {
          label: copy.report.metaFromHigh,
          value: pct(t.distanceTo52wHighPct),
          tone: toneClass(t.distanceTo52wHighPct),
        },
        {
          label: copy.report.metaFromLow,
          value: pct(t.distanceTo52wLowPct),
          tone: toneClass(t.distanceTo52wLowPct),
        },
        {
          label: copy.report.metaTrend,
          value: trendLabel,
          tone: trendTone,
        },
        {
          label: copy.report.metaReturn1y,
          value: pct(t.return1yPct),
          tone: toneClass(t.return1yPct),
        },
        {
          label: copy.report.metaReturn3m,
          value: pct(t.return3mPct),
          tone: toneClass(t.return3mPct),
        },
        {
          label: copy.report.metaSupport,
          value: price(t.support, card.currency),
        },
        {
          label: copy.report.metaResistance,
          value: price(t.resistance, card.currency),
        },
        {
          label: copy.report.metaVolatility,
          value:
            t.volatilityAnnPct == null
              ? "—"
              : `${t.volatilityAnnPct.toFixed(0)}%`,
        },
      ]
    : null;

  return (
    <BlurredValue
      locked={locked}
      as="div"
      className="mt-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-3"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-300">
        {copy.report.technicalsTitle}
      </p>
      {locked ? (
        <p className="mt-1.5 text-[13px] text-[color:var(--muted)]">
          {copy.report.lockedCell.repeat(10)}
        </p>
      ) : (
        <>
          <ScreeningPriceChart
            ticker={card.ticker}
            currency={card.currency}
            embedded
          />
          {hasRange && rangeLevels ? (
            <FiftyTwoWeekRangeBar
              className="mt-3"
              low={rangeLevels.low}
              high={rangeLevels.high}
              price={card.price}
              currency={card.currency}
              lowDate={t?.closeLow12mDate}
              highDate={t?.closeHigh12mDate}
              variationPct={t?.return1yPct}
              locale={language}
              labels={{
                low: copy.report.range52wLow,
                high: copy.report.range52wHigh,
                rangeTitle: copy.report.range52wTitle,
                priceChange: copy.report.range52wPriceChange,
                ariaLabel: copy.report.range52wAria,
              }}
            />
          ) : null}
          {rows ? (
            <dl className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {rows.map((row) => (
                <div
                  key={row.label}
                  className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-2.5 py-1.5"
                >
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted)]">
                    {row.label}
                  </dt>
                  <dd
                    className={`mt-0.5 text-[13px] font-semibold tabular-nums ${row.tone ?? "text-[color:var(--foreground)]"}`}
                  >
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </>
      )}
    </BlurredValue>
  );
}

function EvaluationBlock({
  card,
  locked,
}: {
  card: ScreeningCandidateCard;
  locked: boolean;
}) {
  const { copy } = useScreeningCopy();
  const ev = card.evaluation;
  if (!ev) return null;

  const sections: Array<{ label: string; body: string }> = [
    { label: copy.report.evaluationBusiness, body: ev.businessThreeSentences },
    { label: copy.report.evaluationType, body: ev.companyType },
    { label: copy.report.evaluationMoat, body: ev.moat },
    { label: copy.report.evaluationManagement, body: ev.management },
    { label: copy.report.evaluationFinancials, body: ev.financials },
    { label: copy.report.evaluationGrowth, body: ev.growth },
    { label: copy.report.evaluationValuation, body: ev.valuation },
    { label: copy.report.evaluationCatalysts, body: ev.catalysts },
    { label: copy.report.evaluationRisks, body: ev.risksAndPremortem },
    { label: copy.report.evaluationInvalidation, body: ev.thesisInvalidation },
  ];

  const verdictPass = ev.filterVerdict === "PASA";
  const verdictTone = verdictPass
    ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    : "border-rose-500/35 bg-rose-500/10 text-rose-700 dark:text-rose-300";

  return (
    <BlurredValue
      locked={locked}
      as="div"
      className="mt-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-300">
          {copy.report.evaluationTitle}
        </p>
        <AiLabel />
      </div>
      {locked ? (
        <p className="mt-2 text-[13px] text-[color:var(--muted)]">
          {copy.report.lockedCell.repeat(16)}
        </p>
      ) : (
        <>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex min-h-8 items-center rounded-full border px-2.5 text-[12px] font-semibold ${verdictTone}`}
            >
              {copy.report.evaluationFilter}:{" "}
              {verdictPass
                ? copy.report.evaluationPass
                : copy.report.evaluationDiscard}
            </span>
            <span className="text-[12.5px] text-[color:var(--muted)]">
              {ev.filterReason}
            </span>
          </div>
          <dl className="mt-3 space-y-3">
            {sections.map((s) => (
              <div key={s.label}>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted)]">
                  {s.label}
                </dt>
                <dd className="mt-1 whitespace-pre-line text-[13.5px] leading-relaxed text-[color:var(--foreground)]">
                  {s.body}
                </dd>
              </div>
            ))}
            {ev.informationGaps.length > 0 ? (
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted)]">
                  {copy.report.evaluationGaps}
                </dt>
                <dd className="mt-1">
                  <ul className="list-disc space-y-1 pl-5 text-[13px] text-[color:var(--muted)]">
                    {ev.informationGaps.map((g) => (
                      <li key={g}>{g}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted)]">
                {copy.report.evaluationConviction}
              </dt>
              <dd className="mt-1 text-[13.5px] text-[color:var(--foreground)]">
                <strong className="uppercase">{ev.conviction}</strong>
                {" — "}
                {ev.convictionReason}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-[12px] text-[color:var(--muted)]">
            {ev.disclaimer}
          </p>
        </>
      )}
    </BlurredValue>
  );
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

  // Legacy reports (pre-categories) still render the three axes.
  const categories = ensureCardCategories(card).categories!;
  const cheapTone =
    categories?.cheap.label === "cheap"
      ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : categories?.cheap.label === "expensive"
        ? "border-rose-500/35 bg-rose-500/10 text-rose-700 dark:text-rose-300"
        : categories?.cheap.label === "fair"
          ? "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300"
          : "border-[color:var(--border)] bg-[color:var(--surface-soft)] text-[color:var(--muted)]";
  const fitTone =
    categories?.fit.label === "fit"
      ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : categories?.fit.label === "poor_fit"
        ? "border-rose-500/35 bg-rose-500/10 text-rose-700 dark:text-rose-300"
        : categories?.fit.label === "stretch"
          ? "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300"
          : "border-[color:var(--border)] bg-[color:var(--surface-soft)] text-[color:var(--muted)]";
  const solidityTone =
    categories?.solidity.label === "solid"
      ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : categories?.solidity.label === "weak"
        ? "border-rose-500/35 bg-rose-500/10 text-rose-700 dark:text-rose-300"
        : categories?.solidity.label === "moderate"
          ? "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300"
          : "border-[color:var(--border)] bg-[color:var(--surface-soft)] text-[color:var(--muted)]";

  const cheapDetail =
    categories?.cheap.currentPe != null && categories.cheap.histPe != null
      ? fill(copy.report.cheapPeDetail, {
          current: categories.cheap.currentPe.toFixed(1),
          hist: categories.cheap.histPe.toFixed(1),
        })
      : categories?.cheap.currentPe != null
        ? fill(copy.report.cheapPeCurrentOnly, {
            current: categories.cheap.currentPe.toFixed(1),
          })
        : null;
  const fitDetail =
    card.riskFlags?.[0]?.trim() ||
    card.concentrationImpact?.trim() ||
    null;
  const solidityMoatLine =
    categories?.solidity.moatScore != null
      ? fill(copy.report.solidityMoatDetail, {
          score: Math.round(categories.solidity.moatScore),
        })
      : null;
  const nd = categories?.solidity.ndEbitda;
  const netCash = categories?.solidity.netCash;
  const solidityFundLine =
    nd != null && netCash === true
      ? fill(copy.report.solidityFundDetailNdCash, {
          nd: nd.toFixed(1),
        })
      : nd != null
        ? fill(copy.report.solidityFundDetailNd, { nd: nd.toFixed(1) })
        : netCash === true
          ? copy.report.solidityFundDetailCash
          : null;

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
      </div>

      <BlurredValue locked={blurResearch} as="div" className="mt-3">
        {blurResearch ? (
          <p className="text-[13px] text-[color:var(--muted)]">
            {copy.report.lockedCell.repeat(10)}
          </p>
        ) : (
          <ul
            className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-3"
            aria-label={copy.report.categoriesTitle}
          >
            <li className={`rounded-xl border px-3 py-2 ${cheapTone}`}>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
                {copy.report.categoryCheap}
              </p>
              <p className="mt-0.5 text-sm font-semibold">
                {copy.report.cheapLabels[categories.cheap.label]}
              </p>
              {cheapDetail && (
                <p className="mt-0.5 text-[11px] opacity-80">{cheapDetail}</p>
              )}
              <p className="mt-1 text-[10px] leading-snug opacity-70">
                {copy.report.categoryCheapHint}
              </p>
            </li>
            <li className={`rounded-xl border px-3 py-2 ${fitTone}`}>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
                {copy.report.categoryFit}
              </p>
              <p className="mt-0.5 text-sm font-semibold">
                {copy.report.fitLabels[categories.fit.label]}
              </p>
              {fitDetail && (
                <p className="mt-0.5 line-clamp-2 text-[11px] opacity-80">
                  {fitDetail}
                </p>
              )}
              <p className="mt-1 text-[10px] leading-snug opacity-70">
                {copy.report.categoryFitHint}
              </p>
            </li>
            <li className={`rounded-xl border px-3 py-2 ${solidityTone}`}>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
                {copy.report.categorySolidity}
              </p>
              <p className="mt-0.5 text-sm font-semibold">
                {copy.report.solidityLabels[categories.solidity.label]}
              </p>
              {solidityMoatLine && (
                <p className="mt-0.5 text-[11px] opacity-80">{solidityMoatLine}</p>
              )}
              {solidityFundLine && (
                <p className="mt-0.5 text-[11px] opacity-80">{solidityFundLine}</p>
              )}
              <p className="mt-1 text-[10px] leading-snug opacity-70">
                {copy.report.categorySolidityHint}
              </p>
              {!hideIdentity && (
                <Link
                  href={`/analisis/${encodeURIComponent(card.ticker)}?tab=evaluation`}
                  className="mt-1 inline-block rounded-sm text-[11px] font-medium underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  {copy.report.solidityMoatExplore}
                </Link>
              )}
            </li>
          </ul>
        )}
      </BlurredValue>

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

      <TechnicalsBlock card={card} locked={blurResearch} />

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
              {card.illustrativeWeightPct != null ? (
                <li>
                  {fill(copy.report.illustrativeWeight, {
                    pct: Math.round(card.illustrativeWeightPct),
                  })}
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

      {!blurResearch &&
        card.meetsMajorityBrief === false &&
        (card.unmetBriefCriteria?.length ?? 0) > 0 && (
          <div
            className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-3 py-2"
            role="status"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              {copy.report.unmetBriefTitle}
            </p>
            <p className="mt-1 text-[12.5px] text-[color:var(--muted)]">
              {fill(copy.report.unmetBriefHint, {
                met: card.briefCriteriaMet ?? 0,
                total: card.briefCriteriaTotal ?? 0,
              })}
            </p>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[12.5px] text-[color:var(--foreground)]">
              {card.unmetBriefCriteria!.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        )}

      {card.evaluation ? (
        <EvaluationBlock card={card} locked={blurResearch} />
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-300">
              {copy.report.thesisTitle}
            </p>
            <AiLabel />
          </div>
          <BlurredValue
            locked={blurResearch}
            as="div"
            className="mt-1.5 text-sm leading-relaxed text-[color:var(--foreground)] whitespace-pre-line"
          >
            {blurResearch ? copy.report.lockedCell.repeat(20) : card.thesis}
          </BlurredValue>
        </>
      )}

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
