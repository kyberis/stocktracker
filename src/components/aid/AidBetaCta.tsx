"use client";

import Link from "next/link";
import { useFeatureFlagContext } from "@/lib/feature-flag-context";
import { useI18n } from "@/lib/i18n";
import { useTrack } from "@/lib/use-track";
import { useAidStatus } from "@/hooks/useAidStatus";

export default function AidBetaCta() {
  const { flags, isLoaded } = useFeatureFlagContext();
  const { t } = useI18n();
  const track = useTrack();
  const aidStatus = useAidStatus(isLoaded && flags.aid_beta);

  if (!isLoaded || !flags.aid_beta) return null;

  const newCount = aidStatus.data?.newCount ?? 0;

  return (
    <Link
      href="/aid"
      onClick={() => track("aid_beta_cta_clicked", { newCount: String(newCount) })}
      className="group card flex items-center gap-3 rounded-[var(--radius-card)] border border-emerald-500/25 bg-gradient-to-r from-emerald-500/[0.08] to-transparent p-4 transition-colors hover:border-emerald-500/40"
    >
      <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
        {t("aidBetaBadge")}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-[color:var(--foreground)]">{t("aidTitle")}</div>
        <div className="text-xs text-[color:var(--muted)]">{t("aidSubtitle")}</div>
      </div>
      {newCount > 0 && (
        <span
          className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold tabular-nums text-amber-700 dark:text-amber-300"
          aria-label={t("aidBriefingCatchUp").replace("{n}", String(newCount))}
        >
          {newCount}
        </span>
      )}
      <svg
        className="h-5 w-5 shrink-0 text-emerald-500 transition-transform group-hover:translate-x-0.5"
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
