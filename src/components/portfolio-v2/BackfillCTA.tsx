"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
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

async function fetchBackfillStatus(): Promise<BackfillStatus> {
  const res = await fetch("/api/portfolio/backfill-snapshots?check=true", { credentials: "include" });
  return res.json() as Promise<BackfillStatus>;
}

async function pollUntilBackfillComplete(
  onComplete: () => void,
  setCheckKey: Dispatch<SetStateAction<number>>,
): Promise<void> {
  for (let i = 0; i < 36; i++) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const data = await fetchBackfillStatus();
    if (!data.needsBackfill) {
      setCheckKey((k) => k + 1);
      onComplete();
      return;
    }
  }
  throw new Error("backfill poll timeout");
}

export default function BackfillCTA({ holdingsCount, onComplete }: Props) {
  const { t } = useI18n();
  const { demoMode } = usePortfolio();
  const [status, setStatus] = useState<BackfillStatus | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [error, setError] = useState(false);
  const [checkKey, setCheckKey] = useState(0);
  const autoStartedRef = useRef(false);

  useEffect(() => {
    if (demoMode) return;
    if (holdingsCount === 0) return;
    let cancelled = false;
    fetchBackfillStatus()
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
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
      if (res.status === 409) {
        await pollUntilBackfillComplete(onComplete, setCheckKey);
        return;
      }
      if (!res.ok) throw new Error("backfill failed");
      setCheckKey((k) => k + 1);
      onComplete();
    } catch {
      setError(true);
      autoStartedRef.current = false;
    } finally {
      clearTimeout(timeout);
      setBackfilling(false);
    }
  }, [demoMode, onComplete]);

  useEffect(() => {
    if (demoMode) return;
    if (!status?.needsBackfill) return;
    if (backfilling || error) return;
    if (autoStartedRef.current) return;
    autoStartedRef.current = true;
    void runBackfill();
  }, [status, demoMode, backfilling, error, runBackfill]);

  const handleRetry = useCallback(() => {
    autoStartedRef.current = true;
    void runBackfill();
  }, [runBackfill]);

  if (demoMode) return null;
  if (holdingsCount === 0) return null;
  if (status && !status.needsBackfill && !backfilling && !error) return null;
  if (!status && !backfilling && !error) return null;

  if (backfilling) {
    return (
      <div className="flex items-center gap-2 px-1 text-xs text-[color:var(--muted)]">
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span>{t("updatingPortfolioHistory")}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[var(--radius-card)] border border-red-400/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-600 dark:text-red-400">
        {t("backfillHistoryFailed")}{" "}
        <button type="button" onClick={handleRetry} className="font-medium underline">
          {t("backfillHistoryRetry")}
        </button>
      </div>
    );
  }

  return null;
}
