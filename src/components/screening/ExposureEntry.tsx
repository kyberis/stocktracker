"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { usePortfolio } from "@/lib/portfolio-context";
import {
  REC_THRESHOLDS,
  computeSectorPercentsForRecommendations,
  pickUnderweightSectors,
} from "@/lib/homepage/build-portfolio-recommendations";
import { SCREENING_MAX_SCORE } from "@/lib/screening/criteria";
import { fill, type ScreeningCopy } from "@/lib/screening/copy";
import {
  isScreeningEntryScenario,
  resolvePreviewAllocation,
  type ScreeningEntryScenario,
} from "@/lib/screening/entry-preview";
import type { ScreeningEntryVariant } from "@/lib/screening/schemas";
import {
  buildEntryBackHomeMetadata,
  buildEntryCtaMetadata,
  buildEntryViewMetadata,
  postScreeningEntryEvent,
} from "@/lib/screening/track-entry";
import { useTrack } from "@/lib/use-track";
import { MockNotice, ScreeningDisclaimer } from "./ScreeningNotices";
import { useScreeningCopy } from "./use-screening-copy";

const OVEREXPOSURE_PCT = REC_THRESHOLDS.topSectorPct;

type EntryCopy = ScreeningCopy["entry"];
type PreviewMode = ScreeningEntryScenario | "live";

function intakeHref(params: {
  intent: "rebalance" | "explore";
  include?: string[];
  exclude?: string[];
}): string {
  const search = new URLSearchParams({ intent: params.intent });
  if (params.include?.length) search.set("include", params.include.join(","));
  if (params.exclude?.length) search.set("exclude", params.exclude.join(","));
  return `/screening/intake?${search.toString()}`;
}

