"use client";

import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { useStealthMode } from "@/lib/stealth-context";
import { formatCurrency, formatPercent } from "@/lib/utils";
import TierFeatureBadge from "@/components/TierFeatureBadge";
import { ASSET_COLORS } from "@/components/dashboard-v2/AssetTypeFilter";
import type { AssetFilter } from "@/components/dashboard-v2/AssetTypeFilter";
import {
  MATRIX_PERIOD_KEYS,
  PRO_MATRIX_PERIOD_KEYS,
  type MatrixCell,
  type MatrixPeriodKey,
  type MatrixRow,
} from "@/lib/portfolio-performance-matrix";
import { usePortfolioPerformanceMatrix } from "@/hooks/use-portfolio-performance-matrix";
import type { Holding, CashEntry } from "@/lib/types";

const ASSET_LABEL_KEYS: Record<AssetFilter, string> = {
  all: "allAssets",
  stock: "stocksLabel",
  etf: "etfsLabel",
  crypto: "cryptoLabel",
};

const PERIOD_LABEL_KEYS: Record<MatrixPeriodKey, string> = {
  today: "matrixPeriodToday",
  oneWeek: "period1w",
  oneMonth: "period1m",
  ytd: "ytd",
  oneYear: "oneYear",
  threeYear: "matrixPeriod3y",
  fiveYear: "matrixPeriod5y",
  tenYear: "matrixPeriod10y",
  all: "matrixPeriodAll",
};

interface Props {
  holdings: Holding[];
  cashEntries: CashEntry[];
  refreshKey?: number;
  activeFilter?: AssetFilter;
  dayChangePctByType?: Partial<Record<AssetFilter, number>>;
}

function cellColor(cell: MatrixCell): string {
  if (cell.kind === "pro" || cell.kind === "empty") return "text-[color:var(--muted)]";
  const v = cell.value ?? 0;
  if (v > 0) return "text-emerald-600 dark:text-emerald-400";
  if (v < 0) return "text-red-500 dark:text-red-400";
  return "text-[color:var(--muted)]";
}

function formatCell(
  cell: MatrixCell,
  currency: string,
  stealthMode: boolean,
): string {
  if (cell.kind === "pro") return "Pro";
  if (cell.kind === "empty") return "—";
  if (stealthMode) return "•••";
  if (cell.kind === "currency") {
    const v = cell.value ?? 0;
    const prefix = v > 0 ? "+" : "";
    return `${prefix}${formatCurrency(v, currency)}`;
  }
  const v = cell.value ?? 0;
  return formatPercent(v);
}

export default function PortfolioPerformanceMatrix({
  holdings,
  cashEntries,
  refreshKey,
  activeFilter = "all",
  dayChangePctByType,
}: Props) {
  const { t } = useI18n();
  const { stealthMode } = useStealthMode();
  const { rows, loading, displayMode, setDisplayMode, isPro, baseCurrency } =
    usePortfolioPerformanceMatrix({
      holdings,
      cashEntries,
      refreshKey,
      dayChangePctByType,
    });

  const columns = useMemo(
    () =>
      MATRIX_PERIOD_KEYS.map((key) => ({
        key,
        label: t(PERIOD_LABEL_KEYS[key]),
        isProCol: PRO_MATRIX_PERIOD_KEYS.includes(key),
      })),
    [t],
  );

  if (holdings.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center px-5 pb-4 text-sm text-[color:var(--muted)]">
        {t("noHoldings")}
      </div>
    );
  }

  return (
    <section className="border-t border-[color:var(--border)]" aria-label={t("performanceMatrixTitle")}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[color:var(--border)] px-5 py-3">
        <div className="flex items-center gap-1.5">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--muted)]">
            {t("performanceMatrixTitle")}
          </h3>
          {!isPro && <TierFeatureBadge requiredPlan="pro" size="sm" />}
        </div>
        <div
          className="inline-flex rounded-full border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-0.5"
          role="group"
          aria-label={t("matrixDisplayMode")}
        >
          <button
            type="button"
            onClick={() => setDisplayMode("percent")}
            className={`min-h-9 rounded-full px-3 text-[11px] font-semibold transition-colors ${
              displayMode === "percent"
                ? "bg-[color:var(--surface-highlight)] text-[color:var(--foreground)]"
                : "text-[color:var(--muted)]"
            }`}
          >
            %
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode("currency")}
            className={`min-h-9 rounded-full px-3 text-[11px] font-semibold transition-colors ${
              displayMode === "currency"
                ? "bg-[color:var(--surface-highlight)] text-[color:var(--foreground)]"
                : "text-[color:var(--muted)]"
            }`}
          >
            {baseCurrency === "EUR" ? "€" : baseCurrency}
          </button>
        </div>
      </div>

      {/* Desktop / tablet table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse font-variant-numeric tabular-nums">
          <thead>
            <tr className="border-b border-[color:var(--border)]">
              <th
                scope="col"
                className="sticky left-0 z-[1] bg-[color:var(--card)] px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-[color:var(--muted)]"
              >
                {t("matrixColumnAsset")}
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className="px-2 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-[color:var(--muted)] whitespace-nowrap"
                >
                  {col.label}
                  {col.isProCol && !isPro && (
                    <span className="ml-0.5 text-[8px] opacity-60" aria-hidden="true">
                      ★
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <MatrixTableRow
                key={row.assetKey}
                row={row}
                columns={columns}
                currency={baseCurrency}
                stealthMode={stealthMode}
                loading={loading}
                selected={activeFilter === row.assetKey}
                t={t}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: card per asset */}
      <div className="flex flex-col gap-3 p-4 sm:hidden">
        {rows.map((row) => (
          <MobileAssetCard
            key={row.assetKey}
            row={row}
            columns={columns}
            currency={baseCurrency}
            stealthMode={stealthMode}
            loading={loading}
            selected={activeFilter === row.assetKey}
            t={t}
          />
        ))}
      </div>

      <p className="px-5 pb-4 pt-2 text-center text-[10px] text-[color:var(--muted)]">{t("growthCaveat")}</p>
    </section>
  );
}

