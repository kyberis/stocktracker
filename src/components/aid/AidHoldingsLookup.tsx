"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useStealthMode } from "@/lib/stealth-context";
import { useTrack } from "@/lib/use-track";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { yahooCryptoSymbolToBase } from "@/lib/crypto-page-symbols";
import type { Holding } from "@/lib/types";

const AID_FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)]";

function holdingDetailHref(h: Holding): string {
  if (h.assetType === "crypto") {
    const base = yahooCryptoSymbolToBase(h.ticker);
    return `/crypto?symbol=${encodeURIComponent(base)}`;
  }
  const q = h.exchange ? `?exchange=${encodeURIComponent(h.exchange)}` : "";
  return `/stock/${encodeURIComponent(h.ticker)}${q}`;
}

function intelligenceHref(h: Holding): string | null {
  if (h.assetType === "crypto") return null;
  const q = h.exchange ? `?exchange=${encodeURIComponent(h.exchange)}` : "";
  return `/stock/${encodeURIComponent(h.ticker)}/intelligence${q}`;
}

interface Props {
  holdings: Holding[];
}

export default function AidHoldingsLookup({ holdings }: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const track = useTrack();
  const { quotes, activePortfolioCurrency } = usePortfolio();
  const { stealthMode } = useStealthMode();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const sorted = useMemo(
    () => [...holdings].sort((a, b) => (b.valueInEUR ?? 0) - (a.valueInEUR ?? 0)),
    [holdings],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (h) =>
        h.ticker.toLowerCase().includes(q) ||
        h.name.toLowerCase().includes(q) ||
        (h.isin && h.isin.toLowerCase().includes(q)),
    );
  }, [sorted, query]);

  const visible = filtered.slice(0, 12);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPanelOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  const goToHolding = useCallback(
    (h: Holding) => {
      track("aid_holding_detail_clicked", { ticker: h.ticker, assetType: h.assetType ?? "stock" });
      setPanelOpen(false);
      setQuery("");
      router.push(holdingDetailHref(h));
    },
    [router, track],
  );

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((i) => Math.min(i + 1, Math.max(0, visible.length - 1)));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter" && visible[highlight]) {
      e.preventDefault();
      goToHolding(visible[highlight]!);
    }
    if (e.key === "Escape") {
      setPanelOpen(false);
    }
  };

  if (holdings.length === 0) return null;

  return (
    <section
      className="card rounded-[var(--radius-card)] border border-emerald-500/15 bg-emerald-500/[0.03] p-4 sm:p-5"
      aria-label={t("aidHoldingsLookupTitle")}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[color:var(--foreground)]">{t("aidHoldingsLookupTitle")}</h3>
          <p className="mt-0.5 text-xs text-[color:var(--muted)]">{t("aidHoldingsLookupDesc")}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            track("aid_holding_lookup_focused");
            inputRef.current?.focus();
            setPanelOpen(true);
          }}
          className={`min-h-9 shrink-0 rounded-full bg-emerald-600 px-4 text-[11px] font-semibold text-white hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 ${AID_FOCUS}`}
        >
          {t("aidHoldingsLookupCta")}
        </button>
      </div>

      <div ref={containerRef} className="relative">
        <label htmlFor={`${listId}-input`} className="sr-only">
          {t("aidHoldingsLookupPlaceholder")}
        </label>
        <div className="flex items-center gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2">
          <svg className="h-4 w-4 shrink-0 text-[color:var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
          </svg>
          <input
            ref={inputRef}
            id={`${listId}-input`}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPanelOpen(true);
              setHighlight(0);
            }}
            onFocus={() => {
              setPanelOpen(true);
              track("aid_holding_lookup_focused");
            }}
            onKeyDown={onInputKeyDown}
            placeholder={t("aidHoldingsLookupPlaceholder")}
            className={`min-h-10 flex-1 bg-transparent text-sm text-[color:var(--foreground)] placeholder:text-[color:var(--muted)] ${AID_FOCUS}`}
            role="combobox"
            aria-expanded={panelOpen}
            aria-controls={`${listId}-listbox`}
            aria-autocomplete="list"
          />
        </div>

        {panelOpen && (
          <ul
            id={`${listId}-listbox`}
            role="listbox"
            className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] py-1 shadow-lg"
          >
            {visible.length === 0 ? (
              <li className="px-3 py-2 text-xs text-[color:var(--muted)]">{t("aidHoldingsLookupEmpty")}</li>
            ) : (
              visible.map((h, i) => {
                const q = quotes[h.ticker];
                const pct = q?.regularMarketChangePercent;
                const pctClass =
                  pct == null || pct === 0
                    ? "text-[color:var(--muted)]"
                    : pct > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-500 dark:text-red-400";
                const intel = intelligenceHref(h);
                return (
                  <li key={h.id} role="option" aria-selected={highlight === i}>
                    <div
                      className={`flex flex-wrap items-center gap-2 px-3 py-2 ${
                        highlight === i ? "bg-[color:var(--surface-highlight)]" : ""
                      }`}
                    >
                      <button
                        type="button"
                        className={`min-w-0 flex-1 text-left ${AID_FOCUS}`}
                        onMouseEnter={() => setHighlight(i)}
                        onClick={() => goToHolding(h)}
                      >
                        <span className="block text-sm font-semibold text-[color:var(--foreground)]">{h.ticker}</span>
                        <span className="block truncate text-[11px] text-[color:var(--muted)]">{h.name}</span>
                      </button>
                      <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
                        <span className="text-[11px] tabular-nums text-[color:var(--foreground)]">
                          {stealthMode ? "•••" : formatCurrency(h.valueInEUR, activePortfolioCurrency)}
                        </span>
                        {pct != null && (
                          <span className={`text-[10px] font-semibold tabular-nums ${pctClass}`}>
                            {pct >= 0 ? "+" : ""}
                            {formatPercent(pct)}
                          </span>
                        )}
                      </div>
                      <div className="flex w-full gap-1.5 sm:w-auto sm:flex-col">
                        <Link
                          href={holdingDetailHref(h)}
                          onClick={() =>
                            track("aid_holding_detail_clicked", { ticker: h.ticker, assetType: h.assetType ?? "stock" })
                          }
                          className={`rounded-full border border-[color:var(--border)] px-2 py-1 text-[10px] font-semibold text-[color:var(--foreground)] hover:bg-[color:var(--surface-soft)] ${AID_FOCUS}`}
                        >
                          {t("aidHoldingsLookupDetail")}
                        </Link>
                        {intel && (
                          <Link
                            href={intel}
                            onClick={() => track("aid_holding_intelligence_clicked", { ticker: h.ticker })}
                            className={`rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15 ${AID_FOCUS}`}
                          >
                            {t("aidHoldingsLookupIntel")}
                          </Link>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {sorted.slice(0, 8).map((h) => (
          <button
            key={h.id}
            type="button"
            onClick={() => goToHolding(h)}
            className={`rounded-full border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--foreground)] hover:border-emerald-500/30 hover:bg-emerald-500/10 ${AID_FOCUS}`}
          >
            {h.ticker}
          </button>
        ))}
      </div>
    </section>
  );
}
