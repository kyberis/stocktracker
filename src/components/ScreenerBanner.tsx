"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme-context";
import TierFeatureBadge from "./TierFeatureBadge";

export default function ScreenerBanner() {
  const { t } = useI18n();
  const { layoutTheme } = useTheme();

  if (layoutTheme === "terminal") {
    return (
      <Link href="/screener" className="block border border-zinc-800 hover:border-green-500/40 transition-colors group">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <svg className="w-4 h-4 text-green-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            <span className="font-mono text-xs text-zinc-300 group-hover:text-green-400 transition-colors">{t("screenerBannerTitle")}</span>
            <TierFeatureBadge requiredPlan="pro" size="xs" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-zinc-600 hidden sm:inline">{t("screenerBannerDesc")}</span>
            <svg className="w-3.5 h-3.5 text-zinc-600 group-hover:text-green-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14m-7-7 7 7-7 7" />
            </svg>
          </div>
        </div>
      </Link>
    );
  }

  if (layoutTheme === "canvas") {
    return (
      <Link href="/screener" className="block bg-white border border-slate-200 rounded-2xl hover:shadow-md transition-all group">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-800">{t("screenerBannerTitle")}</span>
                <TierFeatureBadge requiredPlan="pro" size="xs" />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{t("screenerBannerDesc")}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium shrink-0">
            <span className="hidden sm:inline">{t("screenerBannerCta")}</span>
            <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14m-7-7 7 7-7 7" />
            </svg>
          </div>
        </div>
      </Link>
    );
  }

  if (layoutTheme === "studio") {
    return (
      <Link href="/screener" className="block rounded-[20px] border border-white/5 bg-white/[0.02] backdrop-blur-sm hover:border-green-500/20 transition-all group">
        <div className="flex items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
              <svg className="w-4.5 h-4.5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-200">{t("screenerBannerTitle")}</span>
                <TierFeatureBadge requiredPlan="pro" size="xs" />
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">{t("screenerBannerDesc")}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-green-400 text-sm font-medium shrink-0">
            <span className="hidden sm:inline">{t("screenerBannerCta")}</span>
            <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14m-7-7 7 7-7 7" />
            </svg>
          </div>
        </div>
      </Link>
    );
  }

  // Default theme
  return (
    <Link href="/screener" className="block bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl hover:border-emerald-300 dark:hover:border-emerald-500/30 hover:shadow-md dark:hover:shadow-none transition-all group">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{t("screenerBannerTitle")}</span>
              <TierFeatureBadge requiredPlan="pro" size="xs" />
            </div>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{t("screenerBannerDesc")}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-sm font-medium shrink-0">
          <span className="hidden sm:inline">{t("screenerBannerCta")}</span>
          <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14m-7-7 7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
