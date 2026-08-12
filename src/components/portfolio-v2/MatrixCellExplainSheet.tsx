"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useI18n } from "@/lib/i18n";
import { fetchWithAuthRedirect } from "@/lib/auth/client-redirect";
import { formatCurrency, formatPercent } from "@/lib/utils";
import {
  buildDeterministicMatrixCellNarrative,
  MATRIX_CELL_EXPLAIN_DISCLAIMER,
  type MatrixCellBreakdown,
} from "@/lib/matrix-cell-breakdown";
import type { AssetFilter } from "@/components/dashboard-v2/AssetTypeFilter";
import type { MatrixPeriodKey } from "@/lib/portfolio-performance-matrix";

interface Props {
  open: boolean;
  onClose: () => void;
  assetKey: AssetFilter;
  period: MatrixPeriodKey;
  periodLabel: string;
  assetLabel: string;
  breakdown: MatrixCellBreakdown | null;
  demoMode?: boolean;
}

export default function MatrixCellExplainSheet({
  open,
  onClose,
  assetKey,
  period,
  periodLabel,
  assetLabel,
  breakdown,
  demoMode = false,
}: Props) {
  const { t, language } = useI18n();
  const focusTrapRef = useFocusTrap(open, onClose);
  const [narrative, setNarrative] = useState<string>("");
  const [disclaimer, setDisclaimer] = useState(MATRIX_CELL_EXPLAIN_DISCLAIMER);
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    if (!open || !breakdown) {
      setNarrative("");
      return;
    }
    setNarrative(buildDeterministicMatrixCellNarrative(breakdown));
    setDisclaimer(MATRIX_CELL_EXPLAIN_DISCLAIMER);
    if (demoMode) return;

    let cancelled = false;
    setLoadingAi(true);
    void (async () => {
      try {
        const res = await fetchWithAuthRedirect("/api/portfolio/matrix-cell-explain", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language, breakdown }),
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          narrative?: string;
          disclaimer?: string;
        };
        if (cancelled) return;
        if (data.narrative) setNarrative(data.narrative);
        if (data.disclaimer) setDisclaimer(data.disclaimer);
      } catch {
        // keep deterministic narrative
      } finally {
        if (!cancelled) setLoadingAi(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, breakdown, demoMode, language]);

  if (!open || !breakdown) return null;

  const money = (n: number | null | undefined) =>
    n == null || !Number.isFinite(n) ? "—" : formatCurrency(n, breakdown.baseCurrency);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm dark:bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="matrix-cell-explain-title"
        className="relative flex max-h-[min(90dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-xl sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[color:var(--border)] px-5 py-4">
          <h2 id="matrix-cell-explain-title" className="text-base font-semibold text-[color:var(--foreground)]">
            {t("matrixCellExplainTitle")}: {assetLabel} · {periodLabel}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg text-[color:var(--muted)] transition-colors hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--foreground)]"
            aria-label={t("close")}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
            {t("matrixCellExplainNotCostBasis")}
          </p>

          <section>
            <h3 className="text-sm font-semibold text-[color:var(--foreground)]">{t("matrixCellExplainFormula")}</h3>
            <p className="mt-1 font-mono text-[11px] text-[color:var(--muted)]">{breakdown.formula}</p>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              <dt className="text-[color:var(--muted)]">{t("matrixCellExplainCurrent")}</dt>
              <dd className="text-right font-semibold tabular-nums">{money(breakdown.current)}</dd>
              {period !== "today" && (
                <>
                  <dt className="text-[color:var(--muted)]">{t("matrixCellExplainPast")}</dt>
                  <dd className="text-right font-semibold tabular-nums">{money(breakdown.past)}</dd>
                  <dt className="text-[color:var(--muted)]">{t("matrixCellExplainNetCf")}</dt>
                  <dd className="text-right font-semibold tabular-nums">{money(breakdown.netCashFlow)}</dd>
                  <dt className="text-[color:var(--muted)]">{t("matrixCellExplainPl")}</dt>
                  <dd className="text-right font-semibold tabular-nums">{money(breakdown.pl)}</dd>
                </>
              )}
              {period === "today" && (
                <>
                  <dt className="text-[color:var(--muted)]">{t("matrixCellExplainDayAbs")}</dt>
                  <dd className="text-right font-semibold tabular-nums">{money(breakdown.dayAbs)}</dd>
                  <dt className="text-[color:var(--muted)]">{t("matrixCellExplainDayPct")}</dt>
                  <dd className="text-right font-semibold tabular-nums">
                    {breakdown.dayPct == null ? "—" : formatPercent(breakdown.dayPct)}
                  </dd>
                </>
              )}
              {breakdown.costBasis != null && (
                <>
                  <dt className="text-[color:var(--muted)]">{t("matrixCellExplainCostBasis")}</dt>
                  <dd className="text-right font-semibold tabular-nums">{money(breakdown.costBasis)}</dd>
                  <dt className="text-[color:var(--muted)]">{t("matrixCellExplainVsCost")}</dt>
                  <dd className="text-right font-semibold tabular-nums">{money(breakdown.unrealizedVsCost)}</dd>
                </>
              )}
            </dl>
          </section>

          {breakdown.warnings.length > 0 && (
            <ul className="list-disc space-y-1 pl-4 text-xs text-amber-800 dark:text-amber-200">
              {breakdown.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}

          {breakdown.transactions.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-[color:var(--foreground)]">
                {t("matrixCellExplainTxs")} ({breakdown.transactions.length})
              </h3>
              <ul className="mt-2 max-h-40 space-y-1.5 overflow-y-auto text-xs">
                {breakdown.transactions.map((tx) => (
                  <li
                    key={tx.id}
                    className="flex items-center justify-between gap-2 rounded border border-[color:var(--border)] px-2 py-1.5"
                  >
                    <span className="min-w-0 truncate text-[color:var(--muted)]">
                      {tx.date} · {tx.type} · {tx.ticker}
                      {tx.assetType ? ` (${tx.assetType})` : ""}
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">{money(tx.flowBase)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h3 className="text-sm font-semibold text-[color:var(--foreground)]">{t("matrixCellExplainNarrative")}</h3>
            {loadingAi && (
              <p className="mt-1 text-xs text-[color:var(--muted)]">{t("matrixCellExplainLoading")}</p>
            )}
            <p className="mt-1.5 text-xs leading-relaxed text-[color:var(--foreground)]">{narrative}</p>
            <p className="mt-2 text-[10px] text-[color:var(--muted)]">{disclaimer}</p>
          </section>

          <p className="sr-only">
            {assetKey}-{period}
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
