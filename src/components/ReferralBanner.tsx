"use client";

import { useState, useEffect } from "react";
import { Gift } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const DISMISS_KEY = "referral_banner_dismissed";

interface ReferralBannerProps {
  onShare: () => void;
}

export default function ReferralBanner({ onShare }: ReferralBannerProps) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(DISMISS_KEY)) setVisible(true);
    } catch {}
  }, []);

  function dismiss() {
    setVisible(false);
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch {}
  }

  if (!visible) return null;

  return (
    <div className="relative rounded-xl border border-emerald-500/20 dark:border-emerald-500/25 bg-gradient-to-r from-emerald-500/10 via-white/80 to-teal-500/10 dark:from-emerald-500/10 dark:via-slate-800/60 dark:to-teal-500/10 p-4 sm:p-5 overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none -translate-y-1/2 translate-x-1/2" />

      <div className="relative flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="hidden sm:flex w-10 h-10 rounded-xl bg-emerald-500/15 items-center justify-center shrink-0">
            <Gift className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{t("referralBannerTitle")}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t("referralBannerDesc")}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onShare}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            {t("referralBannerCta")}
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
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
