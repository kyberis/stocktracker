"use client";

import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useStealthMode } from "@/lib/stealth-context";
import { usePortfolioHomeData } from "@/components/dashboard-v2/use-portfolio-home-data";
import { usePortfolioPerformanceMatrix } from "@/hooks/use-portfolio-performance-matrix";
import { computeAllocationByType } from "@/lib/portfolio-summary";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { CashEntry, Holding } from "@/lib/types";
import type { MatrixPeriodKey } from "@/lib/portfolio-performance-matrix";

const TYPE_KEYS = ["stock", "etf", "crypto", "cash"] as const;
const PERIOD_KEYS: MatrixPeriodKey[] = ["today", "oneWeek", "oneMonth"];

interface Props {
  holdings: Holding[];
  cashEntries: CashEntry[];
  onRowClick?: (typeKey: string) => void;
}

function cellText(
  value: number | undefined,
  kind: "percent" | "empty",
  stealthMode: boolean,
): string {
  if (kind === "empty" || value == null) return "—";
  if (stealthMode) return "•••";
  return formatPercent(value);
}

function pnlColorClass(value: number | undefined): string {
  if (value == null || Number.isNaN(value) || value === 0) return "text-[color:var(--muted)]";
  if (value > 0) return "text-emerald-600 dark:text-emerald-400";
  return "text-red-500 dark:text-red-400";
}

export default function AidAssetTable({ holdings, cashEntries, onRowClick }: Props) {
  const { t } = useI18n();
  const { quotes, exchangeRates, activePortfolioCurrency } = usePortfolio();
  const { stealthMode } = useStealthMode();

  const homeData = usePortfolioHomeData({ holdings, cashEntries });
  const { rows, loading, displayMode } = usePortfolioPerformanceMatrix({
    holdings,
    cashEntries,
    dayChangePctByType: homeData.dayChangePctByType,
  });

  const typeAlloc = useMemo(
    () => computeAllocationByType(holdings, cashEntries, quotes, exchangeRates, activePortfolioCurrency),
    [holdings, cashEntries, quotes, exchangeRates, activePortfolioCurrency],
  );

  const cashValue = typeAlloc.find((a) => a.key === "cash")?.valueEUR ?? 0;

  const labelForType = (key: string) => {
    if (key === "stock") return t("stocksLabel");
    if (key === "etf") return t("etfsLabel");
    if (key === "crypto") return t("cryptoLabel");
    return t("cash");
  };

  const matrixByKey = useMemo(() => {
    const map = new Map<string, (typeof rows)[number]>();
    for (const row of rows) map.set(row.assetKey, row);
    return map;
  }, [rows]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-xs">
        <thead>
          <tr className="border-b border-[color:var(--border)] text-[10px] uppercase tracking-wide text-[color:var(--muted)]">
            <th className="py-2 text-left font-semibold">{t("aidColType")}</th>
            <th className="py-2 text-right font-semibold">{t("aidColValue")}</th>
            <th className="py-2 text-right font-semibold">{t("aidColDay")}</th>
            <th className="py-2 text-right font-semibold">{t("aidColWeek")}</th>
            <th className="py-2 text-right font-semibold">{t("aidColMonth")}</th>
          </tr>
        </thead>
        <tbody>
          {TYPE_KEYS.map((typeKey) => {
            const value =
              typeKey === "cash"
                ? cashValue
                : matrixByKey.get(typeKey as "stock" | "etf" | "crypto")?.currentValue ?? 0;
            if (value <= 0 && typeKey !== "cash") return null;

            const row = typeKey === "cash" ? null : matrixByKey.get(typeKey as "stock" | "etf" | "crypto");
            const periodCell = (
              period: MatrixPeriodKey,
            ): { text: string; toneValue: number | undefined } => {
              if (typeKey === "cash") return { text: "—", toneValue: undefined };
              const cell = row?.cells[period];
              if (!cell || cell.kind === "pro") return { text: "—", toneValue: undefined };
              if (displayMode === "currency" && cell.kind === "currency") {
                const v = cell.value ?? 0;
                return {
                  text: stealthMode ? "•••" : formatCurrency(v, activePortfolioCurrency),
                  toneValue: v,
                };
              }
              const v = cell.kind === "empty" ? undefined : cell.value;
              return {
                text: cellText(v, cell.kind === "empty" ? "empty" : "percent", stealthMode),
                toneValue: v,
              };
            };

            const renderPeriodTd = (period: MatrixPeriodKey) => {
              const { text, toneValue } = periodCell(period);
              return (
                <td className={`py-2.5 text-right tabular-nums ${pnlColorClass(toneValue)}`}>{text}</td>
              );
            };

            return (
              <tr
                key={typeKey}
                className="border-b border-[color:var(--border)]/60 hover:bg-[color:var(--surface-soft)] cursor-pointer"
                onClick={() => onRowClick?.(typeKey)}
              >
                <td className="py-2.5 font-medium text-[color:var(--foreground)]">{labelForType(typeKey)}</td>
                <td className="py-2.5 text-right tabular-nums text-[color:var(--foreground)]">
                  {stealthMode ? "•••" : formatCurrency(value, activePortfolioCurrency)}
                </td>
                {renderPeriodTd("today")}
                {renderPeriodTd("oneWeek")}
                {renderPeriodTd("oneMonth")}
              </tr>
            );
          })}
        </tbody>
      </table>
      {loading && (
        <p className="mt-2 text-[10px] text-[color:var(--muted)]" role="status">
          {t("loading")}
        </p>
      )}
      <p className="mt-2 text-[10px] text-[color:var(--muted)]">{t("aidTableHint")}</p>
    </div>
  );
}
