"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePortfolio } from "@/lib/portfolio-context";

const DISMISS_KEY = "promo_banner_dismissed";

interface BannerConfig {
  enabled: boolean;
  title: string;
  badge: string;
  description: string;
  ctaText: string;
  ctaLink: string;
}

export default function LeafPromoBanner() {
  const { demoMode } = usePortfolio();
  const [config, setConfig] = useState<BannerConfig | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (demoMode) return;
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch { /* private browsing */ }

    fetch("/api/promo-banner")
      .then((r) => r.json())
      .then((data: BannerConfig) => {
        if (data.enabled) {
          setConfig(data);
          setVisible(true);
        }
      })
      .catch(() => {});
  }, [demoMode]);

  function dismiss() {
    setVisible(false);
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
  }

  if (!visible || !config) return null;

  return (
    <div className="relative rounded-xl border border-violet-500/20 dark:border-violet-500/25 bg-gradient-to-r from-violet-500/10 via-white/80 to-emerald-500/10 dark:from-violet-500/10 dark:via-slate-800/60 dark:to-emerald-500/10 p-4 sm:p-5 overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-2xl pointer-events-none -translate-y-1/2 translate-x-1/2" />

      <div className="relative flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="hidden sm:flex w-10 h-10 rounded-xl bg-violet-500/15 items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-violet-500 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {config.title}
              {config.badge && (
                <span className="ml-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  {config.badge}
                </span>
              )}
            </p>
            {config.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {config.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {config.ctaText && config.ctaLink && (
            <Link
              href={config.ctaLink}
              className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              {config.ctaText}
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          )}
          <button
            onClick={dismiss}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-700/50 transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
