"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useIsNative } from "@/lib/use-native";

const WEB_TABS = [
  {
    href: "/",
    labelKey: "portfolio" as const,
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    match: (p: string) => p === "/",
  },
  {
    href: "/portfolio",
    labelKey: "performanceNav" as const,
    icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
    match: (p: string) => p === "/portfolio",
  },
  {
    href: "/import",
    labelKey: "importNav" as const,
    icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12",
    match: (p: string) => p === "/import",
  },
  {
    href: "/tools",
    labelKey: "toolsNav" as const,
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    match: (p: string) => p === "/tools" || p.startsWith("/tools/"),
  },
  {
    href: "/crypto",
    labelKey: "cryptoNav" as const,
    icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    match: (p: string) => p === "/crypto",
  },
  {
    href: "/profile",
    labelKey: "profile" as const,
    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
    match: (p: string) => p === "/profile",
  },
];

const NATIVE_TABS = [
  {
    href: "/",
    labelKey: "portfolio" as const,
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    match: (p: string) => p === "/",
  },
  {
    href: "/tools",
    labelKey: "toolsNav" as const,
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    match: (p: string) => p === "/tools" || p.startsWith("/tools/"),
  },
  {
    href: "/profile",
    labelKey: "profile" as const,
    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
    match: (p: string) => p === "/profile",
  },
];

export default function MobileTabBar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const isNative = useIsNative();
  const tabs = isNative ? NATIVE_TABS : WEB_TABS;

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom)] ${isNative ? "" : "sm:hidden"}`}>
      <div className="flex items-stretch">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                active
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-gray-500 dark:text-slate-500"
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
              </svg>
              {t(tab.labelKey)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
