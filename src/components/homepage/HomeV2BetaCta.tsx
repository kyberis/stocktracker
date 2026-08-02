"use client";

import Link from "next/link";
import { useFeatureFlagContext } from "@/lib/feature-flag-context";
import { useI18n } from "@/lib/i18n";
import { useTrack } from "@/lib/use-track";

export default function HomeV2BetaCta() {
  const { flags, isLoaded } = useFeatureFlagContext();
  const { t } = useI18n();
  const track = useTrack();

  if (!isLoaded || !flags.home_v2) return null;

  return (
    <Link
      href="/home-v2"
      onClick={() => track("home_v2_cta_clicked")}
      className="group card flex items-center gap-3 rounded-[var(--radius-card)] border border-teal-500/25 bg-gradient-to-r from-teal-500/[0.08] to-transparent p-4 transition-colors hover:border-teal-500/40"
    >
      <span className="inline-flex shrink-0 items-center rounded-full bg-teal-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300">
        {t("homeV2BetaBadge")}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-[color:var(--foreground)]">{t("homeV2Title")}</div>
        <div className="text-xs text-[color:var(--muted)]">{t("homeV2Subtitle")}</div>
      </div>
      <svg
        className="h-5 w-5 shrink-0 text-teal-500 transition-transform group-hover:translate-x-0.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
      </svg>
    </Link>
  );
}
