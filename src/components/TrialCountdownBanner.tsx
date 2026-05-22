"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import type { TranslationKey } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n";
import { getTrialBannerVisibility } from "@/lib/trial-activation";

function tOr(t: (k: TranslationKey) => string, key: TranslationKey, fallback: string) {
  const v = t(key);
  return v === key ? fallback : v;
}

export default function TrialCountdownBanner() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const visibility = useMemo(() => {
    if (!user) return { show: false as const };
    return getTrialBannerVisibility({
      trialActivatedAt: user.trialActivatedAt ?? "",
      plan: user.plan,
      planExpiresAt: user.planExpiresAt ?? "",
      nowMs,
    });
  }, [user, nowMs]);

  if (!visibility.show) return null;

  if (visibility.variant === "expired") {
    const msg = tOr(
      t,
      "trialBannerExpiredMessage" as TranslationKey,
      "Your Trefolio Pro trial has ended. Subscribe to continue.",
    );
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-4 py-2.5 bg-gradient-to-r from-red-500/10 to-orange-500/10 dark:from-red-500/15 dark:to-orange-500/15 border-b border-red-500/20">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-red-500/15 text-red-700 dark:text-red-400 rounded">
            Trial Ended
          </span>
          <span className="text-sm text-slate-700 dark:text-slate-300">{msg}</span>
        </div>
        <a
          href="/profile?section=subscription"
          className="shrink-0 px-3 py-1 text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors text-center"
        >
          Subscribe to Trefolio Pro
        </a>
      </div>
    );
  }

  const { days, hours } = visibility;

  return (
    <div className="flex items-center justify-between px-4 py-1.5 text-xs bg-emerald-500/5 dark:bg-emerald-500/10 border-b border-emerald-500/10 dark:border-emerald-500/20">
      <div className="flex items-center gap-2 min-w-0">
        <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded">
          Pro Trial
        </span>
        <span className="text-slate-600 dark:text-slate-400 truncate">
          {days}d {hours}h remaining
        </span>
      </div>
      <a href="/profile?section=subscription" className="shrink-0 text-emerald-600 dark:text-emerald-400 hover:underline">
        Subscribe to keep Pro →
      </a>
    </div>
  );
}
