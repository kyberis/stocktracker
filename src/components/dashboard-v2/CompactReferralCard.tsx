"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";

const DISMISS_KEY = "v2-referral-dismissed";

export default function CompactReferralCard({ onShare }: { onShare: () => void }) {
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (dismissed) return null;

  return (
    <button
      onClick={onShare}
      className="w-full card flex items-center gap-3 p-3 bg-gradient-to-r from-emerald-500/[0.06] to-blue-500/[0.04] border-emerald-500/20 hover:border-emerald-500/40 transition-colors cursor-pointer text-left"
    >
      <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-base shrink-0">
        🎁
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-emerald-500 dark:text-emerald-400">{t("v2Referral")}</p>
        <p className="text-[10px] text-gray-500 dark:text-slate-500 mt-0.5">{t("v2ReferralSub")}</p>
      </div>
      <svg className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
    </button>
  );
}
