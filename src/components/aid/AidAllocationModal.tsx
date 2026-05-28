"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useStealthMode } from "@/lib/stealth-context";
import { computeAllocationByType } from "@/lib/portfolio-summary";
import { topHoldingsForAssetType } from "@/lib/aid/holding-allocation-detail";
import { computeTaxonomyAllocations, computeDonutSegments, getDonutArc } from "@/lib/services/taxonomy";
import { formatCurrency } from "@/lib/utils";
import type { CashEntry, Holding, RebalanceTarget } from "@/lib/types";
import AidModalShell from "./AidModalShell";

type AllocTab = "type" | "sectors" | "regions";

interface Props {
  open: boolean;
  onClose: () => void;
  holdings: Holding[];
  cashEntries: CashEntry[];
  focusType?: string | null;
}

function Donut({ segments, centerLabel, centerValue }: {
  segments: ReturnType<typeof computeDonutSegments>;
  centerLabel: string;
  centerValue: string;
}) {
  return (
    <div className="relative mx-auto mb-3 h-[140px] w-[140px]">
      <svg viewBox="0 0 100 100" width="140" height="140">
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
        <span className="text-sm font-bold tabular-nums text-[color:var(--foreground)]">{centerValue}</span>
      </div>
    </div>
  );
}

const TYPE_LABELS: Record<string, string> = {
  stock: "Stocks",
  etf: "ETFs",
  crypto: "Crypto",
  cash: "Cash",
};

export default function AidAllocationModal({ open, onClose, holdings, cashEntries, focusType }: Props) {
  const { t } = useI18n();
  const { quotes, exchangeRates, activePortfolioCurrency } = usePortfolio();
  const { stealthMode } = useStealthMode();
  const [tab, setTab] = useState<AllocTab>("type");
  const [targets, setTargets] = useState<RebalanceTarget[]>([]);

  useEffect(() => {
    if (!open) return;
    fetch("/api/rebalance-targets", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setTargets(Array.isArray(data) ? data : []))
      .catch(() => setTargets([]));
  }, [open]);

  useEffect(() => {
    if (focusType && open) setTab("type");
  }, [focusType, open]);

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

  const activeItems = tab === "type" ? typeAlloc : tab === "sectors" ? sectorAlloc : regionAlloc;
  const segments = computeDonutSegments(activeItems);
  const total = activeItems.reduce((s, a) => s + a.valueEUR, 0);

  const targetByLabel = useMemo(() => {
    const map = new Map<string, number>();
    for (const tgt of targets) {
      if (tgt.category === "assetClass") map.set(tgt.label, tgt.targetPercent);
    }
    return map;
  }, [targets]);

  const detailRows = useMemo(() => {
    if (tab !== "type" || !focusType || focusType === "cash") return [];
    return topHoldingsForAssetType(
      holdings,
      quotes,
      exchangeRates,
      activePortfolioCurrency,
      focusType,
      6,
    );
  }, [tab, focusType, holdings, quotes, exchangeRates, activePortfolioCurrency]);

  const tabs: { id: AllocTab; label: string }[] = [
    { id: "type", label: t("aidAllocByType") },
    { id: "sectors", label: t("aidAllocSectors") },
    { id: "regions", label: t("aidAllocRegions") },
  ];

  return (
    <AidModalShell open={open} onClose={onClose} title={t("aidAllocation")} ariaLabel={t("aidAllocation")}>
      <div className="p-4 space-y-4">
        <div className="flex gap-1 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-0.5" role="tablist">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`flex-1 min-h-9 rounded-full px-2 text-[11px] font-semibold transition-colors ${
                tab === id
                  ? "bg-[color:var(--surface-highlight)] text-[color:var(--foreground)]"
                  : "text-[color:var(--muted)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <Donut
          segments={segments}
          centerLabel={t("aidTotal")}
          centerValue={stealthMode ? "••••" : formatCurrency(total, activePortfolioCurrency)}
        />

        <div className="space-y-1">
          {activeItems.map((item) => {
            const target =
              tab === "type" && "key" in item
                ? targetByLabel.get(item.label) ?? targetByLabel.get(TYPE_LABELS[item.key as string] ?? "")
                : undefined;
            const drift = target != null ? item.percent - target : null;
            return (
              <div
                key={item.label}
                className={`rounded-lg px-2 py-1.5 text-xs ${
                  focusType && "key" in item && item.key === focusType
                    ? "border border-emerald-500/20 bg-emerald-500/10"
                    : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.color }} />
                    <span className="truncate text-[color:var(--muted)]">{item.label}</span>
                  </div>
                  <span className="font-semibold tabular-nums text-[color:var(--foreground)]">
                    {stealthMode ? "•••" : `${item.percent.toFixed(1)}%`}
                  </span>
                </div>
                {target != null && !stealthMode && (
                  <div className="mt-0.5 flex justify-between pl-4 text-[10px] text-[color:var(--muted)]">
                    <span>
                      {t("aidVsTarget")}: {target.toFixed(1)}%
                    </span>
                    <span className={drift != null && Math.abs(drift) > 2 ? "text-amber-600 dark:text-amber-400" : ""}>
                      {drift != null ? `${drift >= 0 ? "+" : ""}${drift.toFixed(1)}%` : ""}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {detailRows.length > 0 && (
          <div className="border-t border-[color:var(--border)] pt-3">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">
              {t("aidTopInType").replace("{type}", TYPE_LABELS[focusType!] ?? focusType!)}
            </h3>
            <ul className="space-y-1 text-xs">
              {detailRows.map((row) => (
                <li key={row.ticker} className="flex justify-between gap-2">
                  <span className="font-medium text-[color:var(--foreground)]">{row.ticker}</span>
                  <span className="tabular-nums text-[color:var(--muted)]">
                    {stealthMode ? "•••" : `${row.percentOfType.toFixed(1)}%`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Link
          href="/?tab=diversification"
          className="block text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          {t("aidOpenDiversification")}
        </Link>
      </div>
    </AidModalShell>
  );
}