function Chip({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "ok" | "bad" | "info";
}) {
  const toneClass =
    tone === "ok"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : tone === "bad"
        ? "bg-red-500/10 text-red-600 dark:text-red-400"
        : "bg-sky-500/10 text-sky-700 dark:text-sky-300";
  return (
    <span
      className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold ${toneClass}`}
    >
      {children}
    </span>
  );
}

type TrackEntryFn = (event: string, metadata?: Record<string, string>) => void;

function ExploreOptionCard({
  entry,
  eyebrow,
  primary,
  variant,
  preview,
  track,
}: {
  entry: EntryCopy;
  eyebrow: string;
  primary: boolean;
  variant: ScreeningEntryVariant;
  preview: "live" | "fixture";
  track: TrackEntryFn;
}) {
  const meta = buildEntryCtaMetadata({
    intent: "explore",
    variant,
    preview,
    primary,
  });

  return (
    <section className="card flex flex-col rounded-[20px] border border-[color:var(--border)] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-300">
        {eyebrow}
      </p>
      <h3 className="mt-1 text-[15px] font-bold text-[color:var(--foreground)]">
        {entry.exploreTitle}
      </h3>
      <p className="mt-1.5 flex-1 text-[13px] text-[color:var(--muted)]">{entry.exploreBody}</p>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <Chip tone="info">{entry.exploreChipNeutral}</Chip>
        <Chip tone="info">{entry.exploreChipPreset}</Chip>
      </div>
      <Link
        href={intakeHref({ intent: "explore" })}
        className={`${primary ? "btn-primary" : "btn-secondary"} mt-3 inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold`}
        onClick={() => {
          track("screening_entry_cta_clicked", meta);
          void postScreeningEntryEvent("screening_entry_cta_clicked", meta);
        }}
      >
        {entry.exploreCta}
      </Link>
    </section>
  );
}

function RebalanceOptionCard({
  entry,
  eyebrow,
  primary,
  includeSectors,
  excludeSectors,
  mode,
  variant,
  preview,
  track,
}: {
  entry: EntryCopy;
  eyebrow: string;
  primary: boolean;
  includeSectors: string[];
  excludeSectors: string[];
  mode: "overexposed" | "balanced";
  variant: ScreeningEntryVariant;
  preview: "live" | "fixture";
  track: TrackEntryFn;
}) {
  const body =
    mode === "balanced"
      ? includeSectors.length
        ? fill(entry.rebalanceBodyBalanced, { include: includeSectors.join(", ") })
        : entry.rebalanceBodyBalancedNone
      : excludeSectors.length
        ? fill(entry.rebalanceBody, {
            include: includeSectors.join(", "),
            exclude: excludeSectors.join(", "),
          })
        : includeSectors.length
          ? fill(entry.rebalanceBodyNoTarget, { include: includeSectors.join(", ") })
          : entry.rebalanceBodyBalancedNone;

  const meta = buildEntryCtaMetadata({
    intent: "rebalance",
    variant,
    preview,
    primary,
  });

  return (
    <section className="card flex flex-col rounded-[20px] border border-[color:var(--border)] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-300">
        {eyebrow}
      </p>
      <h3 className="mt-1 text-[15px] font-bold text-[color:var(--foreground)]">
        {entry.rebalanceTitle}
      </h3>
      <p className="mt-1.5 flex-1 text-[13px] text-[color:var(--muted)]">{body}</p>
      {(includeSectors.length > 0 || excludeSectors.length > 0) && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {includeSectors.map((sector) => (
            <Chip key={`in-${sector}`} tone="ok">
              {fill(entry.chipInclude, { sector })}
            </Chip>
          ))}
          {excludeSectors.map((sector) => (
            <Chip key={`ex-${sector}`} tone="bad">
              {fill(entry.chipExclude, { sector })}
            </Chip>
          ))}
        </div>
      )}
      <Link
        href={intakeHref({
          intent: "rebalance",
          include: includeSectors,
          exclude: excludeSectors,
        })}
        className={`${primary ? "btn-primary" : "btn-secondary"} mt-3 inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold`}
        onClick={() => {
          track("screening_entry_cta_clicked", meta);
          void postScreeningEntryEvent("screening_entry_cta_clicked", meta);
        }}
      >
        {entry.rebalanceCta}
      </Link>
    </section>
  );
}

function ScenarioSwitcher({
  mode,
  onChange,
  entry,
}: {
  mode: PreviewMode;
  onChange: (next: PreviewMode) => void;
  entry: EntryCopy;
}) {
  const options: Array<{ id: PreviewMode; label: string }> = [
    { id: "empty", label: entry.scenarioEmpty },
    { id: "overexposed", label: entry.scenarioOverexposed },
    { id: "balanced", label: entry.scenarioBalanced },
    { id: "live", label: entry.scenarioLive },
  ];

  return (
    <section
      className="mt-4 rounded-xl border border-dashed border-[color:var(--border)] bg-[color:var(--surface-soft)] p-3"
      aria-label={entry.scenarioPreviewLabel}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--muted)]">
        {entry.scenarioPreviewLabel}
      </p>
      <p className="mt-1 text-[12px] text-[color:var(--muted)]">{entry.scenarioPreviewHint}</p>
      <div className="mt-2.5 flex flex-wrap gap-1.5" role="tablist">
        {options.map((option) => {
          const active = mode === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(option.id)}
              className={`inline-flex min-h-9 items-center justify-center rounded-full px-3 text-[12px] font-semibold ${
                active
                  ? "bg-teal-500/20 text-teal-800 dark:text-teal-200"
                  : "border border-[color:var(--border)] text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

/**
 * Entry point of the screening flow. Sector weights are real by default
 * (same helper as home recommendations). `?scenario=empty|overexposed|balanced`
 * forces a fixture so all three entry variants can be reviewed without seeding
 * portfolios.
 */
export function ExposureEntry() {
  const { copy } = useScreeningCopy();
  const track = useTrack();
  const { holdings, quotes, exchangeRates, isInitializing } = usePortfolio();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const viewedKeyRef = useRef<string | null>(null);

  const scenarioParam = searchParams.get("scenario");
  const previewMode: PreviewMode = isScreeningEntryScenario(scenarioParam)
    ? scenarioParam
    : "live";
  const preview: "live" | "fixture" = previewMode === "live" ? "live" : "fixture";

  const liveAllocation = useMemo(() => {
    const alloc = computeSectorPercentsForRecommendations(
      holdings,
      quotes,
      exchangeRates,
      copy.entry.unclassified,
    );
    const top = alloc[0] ?? null;
    return {
      sectors: alloc,
      overexposed: top != null && top.percent >= OVEREXPOSURE_PCT ? top : null,
      underweight: alloc.length ? pickUnderweightSectors(alloc, 2) : [],
    };
  }, [holdings, quotes, exchangeRates, copy.entry.unclassified]);

  const { sectors, overexposed, underweight } =
    previewMode === "live" ? liveAllocation : resolvePreviewAllocation(previewMode);

  const waitingOnLive = previewMode === "live" && isInitializing;
  const thresholdLabel = `${OVEREXPOSURE_PCT}%`;
  const includeSectors = underweight.map((s) => s.label);
  const excludeSectors = overexposed ? [overexposed.label] : [];
  const isEmpty = !waitingOnLive && sectors.length === 0;
  const isBalanced = !overexposed && !isEmpty && sectors.length > 0;
  const variant: ScreeningEntryVariant = isEmpty
    ? "empty"
    : overexposed
      ? "overexposed"
      : "balanced";

  useEffect(() => {
    if (waitingOnLive) return;
    const key = `${preview}:${variant}:${overexposed?.label ?? ""}:${overexposed?.percent.toFixed(1) ?? ""}`;
    if (viewedKeyRef.current === key) return;
    viewedKeyRef.current = key;
    const meta = buildEntryViewMetadata({
      variant,
      preview,
      topSector: overexposed?.label ?? (sectors[0]?.label ?? null),
      topPct: overexposed?.percent ?? (sectors[0]?.percent ?? null),
    });
    track("screening_entry_viewed", meta);
    void postScreeningEntryEvent("screening_entry_viewed", meta);
  }, [waitingOnLive, preview, variant, overexposed, sectors, track]);

  const title = isEmpty
    ? copy.entry.discoveryTitle
    : overexposed
      ? fill(copy.entry.titleOverexposed, { sector: overexposed.label })
      : copy.entry.titleBalanced;

  const body = isEmpty
    ? copy.entry.bodyEmpty
    : overexposed
      ? fill(copy.entry.bodyOverexposed, {
          sector: overexposed.label,
          pct: `${overexposed.percent.toFixed(1)}%`,
          threshold: thresholdLabel,
        })
      : fill(copy.entry.bodyBalanced, { threshold: thresholdLabel });

  const optionsTitle = isBalanced ? copy.entry.optionsTitleBalanced : copy.entry.optionsTitle;

  function setPreviewMode(next: PreviewMode) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "live") params.delete("scenario");
    else params.set("scenario", next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const backMeta = buildEntryBackHomeMetadata({ variant, preview });

  return (
    <main className="mx-auto w-full max-w-3xl px-3 py-6 sm:px-4">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-300">
          {copy.entry.eyebrow}
        </p>
        <h1 className="mt-1 text-xl font-bold text-[color:var(--foreground)] sm:text-2xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">{body}</p>
      </header>

      <ScenarioSwitcher mode={previewMode} onChange={setPreviewMode} entry={copy.entry} />

      <MockNotice className="mt-4" />

      {waitingOnLive ? (
        <div
          className="card mt-5 h-40 animate-pulse rounded-[20px] bg-[color:var(--surface-soft)]"
          aria-busy="true"
          role="status"
        />
      ) : sectors.length > 0 ? (
        <section className="card mt-5 rounded-[20px] border border-[color:var(--border)] p-4 sm:p-5">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--muted)]">
            {copy.entry.breakdownTitle}
          </h2>
          <ul className="mt-3 list-none space-y-2.5 p-0">
            {sectors.slice(0, 8).map((sector) => {
              const isOver = sector.percent >= OVEREXPOSURE_PCT;
              const isUnder = includeSectors.includes(sector.label);
              return (
                <li key={sector.label}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-[13px] font-medium text-[color:var(--foreground)]">
                      {sector.label}
                      {isOver && (
                        <span className="ml-2 inline-flex rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 dark:text-red-400">
                          {copy.entry.badgeOverexposed}
                        </span>
                      )}
                      {!isOver && isUnder && (
                        <span className="ml-2 inline-flex rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                          {copy.entry.badgeUnderweight}
                        </span>
                      )}
                    </span>
                    <span className="text-[13px] tabular-nums text-[color:var(--muted)]">
                      {sector.percent.toFixed(1)}%
                    </span>
                  </div>
                  <div
                    className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--surface-soft)]"
                    role="presentation"
                  >
                    <div
                      className={`h-full rounded-full ${isOver ? "bg-red-500/70" : "bg-teal-500/70"}`}
                      style={{ width: `${Math.min(100, sector.percent)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <section
          className="card mt-5 rounded-[20px] border border-dashed border-[color:var(--border)] p-4 sm:p-5"
          role="status"
        >
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--muted)]">
            {copy.entry.breakdownTitle}
          </h2>
          <p className="mt-2 text-[13px] text-[color:var(--muted)]">{copy.entry.bodyEmpty}</p>
        </section>
      )}

      <h2 className="mt-6 text-base font-bold text-[color:var(--foreground)]">{optionsTitle}</h2>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {isEmpty ? (
          <ExploreOptionCard
            entry={copy.entry}
            eyebrow={copy.entry.exploreEyebrowPrimary}
            primary
            variant={variant}
            preview={preview}
            track={track}
          />
        ) : isBalanced ? (
          <>
            <ExploreOptionCard
              entry={copy.entry}
              eyebrow={copy.entry.exploreEyebrowPrimary}
              primary
              variant={variant}
              preview={preview}
              track={track}
            />
            <RebalanceOptionCard
              entry={copy.entry}
              eyebrow={copy.entry.rebalanceEyebrowSecondary}
              primary={false}
              includeSectors={includeSectors}
              excludeSectors={[]}
              mode="balanced"
              variant={variant}
              preview={preview}
              track={track}
            />
          </>
        ) : (
          <>
            <RebalanceOptionCard
              entry={copy.entry}
              eyebrow={copy.entry.rebalanceEyebrowPrimary}
              primary
              includeSectors={includeSectors}
              excludeSectors={excludeSectors}
              mode="overexposed"
              variant={variant}
              preview={preview}
              track={track}
            />
            <ExploreOptionCard
              entry={copy.entry}
              eyebrow={copy.entry.exploreEyebrowSecondary}
              primary={false}
              variant={variant}
              preview={preview}
              track={track}
            />
          </>
        )}
      </div>

      <section className="card mt-6 rounded-[20px] border border-[color:var(--border)] p-4 sm:p-5">
        <h2 className="text-base font-bold text-[color:var(--foreground)]">
          {copy.methodology.title}
        </h2>
        <p className="mt-1.5 text-[13px] text-[color:var(--muted)]">
          {fill(copy.methodology.intro, { max: SCREENING_MAX_SCORE })}
        </p>
        <ul className="mt-3 list-none space-y-2 p-0">
          {copy.methodology.pillars.map((pillar) => (
            <li
              key={pillar.title}
              className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2"
            >
              <span className="text-[13px] font-semibold text-[color:var(--foreground)]">
                {pillar.title}
              </span>
              <span className="mt-0.5 block text-[12.5px] text-[color:var(--muted)]">
                {pillar.body}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[12px] text-[color:var(--muted)]">{copy.methodology.footnote}</p>
      </section>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href="/"
          className="btn-secondary inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold"
          onClick={() => {
            track("screening_entry_back_home", backMeta);
            void postScreeningEntryEvent("screening_entry_back_home", backMeta);
          }}
        >
          {copy.common.backHome}
        </Link>
      </div>

      <ScreeningDisclaimer className="mt-4" />
    </main>
  );
}
