"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import type { Transaction } from "@/lib/types";

const TYPE_COLOR: Record<string, string> = {
  buy:      "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  sell:     "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300",
  dividend: "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-300",
  fee:      "bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-400",
};

function fmt(n: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "EUR",
    maximumFractionDigits: 2,
  }).format(n);
}

export default function SyncedTransactionsPage() {
  const { t } = useI18n();
  const params = useSearchParams();
  const router = useRouter();

  const since = params.get("since") ?? undefined;
  const broker = params.get("broker") ?? undefined;

  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchTxs = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const url = new URL("/api/transactions", window.location.origin);
      url.searchParams.set("source", "snaptrade");
      if (since) url.searchParams.set("since", since);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("fetch failed");
      const data: Transaction[] = await res.json();
      setTxs(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [since]);

  useEffect(() => { fetchTxs(); }, [fetchTxs]);

  const brokerLabel = broker || t("brokerSyncAutoSyncActive");
  const sinceLabel = since
    ? new Date(since).toLocaleString(undefined, {
        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-300 transition-colors"
          aria-label="Back"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("syncConfidenceManualTitle")}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {brokerLabel}
            {sinceLabel && <> · {t("brokerSyncLastSynced")} {sinceLabel}</>}
          </p>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
          Could not load transactions. <button onClick={fetchTxs} className="underline">Retry</button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && txs.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center dark:border-slate-700 dark:bg-slate-800/40">
          <svg className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M3 10h18M3 14h18M3 18h18" />
          </svg>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("syncConfidenceNoNewTx")}</p>
          <Link href="/import?method=snaptrade_api" className="mt-3 inline-flex text-xs text-emerald-600 hover:underline dark:text-emerald-400">
            {t("syncConfidenceViewChanges")} →
          </Link>
        </div>
      )}

      {/* Transaction list */}
      {!loading && !error && txs.length > 0 && (
        <>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {txs.length} transaction{txs.length !== 1 ? "s" : ""} imported
          </p>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {txs.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                {/* Left */}
                <div className="flex items-center gap-3 min-w-0">
                  {/* Type badge */}
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${TYPE_COLOR[tx.type] ?? TYPE_COLOR.fee}`}>
                    {tx.type}
                  </span>
                  {/* Ticker + name */}
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {tx.ticker}
                    </span>
                    {tx.name && (
                      <span className="ml-1.5 text-xs text-slate-400 dark:text-slate-500 truncate">
                        {tx.name}
                      </span>
                    )}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">{tx.date}</span>
                      {tx.shares !== 0 && (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                          · {tx.shares > 0 ? "+" : ""}{tx.shares} shares
                        </span>
                      )}
                      {tx.brokerName && (
                        <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-1.5 py-0 text-[10px] font-medium text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400">
                          {tx.brokerName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: amount */}
                <span className={`shrink-0 text-sm font-semibold tabular-nums ${
                  tx.type === "sell" || tx.type === "dividend"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-gray-800 dark:text-slate-200"
                }`}>
                  {tx.type === "buy" ? "-" : "+"}{fmt(Math.abs(tx.totalAmount), tx.currency)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
