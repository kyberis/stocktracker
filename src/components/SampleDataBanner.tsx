"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";

const DISMISSED_KEY = "trefolio_sample_banner_dismissed";
const SEEDED_KEY = "trefolio_onboarding_auto_seeded";

const SEED_TICKERS = new Set([
  "ADBE","NVO","TSM","GOOGL","AMZN","BRK-B","CVX","W9C","WTRG","ITX.MC",
  "KHC","MAIN","NA9.DE","NNN","NOVO-B.CO","OXY","PFE","O","SRB.L","SILA",
  "SIRI","VZ","IB01","IS0E","ICGA","BTC-USD","ETH-USD",
]);

export default function SampleDataBanner() {
  const { t } = useI18n();
  const { holdings } = usePortfolio();
  const [dismissed, setDismissed] = useState(true);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISSED_KEY) === "1");
    setSeeded(localStorage.getItem(SEEDED_KEY) === "1");
  }, []);

  const hasOwnData =
    holdings.some((h) => h.accountId) ||
    holdings.some((h) => !SEED_TICKERS.has(h.ticker));

  if (dismissed || !seeded || hasOwnData) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl px-4 py-3 mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0 text-sm">
        <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <span className="text-amber-800 dark:text-amber-200 truncate">{t("sampleDataBanner")}</span>
        <a
          href="/import"
          className="font-semibold text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 underline underline-offset-2 whitespace-nowrap"
        >
          {t("sampleDataBannerCta")}
        </a>
      </div>
      <button
        onClick={() => { localStorage.setItem(DISMISSED_KEY, "1"); setDismissed(true); }}
        className="text-amber-400 dark:text-amber-500/60 hover:text-amber-600 dark:hover:text-amber-300 transition-colors shrink-0"
        aria-label={t("dismiss")}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
