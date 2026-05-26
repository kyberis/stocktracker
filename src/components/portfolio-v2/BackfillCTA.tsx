"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";

interface BackfillStatus {
  needsBackfill: boolean;
  reason?: string;
  snapshotCount: number;
  earliestTx?: string | null;
}

interface Props {
  holdingsCount: number;
  onComplete: () => void;
}

export default function BackfillCTA({ holdingsCount, onComplete }: Props) {
  const { t } = useI18n();
  const { demoMode } = usePortfolio();
  const [status, setStatus] = useState<BackfillStatus | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [error, setError] = useState(false);
  const [checkKey, setCheckKey] = useState(0);

  useEffect(() => {
    if (demoMode) return;
    if (holdingsCount === 0) return;
    let cancelled = false;
    fetch("/api/portfolio/backfill-snapshots?check=true", { credentials: "include" })
      .then((r) => r.json())
      .then((data: BackfillStatus) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [demoMode, holdingsCount, checkKey]);

  const runBackfill = useCallback(async () => {
    if (demoMode) return;
    setBackfilling(true);
    setError(false);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180_000);
    try {
      const res = await fetch("/api/portfolio/backfill-snapshots", {
        method: "POST",
        credentials: "include",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error("backfill failed");
      setCheckKey((k) => k + 1);
      onComplete();
    } catch {
      setError(true);
    } finally {
      clearTimeout(timeout);
      setBackfilling(false);
    }
  }, [demoMode, onComplete]);

  if (demoMode) return null;
  if (holdingsCount === 0 || (status && !status.needsBackfill)) return null;
  if (!status) return null;

  const isEmptyHistory = (status.snapshotCount ?? 0) === 0;

  if (isEmptyHistory) {
    return (
      <div className="card flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="text-4xl mb-4 opacity-60">📊</div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          {t("generateHistoryTitle") ?? "Generate Portfolio History"}
        </h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 max-w-md mb-6">
          {t("generateHistoryBody") ??
            "We'll calculate your portfolio value evolution from your transactions and market data. This may take a minute."}
        </p>
        {backfilling ? (
          <div className="flex items-center gap-3 text-sm text-blue-500">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {t("generatingHistory") ?? "Generating history…"}
          </div>
        ) : (
          <button
            onClick={runBackfill}
            className="px-6 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition-colors"
          >
            {t("generateHistoryBtn") ?? "Generate History"}
          </button>
        )}
        {error && (
          <p className="mt-3 text-sm text-red-500">
            Something went wrong.{" "}
            <button onClick={runBackfill} className="underline font-medium">
              Retry
            </button>
          </p>
        )}
      </div>
    );
  }

  const reasonText =
    status.reason === "missing_asset_type_data"
      ? "Asset breakdown data is missing."
      : status.reason === "missing_invested_data"
        ? "Cost basis data needs updating."
        : "Some historical data may be incomplete.";

  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-card)] border border-amber-400/18 bg-amber-500/[0.06] px-4 py-3 text-sm">
      <span className="text-amber-500 shrink-0">⚠</span>
      <span className="flex-1 text-gray-700 dark:text-slate-300">
        Portfolio history can be improved. {reasonText}
        {error && (
          <span className="block mt-1 text-red-500 dark:text-red-400">
            Recalculation failed.{" "}
            <button onClick={runBackfill} className="underline font-medium">
              Retry
            </button>
          </span>
        )}
      </span>
      <button
        onClick={runBackfill}
        disabled={backfilling}
        className="shrink-0 rounded-xl border border-amber-400/14 bg-amber-500/10 px-3.5 py-1.5 text-xs font-semibold text-amber-600 transition-colors hover:bg-amber-500/18 dark:text-amber-400 disabled:opacity-50"
      >
        {backfilling ? "Recalculating…" : "Recalculate"}
      </button>
    </div>
  );
}
