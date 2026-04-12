"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import type { ProviderSearchResult } from "@/lib/api-providers/types";
import { CRYPTO_PAGE_SUPPORTED_SYMBOLS, yahooCryptoSymbolToBase } from "@/lib/crypto-page-symbols";

function normalizeSearchResponse(data: unknown): ProviderSearchResult[] {
  if (Array.isArray(data)) return data as ProviderSearchResult[];
  if (data && typeof data === "object" && "results" in data && Array.isArray((data as { results: unknown }).results)) {
    return (data as { results: ProviderSearchResult[] }).results;
  }
  return [];
}

export default function ExploreAssetSearch({ initialQuery = "" }: { initialQuery?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<ProviderSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [unsupportedCrypto, setUnsupportedCrypto] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const qParam = searchParams.get("q");
  useEffect(() => {
    setQuery(qParam ?? "");
  }, [qParam]);

  const search = useCallback(async (q: string) => {
    if (q.length < 1) {
      setResults([]);
      return;
    }
    setLoading(true);
    setUnsupportedCrypto(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&includeCrypto=true`);
      if (!res.ok) {
        setResults([]);
        return;
      }
      const data = await res.json();
      setResults(normalizeSearchResponse(data));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  const handleSelect = (r: ProviderSearchResult) => {
    setUnsupportedCrypto(null);
    if (r.quoteType === "CRYPTOCURRENCY") {
      const base = yahooCryptoSymbolToBase(r.symbol);
      if (!CRYPTO_PAGE_SUPPORTED_SYMBOLS.has(base)) {
        setUnsupportedCrypto(base);
        return;
      }
      router.push(`/crypto?symbol=${encodeURIComponent(base)}`);
      return;
    }
    router.push(`/stock/${encodeURIComponent(r.symbol)}?exchange=${encodeURIComponent(r.exchange)}`);
  };

  const typeLabel = (qt: string) => {
    if (qt === "ETF") return t("exploreAssetTypeEtf");
    if (qt === "CRYPTOCURRENCY") return t("exploreAssetTypeCrypto");
    return t("exploreAssetTypeEquity");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{t("explorePageTitle")}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{t("explorePageSubtitle")}</p>
      </div>

      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-slate-500 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("exploreSearchPlaceholder")}
          autoComplete="off"
          className="w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50"
          aria-label={t("exploreSearchPlaceholder")}
        />
      </div>

      {unsupportedCrypto && (
        <div
          className="rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100/95"
          role="alert"
        >
          <p>{t("exploreCryptoUnsupported").replace("{symbol}", unsupportedCrypto)}</p>
          <button
            type="button"
            onClick={() => router.push("/crypto")}
            className="mt-2 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            {t("exploreCryptoOpenMarket")}
          </button>
        </div>
      )}

      {loading && query.length > 0 && (
        <p className="text-sm text-gray-500 dark:text-slate-400">{t("exploreSearchLoading")}</p>
      )}

      {!loading && query.length > 0 && results.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-slate-400">{t("exploreSearchEmpty")}</p>
      )}

      {results.length > 0 && (
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-2">
            {t("exploreResultsHeading")}
          </h2>
          <ul className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 divide-y divide-gray-100 dark:divide-slate-800" role="listbox" aria-label={t("exploreResultsHeading")}>
            {results.map((r) => (
              <li key={`${r.symbol}-${r.exchange}`} role="option">
                <button
                  type="button"
                  onClick={() => handleSelect(r)}
                  className="w-full flex items-center justify-between gap-4 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-800/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-inset"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 dark:text-white">{r.symbol}</div>
                    <div className="text-sm text-gray-500 dark:text-slate-400 truncate">{r.shortname}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500">{r.exchange || "—"}</div>
                    <div className="mt-1">
                      <span
                        className={`inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${
                          r.quoteType === "ETF"
                            ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                            : r.quoteType === "CRYPTOCURRENCY"
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                              : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                        }`}
                      >
                        {typeLabel(r.quoteType)}
                      </span>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
