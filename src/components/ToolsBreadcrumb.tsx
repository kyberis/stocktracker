"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

interface ToolsBreadcrumbProps {
  toolLabel: string;
  toolIcon?: string;
  toolGradient?: string;
}

export default function ToolsBreadcrumb({ toolLabel, toolIcon, toolGradient }: ToolsBreadcrumbProps) {
  const { t } = useI18n();

  return (
    <div
      data-testid="tools-breadcrumb"
      className="flex items-center gap-2 sm:gap-3 mb-4 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl px-3 sm:px-4 py-2.5 overflow-hidden"
    >
      <nav className="flex items-center gap-1.5 min-w-0 flex-1" aria-label="Breadcrumb">
        <Link
          href="/"
          className="flex items-center gap-1 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white rounded-md px-1.5 py-0.5 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
          <span className="hidden sm:inline">{t("breadcrumbHome")}</span>
        </Link>

        <svg className="w-3 h-3 text-gray-300 dark:text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>

        <Link
          href="/tools"
          className="text-sm text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white rounded-md px-1.5 py-0.5 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors shrink-0"
        >
          {t("toolsNav")}
        </Link>

        <svg className="w-3 h-3 text-gray-300 dark:text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>

        <span className="flex items-center gap-1.5 min-w-0 text-sm font-semibold text-gray-900 dark:text-white">
          {toolIcon && toolGradient && (
            <span
              data-testid="tools-breadcrumb-icon"
              className={`w-5 h-5 rounded-md bg-gradient-to-br ${toolGradient} flex items-center justify-center shrink-0`}
            >
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d={toolIcon} />
              </svg>
            </span>
          )}
          <span data-testid="tools-breadcrumb-label" className="truncate">
            {toolLabel}
          </span>
        </span>
      </nav>

      <Link
        href="/tools"
        data-testid="tools-breadcrumb-back"
        aria-label={t("backToMenu")}
        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white transition-colors shrink-0"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        <span className="hidden sm:inline">{t("backToMenu")}</span>
      </Link>
    </div>
  );
}