function MatrixTableRow({
  row,
  columns,
  currency,
  stealthMode,
  loading,
  selected,
  t,
}: {
  row: MatrixRow;
  columns: { key: MatrixPeriodKey; label: string }[];
  currency: string;
  stealthMode: boolean;
  loading: boolean;
  selected: boolean;
  t: (key: string) => string;
}) {
  const color = ASSET_COLORS[row.assetKey];
  return (
    <tr
      className={`border-b border-[color:var(--border)]/60 last:border-0 ${
        selected ? "bg-[color:var(--surface-soft)]" : ""
      }`}
    >
      <td className="sticky left-0 z-[1] bg-[color:var(--card)] px-5 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-7 w-[3px] shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />
          <span>
            <span className="block text-[11px] font-bold uppercase tracking-wide" style={{ color }}>
              {t(ASSET_LABEL_KEYS[row.assetKey])}
            </span>
            <span className="block text-[10px] text-[color:var(--muted)]">
              {stealthMode ? "•••" : formatCurrency(row.currentValue, currency)}
            </span>
          </span>
        </div>
      </td>
      {columns.map((col) => {
        const cell = row.cells[col.key];
        return (
          <td key={col.key} className="px-2 py-2.5 text-right text-[13px] font-semibold">
            <span className={`${cellColor(cell)} ${loading ? "animate-value-shimmer" : ""}`}>
              {loading ? "—" : formatCell(cell, currency, stealthMode)}
            </span>
          </td>
        );
      })}
    </tr>
  );
}

function MobileAssetCard({
  row,
  columns,
  currency,
  stealthMode,
  loading,
  selected,
  t,
}: {
  row: MatrixRow;
  columns: { key: MatrixPeriodKey; label: string }[];
  currency: string;
  stealthMode: boolean;
  loading: boolean;
  selected: boolean;
  t: (key: string) => string;
}) {
  const color = ASSET_COLORS[row.assetKey];
  return (
    <div
      className={`overflow-hidden rounded-[var(--radius-card)] border ${
        selected ? "border-[color:var(--accent)]/40" : "border-[color:var(--border)]"
      }`}
      style={{ borderLeftWidth: 3, borderLeftColor: color }}
    >
      <div className="flex items-center justify-between border-b border-[color:var(--border)] px-3 py-2.5">
        <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color }}>
          {t(ASSET_LABEL_KEYS[row.assetKey])}
        </span>
        <span className="text-sm font-semibold tabular-nums text-[color:var(--foreground)]">
          {stealthMode ? "•••" : formatCurrency(row.currentValue, currency)}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-px bg-[color:var(--border)]">
        {columns.map((col) => {
          const cell = row.cells[col.key];
          return (
            <div key={col.key} className="bg-[color:var(--surface-soft)] px-2 py-2 text-center">
              <div className="text-[9px] font-medium uppercase text-[color:var(--muted)]">{col.label}</div>
              <div className={`mt-0.5 text-sm font-bold tabular-nums ${cellColor(cell)} ${loading ? "animate-value-shimmer" : ""}`}>
                {loading ? "—" : formatCell(cell, currency, stealthMode)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
