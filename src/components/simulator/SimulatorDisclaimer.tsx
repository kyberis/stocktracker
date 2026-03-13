"use client";

import { useI18n } from "@/lib/i18n";

export default function SimulatorDisclaimer() {
  const { t } = useI18n();

  return (
    <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 text-xs text-amber-800 dark:text-amber-400/90 leading-relaxed">
      <svg
        className="w-4 h-4 flex-shrink-0 mt-0.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
        />
      </svg>
      <span>{t("simulatorDisclaimer")}</span>
    </div>
  );
}
