"use client";

import { useEffect, useMemo, useState } from "react";
import type { PickerBroker } from "@/lib/import-broker-picker";
import {
  brokerInitials,
  filterPickerBrokers,
  mergePickerBrokers,
} from "@/lib/import-broker-picker";
import type { AvailableBrokerage } from "@/lib/snaptrade-client";

export function BrokerPickerGrid({
  t,
  onSelectSync,
  onSelectTradeRepublic,
  onCsvFallback,
  onRequestBroker,
}: {
  t: (key: string) => string;
  onSelectSync: (slug: string) => void;
  onSelectTradeRepublic: () => void;
  onCsvFallback: (typedName: string) => void;
  onRequestBroker: (typedName: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [brokers, setBrokers] = useState<PickerBroker[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [brokenLogos, setBrokenLogos] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const form = new FormData();
        form.append("action", "list-brokerages");
        const res = await fetch("/api/snaptrade", { method: "POST", body: form });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || "Failed to list brokerages.");
        }
        const list = Array.isArray(data.brokerages) ? (data.brokerages as AvailableBrokerage[]) : [];
        if (!cancelled) setBrokers(mergePickerBrokers(list));
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Failed to list brokerages.");
          setBrokers(mergePickerBrokers([]));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => filterPickerBrokers(brokers, query), [brokers, query]);

  return (
    <div className="space-y-3">
      <label className="sr-only" htmlFor="broker-picker-search">
        {t("brokerPickerSearchPlaceholder")}
      </label>
      <input
        id="broker-picker-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("brokerPickerSearchPlaceholder")}
        autoComplete="off"
        className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white min-h-[44px]"
      />

      {loading && (
        <div className="py-8 flex justify-center">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && loadError && brokers.length <= 1 && (
        <p className="text-xs text-amber-700 dark:text-amber-400" role="status">
          {loadError}
        </p>
      )}

      {!loading && filtered.length > 0 && (
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="list">
          {filtered.map((broker) => {
            const showImg = Boolean(broker.logoUrl) && !brokenLogos[broker.id];
            return (
              <li key={broker.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (broker.kind === "csv") onSelectTradeRepublic();
                    else onSelectSync(broker.slug);
                  }}
                  className="w-full min-h-[44px] flex items-center gap-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 px-3 py-2.5 text-left hover:border-emerald-400 dark:hover:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500 transition-colors"
                >
                  {showImg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={broker.logoUrl!}
                      alt=""
                      width={40}
                      height={40}
                      loading="lazy"
                      className="w-10 h-10 rounded-lg object-contain bg-white shrink-0"
                      onError={() => setBrokenLogos((prev) => ({ ...prev, [broker.id]: true }))}
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="w-10 h-10 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0"
                    >
                      {brokerInitials(broker.displayName)}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-gray-900 dark:text-white truncate">
                      {broker.displayName}
                    </span>
                    <span className="inline-flex mt-0.5 px-1.5 py-0 rounded text-[10px] font-semibold bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300">
                      {broker.kind === "csv" ? t("brokerPickerBadgeCsv") : t("brokerPickerBadgeSync")}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!loading && query.trim() && filtered.length === 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/40 p-4 space-y-3 text-center">
          <p className="text-sm font-medium text-gray-800 dark:text-slate-200">{t("brokerPickerNoMatch")}</p>
          <button
            type="button"
            onClick={() => onCsvFallback(query.trim())}
            className="btn-primary text-sm px-4 py-2 min-h-[44px] w-full sm:w-auto"
          >
            {t("brokerPickerCsvCta")}
          </button>
          <button
            type="button"
            onClick={() => onRequestBroker(query.trim())}
            className="block w-full text-xs text-indigo-600 dark:text-indigo-400 hover:underline underline-offset-2 min-h-[44px]"
          >
            {t("brokerPickerRequestBroker")}
          </button>
        </div>
      )}
    </div>
  );
}
