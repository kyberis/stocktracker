"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

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
  const [status, setStatus] = useState<BackfillStatus | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (holdingsCount === 0) return;
    let cancelled = false;
    fetch("/api/portfolio/backfill-snapshots?check=true", { credentials: "include" })
      .then((r) => r.json())
      .then((data: BackfillStatus) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [holdingsCount]);

  const runBackfill = useCallback(async () => {
    setBackfilling(true);
    setError(false);
    try {
      const res = await fetch("/api/portfolio/backfill-snapshots", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("backfill failed");
      onComplete();
    } catch {
      setError(true);
    } finally {
      setBackfilling(false);
    }
  }, [onComplete]);

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
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-400/30 bg-amber-500/5 text-sm">
      <span className="text-amber-500 shrink-0">⚠</span>
      <span className="flex-1 text-gray-700 dark:text-slate-300">
        Portfolio history can be improved. {reasonText}
      </span>
      <button
        onClick={runBackfill}
        disabled={backfilling}
        className="shrink-0 px-3.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold text-xs transition-colors disabled:opacity-50"
      >
        {backfilling ? "Recalculating…" : "Recalculate"}
      </button>
    </div>
  );
}
