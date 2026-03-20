"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

type NudgeVariant = "amber" | "blue" | "emerald" | "violet";
type DismissMode = "session" | "permanent" | "none";

interface DataUpgradeNudgeProps {
  variant: NudgeVariant;
  titleKey: string;
  descKey: string;
  titleReplacements?: Record<string, string>;
  dismissKey: string;
  dismissMode?: DismissMode;
  className?: string;
}

const VARIANT_STYLES: Record<NudgeVariant, { banner: string; icon: string }> = {
  amber: {
    banner:
      "bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/20 dark:from-amber-500/10 dark:to-amber-600/5 dark:border-amber-500/20",
    icon: "bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
  blue: {
    banner:
      "bg-gradient-to-r from-blue-500/10 to-indigo-500/5 border border-blue-500/20 dark:from-blue-500/10 dark:to-indigo-500/5 dark:border-blue-500/20",
    icon: "bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400",
  },
  emerald: {
    banner:
      "bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 dark:from-emerald-500/10 dark:to-emerald-500/5 dark:border-emerald-500/20",
    icon: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  violet: {
    banner:
      "bg-gradient-to-r from-violet-500/10 to-indigo-500/5 border border-violet-500/20 dark:from-violet-500/10 dark:to-indigo-500/5 dark:border-violet-500/20",
    icon: "bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400",
  },
};

const ICON_SVG = (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
    />
  </svg>
);

function isDismissedInStorage(key: string, mode: DismissMode): boolean {
  if (mode === "none") return false;
  try {
    if (mode === "permanent") return localStorage.getItem(key) === "1";
    if (mode === "session") return sessionStorage.getItem(key) === "1";
  } catch {
    /* private browsing */
  }
  return false;
}

function persistDismiss(key: string, mode: DismissMode) {
  try {
    if (mode === "permanent") localStorage.setItem(key, "1");
    if (mode === "session") sessionStorage.setItem(key, "1");
  } catch {
    /* private browsing */
  }
}

export default function DataUpgradeNudge({
  variant,
  titleKey,
  descKey,
  titleReplacements,
  dismissKey,
  dismissMode = "session",
  className = "",
}: DataUpgradeNudgeProps) {
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(isDismissedInStorage(dismissKey, dismissMode));
  }, [dismissKey, dismissMode]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    persistDismiss(dismissKey, dismissMode);
  }, [dismissKey, dismissMode]);

  if (dismissed && dismissMode !== "none") return null;

  let title = t(titleKey) || titleKey;
  if (titleReplacements) {
    for (const [k, v] of Object.entries(titleReplacements)) {
      title = title.replace(`{${k}}`, v);
    }
  }
  const desc = t(descKey) || descKey;
  const styles = VARIANT_STYLES[variant];

  return (
    <div className={`rounded-xl p-3 flex items-start gap-3 ${styles.banner} ${className}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${styles.icon}`}>
        {ICON_SVG}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-900 dark:text-white leading-snug">{title}</p>
        <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5 leading-relaxed">{desc}</p>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <Link
            href="/import?method=snaptrade_api"
            className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors min-h-[32px]"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.813a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.343 8.07" />
            </svg>
            {t("nudgeCtaConnectBroker")}
          </Link>
          <Link
            href="/import?method=broker_csv"
            className="inline-flex items-center gap-1 text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-700/50 hover:bg-gray-200 dark:hover:bg-slate-700 text-[11px] font-medium px-3 py-1.5 rounded-lg transition-colors border border-gray-200 dark:border-slate-600 min-h-[32px]"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9.75m0 0l2.25 2.25M9.75 15l2.25-2.25M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            {t("nudgeCtaImportCsv")}
          </Link>
          <Link
            href="/import/compare"
            className="text-[11px] text-gray-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 underline underline-offset-2 transition-colors"
          >
            {t("nudgeCtaLearnMore")}
          </Link>
        </div>
      </div>
      {dismissMode !== "none" && (
        <button
          onClick={dismiss}
          className="text-gray-400 dark:text-slate-500/60 hover:text-gray-600 dark:hover:text-slate-300 transition-colors shrink-0 mt-0.5"
          aria-label={t("nudgeCtaDismiss")}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
