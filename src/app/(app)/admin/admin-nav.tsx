"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { slug: "users", label: "Users" },
  { slug: "settings", label: "Settings" },
  { slug: "analytics", label: "Analytics" },
  { slug: "feedback", label: "Feedback" },
  { slug: "support-chat", label: "Support Chat" },
  { slug: "waitlist", label: "Waitlist" },
  { slug: "docs", label: "Docs" },
  { slug: "notifications", label: "Notifications" },
  { slug: "snaptrade-logs", label: "SnapTrade Logs" },
  { slug: "x-posts", label: "X Posts" },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      role="tablist"
      aria-label="Admin sections"
      className="flex gap-1 mb-6 border-b border-gray-200 dark:border-slate-700 overflow-x-auto"
    >
      {TABS.map(({ slug, label }) => {
        const href = `/admin/${slug}`;
        const isActive =
          pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={slug}
            href={href}
            role="tab"
            aria-selected={isActive}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              isActive
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                : "border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
