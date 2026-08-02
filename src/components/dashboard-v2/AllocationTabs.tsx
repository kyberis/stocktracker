"use client";

import { useState, useMemo, type ReactNode } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useStealthMode } from "@/lib/stealth-context";
import { computeAllocationByType } from "@/lib/portfolio-summary";
import { computeTaxonomyAllocations, computeDonutSegments, getDonutArc } from "@/lib/services/taxonomy";
import { computeTagAllocations } from "@/lib/services/tag-allocation";
import { formatCurrency } from "@/lib/utils";
import type { Holding, CashEntry, TaxonomyAllocation } from "@/lib/types";
import type { AllocationSlice } from "@/lib/portfolio-summary";

type AllocTab = "type" | "sectors" | "regions" | "tags";

const TAXONOMY_HREF = "/tools/taxonomy";

interface Props {
  holdings: Holding[];
  cashEntries: CashEntry[];
  /** In-dashboard navigation (Classic). When omitted, CTA links to /tools/taxonomy. */
  onShowMore?: () => void;
}

function toTaxonomy(slices: AllocationSlice[]): TaxonomyAllocation[] {
  return slices.map((s) => ({ label: s.label, valueEUR: s.valueEUR, percent: s.percent, color: s.color }));
}

function Donut({ segments, centerLabel, centerValue }: {
  segments: ReturnType<typeof computeDonutSegments>;
  centerLabel: string;
  centerValue: string;
}) {
  const valueSizeClass = centerValue.length > 12 ? "text-[10px]" : centerValue.length > 9 ? "text-xs" : "text-sm";

  return (
    <div className="relative w-[120px] h-[120px] mx-auto mb-2">
      <svg viewBox="0 0 100 100" width="120" height="120">
        <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" className="text-[color:var(--surface-highlight)]" strokeWidth="10" />
        {segments.map((seg) =>
          seg.percent > 0.5 ? (
            <path
              key={seg.label}
              d={getDonutArc(seg.start, seg.end, 40, 50, 50)}
              fill="none"
              stroke={seg.color}
              strokeWidth="10"
              strokeLinecap="round"
            />
          ) : null,
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] text-[color:var(--muted)]">{centerLabel}</span>
        <span className={`${valueSizeClass} font-bold tabular-nums text-[color:var(--foreground)]`}>{centerValue}</span>
      </div>
    </div>
  );
}

function Legend({ items }: { items: TaxonomyAllocation[] }) {
  return (
    <div className="space-y-0.5 w-full">
      {items.map((a) => (
        <div key={a.label} className="flex items-center justify-between py-0.5 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: a.color }} />
            <span className="text-[color:var(--muted)]">{a.label}</span>
          </div>
          <span className="font-semibold tabular-nums text-[color:var(--foreground)]">{a.percent.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
}

export default function AllocationTabs({ holdings, cashEntries, onShowMore }: Props) {
  const { t } = useI18n();
  const { quotes, exchangeRates, activePortfolioCurrency } = usePortfolio();
  const { stealthMode } = useStealthMode();
  const [tab, setTab] = useState<AllocTab>("type");

  const typeAlloc = useMemo(
    () => computeAllocationByType(holdings, cashEntries, quotes, exchangeRates, activePortfolioCurrency),
    [holdings, cashEntries, quotes, exchangeRates, activePortfolioCurrency],
  );

  const sectorAlloc = useMemo(
    () => computeTaxonomyAllocations(holdings, quotes, exchangeRates, "sector", t("v2Unclassified")),
    [holdings, quotes, exchangeRates, t],
  );

  const regionAlloc = useMemo(
    () => computeTaxonomyAllocations(holdings, quotes, exchangeRates, "region", t("v2Unclassified")),
    [holdings, quotes, exchangeRates, t],
  );

  const tagAlloc = useMemo(
    () =>
      computeTagAllocations(holdings, cashEntries, quotes, exchangeRates, activePortfolioCurrency, {
        untagged: t("tagAllocationUntagged"),
        crypto: t("cryptoType"),
        manual: {
          cash: t("assetTypeCash"),
          real_estate: t("realEstate"),
          savings: t("assetTypeSavings"),
          pension: t("assetTypePension"),
          fixed_return: t("assetTypeFixedReturn"),
        },
      }),
    [holdings, cashEntries, quotes, exchangeRates, activePortfolioCurrency, t],
  );

  const current =
    tab === "type"
      ? toTaxonomy(typeAlloc)
      : tab === "sectors"
        ? sectorAlloc
        : tab === "regions"
          ? regionAlloc
          : tagAlloc;

  const segments = useMemo(() => computeDonutSegments(current), [current]);

  const total = typeAlloc.reduce((s, a) => s + a.valueEUR, 0);
  const centerValue = stealthMode ? "•••••" : formatCurrency(total, activePortfolioCurrency);
  const centerLabel =
    tab === "type"
      ? t("v2NetWorth")
      : tab === "sectors"
        ? t("v2AllocSectors")
        : tab === "regions"
          ? t("v2AllocRegions")
          : t("v2AllocTags");

  const tabs: { key: AllocTab; label: string }[] = [
    { key: "type", label: t("v2AllocType") },
    { key: "sectors", label: t("v2AllocSectors") },
    { key: "regions", label: t("v2AllocRegions") },
    { key: "tags", label: t("v2AllocTags") },
  ];

  const unclassifiedLabel = t("v2Unclassified");
  const hasUnclassified =
    holdings.some((h) => !h.sector || !h.region || !h.assetClass) ||
    sectorAlloc.some((a) => a.label === unclassifiedLabel && a.percent > 0) ||
    regionAlloc.some((a) => a.label === unclassifiedLabel && a.percent > 0);

  const ctaLabel = hasUnclassified ? t("v2AllocFixUnclassifiedCta") : t("v2AllocManageCta");

  const ManageCta = ({ children, className }: { children: ReactNode; className?: string }) => {
    if (onShowMore) {
      return (
        <button type="button" onClick={onShowMore} className={className}>
          {children}
        </button>
      );
    }
    return (
      <Link href={TAXONOMY_HREF} className={className}>
        {children}
      </Link>
    );
  };

  return (
    <div className="card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]">{t("v2Allocation")}</p>
        <ManageCta className="min-h-8 shrink-0 text-[11px] font-semibold text-emerald-600 hover:underline dark:text-emerald-400">
          {ctaLabel}
        </ManageCta>
      </div>

      <div className="mb-3 flex gap-0.5 rounded-xl bg-[color:var(--surface-soft)] p-0.5">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`flex-1 rounded-lg px-2 py-1 text-[10px] font-medium transition-colors ${
              tab === tb.key
                ? "bg-[color:var(--surface-highlight)] text-[color:var(--foreground)] shadow-sm"
                : "text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center">
        <Donut
          segments={segments}
          centerLabel={centerLabel}
          centerValue={tab === "type" ? centerValue : String(current.length)}
        />
        <Legend items={current} />
      </div>

      {hasUnclassified && (
        <ManageCta className="mt-3 block w-full rounded-lg border border-amber-400/30 bg-amber-500/[0.08] px-3 py-2 text-center text-[11px] font-semibold text-amber-800 hover:bg-amber-500/[0.14] dark:text-amber-200">
          {t("v2AllocFixUnclassifiedHint")}
        </ManageCta>
      )}

      {!hasUnclassified && (
        <ManageCta className="mt-3 block w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2 text-center text-[11px] font-semibold text-[color:var(--foreground)] hover:bg-[color:var(--surface-highlight)]">
          {t("v2AllocManageCta")}
        </ManageCta>
      )}
    </div>
  );
}
