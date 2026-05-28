"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useStealthMode } from "@/lib/stealth-context";
import { useTrack } from "@/lib/use-track";
import { usePortfolioHomeData } from "@/components/dashboard-v2/use-portfolio-home-data";
import { usePortfolioPerformanceMatrix } from "@/hooks/use-portfolio-performance-matrix";
import { matrixCellToPeriodStat } from "@/lib/aid/matrix-period";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { CashEntry, Holding } from "@/lib/types";
import AidAssetTable from "./AidAssetTable";
import AidAllocationModal from "./AidAllocationModal";
import AidDividendsModal from "./AidDividendsModal";

type Period = "day" | "week" | "month";

const AID_FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)]";

interface Props {
  holdings: Holding[];
  cashEntries: CashEntry[];
}

function formatPeriodStat(
  stat: ReturnType<typeof matrixCellToPeriodStat>,
  currency: string,
  stealthMode: boolean,
): { primary: string; secondary: string } {
  if (stealthMode) return { primary: "•••", secondary: "" };
  if (stat.unavailable) return { primary: "Pro", secondary: "" };
  if (stat.pct != null) {
    const secondary =
      stat.abs != null
        ? `${stat.abs >= 0 ? "+" : ""}${formatCurrency(stat.abs, currency)}`
        : "";
    return { primary: formatPercent(stat.pct), secondary };
  }
  if (stat.abs != null) {
    return {
      primary: `${stat.abs >= 0 ? "+" : ""}${formatCurrency(stat.abs, currency)}`,
      secondary: "",
    };
  }
  return { primary: "—", secondary: "" };
}

export default function AidPortfolioCard({ holdings, cashEntries }: Props) {
  const { t } = useI18n();
  const track = useTrack();
  const { activePortfolioCurrency } = usePortfolio();
  const { stealthMode } = useStealthMode();
  const [period, setPeriod] = useState<Period>("day");
  const [allocOpen, setAllocOpen] = useState(false);
  const [divOpen, setDivOpen] = useState(false);
  const [focusType, setFocusType] = useState<string | null>(null);

  const homeData = usePortfolioHomeData({ holdings, cashEntries });
  const { totals, dayGainLoss, dayGainLossPercent, dayChangePctByType } = homeData;

  const { rows, loading: matrixLoading } = usePortfolioPerformanceMatrix({
    holdings,
    cashEntries,
    dayChangePctByType,
  });

  const allRow = useMemo(() => rows.find((r) => r.assetKey === "all"), [rows]);

  const periodStats = useMemo(() => {
    const day = matrixCellToPeriodStat(allRow?.cells.today);
    const week = matrixCellToPeriodStat(allRow?.cells.oneWeek);
    const month = matrixCellToPeriodStat(allRow?.cells.oneMonth);

    if (!allRow && dayGainLossPercent != null) {
      return [
        { key: "day" as const, label: t("aidPeriodDay"), stat: { pct: dayGainLossPercent, abs: dayGainLoss, unavailable: false } },
        { key: "week" as const, label: t("aidPeriodWeek"), stat: week },
        { key: "month" as const, label: t("aidPeriodMonth"), stat: month },
      ];
    }

    return [
      { key: "day" as const, label: t("aidPeriodDay"), stat: day.pct != null || day.abs != null ? day : { pct: dayGainLossPercent, abs: dayGainLoss, unavailable: false } },
      { key: "week" as const, label: t("aidPeriodWeek"), stat: week },
      { key: "month" as const, label: t("aidPeriodMonth"), stat: month },
    ];
  }, [allRow, dayGainLoss, dayGainLossPercent, t]);

  const selectedStat = periodStats.find((p) => p.key === period)?.stat ?? periodStats[0].stat;
  const heroFormatted = formatPeriodStat(selectedStat, activePortfolioCurrency, stealthMode);
  const isPositive =
    selectedStat.pct != null ? selectedStat.pct >= 0 : (selectedStat.abs ?? 0) >= 0;

  const openAlloc = (typeKey?: string) => {
    track("aid_allocation_opened", typeKey ? { type: typeKey } : undefined);
    setFocusType(typeKey ?? null);
    setAllocOpen(true);
  };

  return (
    <>
      <section className="card rounded-[var(--radius-card)] p-4 sm:p-5" aria-label={t("aidPortfolioValue")}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
            {t("aidPortfolioValue")}
          </h2>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => openAlloc()}
              className={`min-h-9 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 ${AID_FOCUS}`}
            >
              {t("aidAllocation")}
            </button>
            <button
              type="button"
              onClick={() => {
                track("aid_dividends_opened");
                setDivOpen(true);
              }}
              className={`min-h-9 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 text-[11px] font-semibold text-amber-800 dark:text-amber-200 ${AID_FOCUS}`}
            >
              {t("aidDividends")}
            </button>
          </div>
        </div>

        <div className="mb-4">
          <div className="text-3xl font-semibold tabular-nums tracking-tight text-[color:var(--foreground)]">
            {stealthMode ? "•••••" : formatCurrency(totals.totalCurrentEUR, activePortfolioCurrency)}
          </div>
          <div
            className={`mt-1 text-sm tabular-nums ${
              isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
            }`}
          >
            {heroFormatted.primary}
            {heroFormatted.secondary ? (
              <span className="ml-1">{heroFormatted.secondary}</span>
            ) : null}
            <span className="ml-1 text-[color:var(--muted)]">
              {period === "day" ? t("todayLabel") : period === "week" ? t("aidPeriodWeek") : t("aidPeriodMonth")}
            </span>
          </div>
        </div>

        <div className="mb-4 flex gap-1 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-0.5" role="tablist" aria-label={t("aidPeriodTabs")}>
          {periodStats.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={period === key}
              onClick={() => setPeriod(key)}
              className={`flex-1 min-h-9 rounded-full px-2 text-[11px] font-semibold transition-colors ${AID_FOCUS} ${
                period === key
                  ? "bg-[color:var(--surface-highlight)] text-[color:var(--foreground)]"
                  : "text-[color:var(--muted)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2">
          {periodStats.map(({ key, label, stat }) => {
            const formatted = formatPeriodStat(stat, activePortfolioCurrency, stealthMode);
            return (
              <div
                key={key}
                className={`rounded-xl border px-3 py-2 ${
                  period === key
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-[color:var(--border)] bg-[color:var(--surface-soft)]"
                }`}
              >
                <div className="text-[10px] uppercase tracking-wide text-[color:var(--muted)]">{label}</div>
                <div className="text-sm font-semibold tabular-nums text-[color:var(--foreground)]">
                  {formatted.primary}
                </div>
                {formatted.secondary ? (
                  <div className="text-[10px] tabular-nums text-[color:var(--muted)]">{formatted.secondary}</div>
                ) : null}
              </div>
            );
          })}
        </div>

        {matrixLoading && (
          <p className="mb-2 text-[10px] text-[color:var(--muted)]" role="status">
            {t("loading")}
          </p>
        )}

        <AidAssetTable holdings={holdings} cashEntries={cashEntries} onRowClick={(type) => openAlloc(type)} />
      </section>

      <AidAllocationModal
        open={allocOpen}
        onClose={() => setAllocOpen(false)}
        holdings={holdings}
        cashEntries={cashEntries}
        focusType={focusType}
      />
      <AidDividendsModal open={divOpen} onClose={() => setDivOpen(false)} />
    </>
  );
}
