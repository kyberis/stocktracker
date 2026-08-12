"use client";

import { useCallback, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useStealthMode } from "@/lib/stealth-context";
import { usePortfolio } from "@/lib/portfolio-context";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { ASSET_COLORS } from "@/components/dashboard-v2/AssetTypeFilter";
import type { AssetFilter } from "@/components/dashboard-v2/AssetTypeFilter";
import {
  MATRIX_PERIOD_KEYS,
  type MatrixCell,
  type MatrixPeriodKey,
  type MatrixRow,
} from "@/lib/portfolio-performance-matrix";
import { buildMatrixCellBreakdown, type MatrixCellBreakdown } from "@/lib/matrix-cell-breakdown";
import { usePortfolioPerformanceMatrix } from "@/hooks/use-portfolio-performance-matrix";
import PerformanceMatrixExplainerModal from "./PerformanceMatrixExplainerModal";
import MatrixCellExplainSheet from "./MatrixCellExplainSheet";
import type { Holding, CashEntry } from "@/lib/types";

const ASSET_LABEL_KEYS: Record<AssetFilter, string> = {
  all: "allAssets",
  stock: "stocksLabel",
  etf: "etfsLabel",
  fund: "fundsLabel",
  crypto: "cryptoLabel",
  fixed_return: "assetTypeFixedReturn",
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
  const { exchangeRates } = usePortfolio();
  const [explainerOpen, setExplainerOpen] = useState(false);
  const [cellExplain, setCellExplain] = useState<{
    assetKey: AssetFilter;
    period: MatrixPeriodKey;
    breakdown: MatrixCellBreakdown;
  } | null>(null);

  const {
    rows,
    loading,
    displayMode,
    setDisplayMode,
    baseCurrency,
    snapshots,
    transactions,
    currentByAsset,
    dayPctByAsset,
    dayAbsByAsset,
    demoMode,
  } = usePortfolioPerformanceMatrix({
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
      })),
    [t],
  );

  const openCellExplain = useCallback(
    (assetKey: AssetFilter, period: MatrixPeriodKey) => {
      const breakdown = buildMatrixCellBreakdown({
        assetKey,
        period,
        displayMode,
        baseCurrency,
        current: currentByAsset[assetKey] ?? 0,
        holdings,
        transactions,
        exchangeRates,
        snapshots,
        currentByAsset,
        dayAbs: dayAbsByAsset[assetKey] ?? null,
        dayPct: dayPctByAsset[assetKey] ?? null,
      });
      setCellExplain({ assetKey, period, breakdown });
    },
    [
      displayMode,
      baseCurrency,
      holdings,
      transactions,
      exchangeRates,
      snapshots,
      currentByAsset,
      dayAbsByAsset,
      dayPctByAsset,
    ],
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
          <button
            type="button"
            onClick={() => setExplainerOpen(true)}
            className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-full text-[color:var(--muted)] transition-colors hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--foreground)]"
            aria-label={t("matrixHowItWorksAria")}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
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
                onExplainCell={openCellExplain}
              />
            ))}
          </tbody>
        </table>
      </div>

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
            onExplainCell={openCellExplain}
          />
        ))}
      </div>

      <p className="px-5 pb-4 pt-2 text-center text-[10px] text-[color:var(--muted)]">{t("growthCaveat")}</p>

      <PerformanceMatrixExplainerModal isOpen={explainerOpen} onClose={() => setExplainerOpen(false)} />
      <MatrixCellExplainSheet
        open={cellExplain != null}
        onClose={() => setCellExplain(null)}
        assetKey={cellExplain?.assetKey ?? "all"}
        period={cellExplain?.period ?? "today"}
        periodLabel={cellExplain ? t(PERIOD_LABEL_KEYS[cellExplain.period]) : ""}
        assetLabel={cellExplain ? t(ASSET_LABEL_KEYS[cellExplain.assetKey]) : ""}
        breakdown={cellExplain?.breakdown ?? null}
        demoMode={demoMode}
      />
    </section>
  );
}

function CellExplainButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="ml-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-[color:var(--muted)] opacity-70 transition-opacity hover:opacity-100 hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--foreground)]"
      aria-label={label}
      title={label}
    >
      ?
    </button>
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
  onExplainCell,
}: {
  row: MatrixRow;
  columns: { key: MatrixPeriodKey; label: string }[];
  currency: string;
  stealthMode: boolean;
  loading: boolean;
  selected: boolean;
  t: (key: string) => string;
  onExplainCell: (assetKey: AssetFilter, period: MatrixPeriodKey) => void;
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
        const canExplain = !loading && cell.kind !== "empty" && cell.kind !== "pro";
        return (
          <td key={col.key} className="px-2 py-2.5 text-right text-[13px] font-semibold">
            <span className={`inline-flex items-center justify-end ${cellColor(cell)} ${loading ? "animate-value-shimmer" : ""}`}>
              {loading ? "—" : formatCell(cell, currency, stealthMode)}
              {canExplain && (
                <CellExplainButton
                  label={t("matrixCellExplainAria")}
                  onClick={() => onExplainCell(row.assetKey, col.key)}
                />
              )}
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
  onExplainCell,
}: {
  row: MatrixRow;
  columns: { key: MatrixPeriodKey; label: string }[];
  currency: string;
  stealthMode: boolean;
  loading: boolean;
  selected: boolean;
  t: (key: string) => string;
  onExplainCell: (assetKey: AssetFilter, period: MatrixPeriodKey) => void;
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
          const canExplain = !loading && cell.kind !== "empty" && cell.kind !== "pro";
          return (
            <div key={col.key} className="bg-[color:var(--surface-soft)] px-2 py-2 text-center">
              <div className="text-[9px] font-medium uppercase text-[color:var(--muted)]">{col.label}</div>
              <div
                className={`mt-0.5 inline-flex items-center justify-center gap-0.5 text-sm font-bold tabular-nums ${cellColor(cell)} ${loading ? "animate-value-shimmer" : ""}`}
              >
                {loading ? "—" : formatCell(cell, currency, stealthMode)}
                {canExplain && (
                  <CellExplainButton
                    label={t("matrixCellExplainAria")}
                    onClick={() => onExplainCell(row.assetKey, col.key)}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
