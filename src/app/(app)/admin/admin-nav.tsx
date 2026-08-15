"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { slug: string; label: string };

const TAB_GROUPS: { category: string; tabs: Tab[] }[] = [
  {
    category: "Users",
    tabs: [
      { slug: "users", label: "Users" },
      { slug: "waitlist", label: "Waitlist" },
    ],
  },
  {
    category: "Messaging",
    tabs: [
      { slug: "notifications", label: "Notifications" },
      { slug: "price-alerts", label: "Price Alerts" },
      { slug: "email-templates", label: "Email Templates" },
      { slug: "email-flows", label: "Email Flows" },
      { slug: "unsubscribes", label: "Unsubscribes" },
      { slug: "x-posts", label: "X Posts" },
      { slug: "market-digests", label: "Market Digests" },
    ],
  },
  {
    category: "Support",
    tabs: [
      { slug: "feedback", label: "Feedback" },
      { slug: "anomalies", label: "Anomalies" },
      { slug: "satisfaction", label: "Surveys" },
      { slug: "support-chat", label: "Support Chat" },
      { slug: "chats", label: "Private Chats" },
      { slug: "refund-requests", label: "Refunds" },
      { slug: "integration-requests", label: "Broker Requests" },
    ],
  },
  {
    category: "System",
    tabs: [
      { slug: "settings", label: "Settings" },
      { slug: "feature-flags", label: "Feature Flags" },
      { slug: "experiments", label: "Experiments" },
      { slug: "analytics", label: "Analytics" },
      { slug: "acquisition", label: "Acquisition" },
      { slug: "mcp-analytics", label: "MCP Analytics" },
      { slug: "ai-logs", label: "AI Logs" },
      { slug: "ai-compare", label: "AI Compare" },
      { slug: "screening-costs", label: "Screening Costs" },
      { slug: "screening-analyze", label: "Screening Analyze" },
      { slug: "snaptrade-logs", label: "SnapTrade Logs" },
      { slug: "docs", label: "Docs" },
    ],
  },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin sections" className="mb-6 space-y-3">
      {TAB_GROUPS.map(({ category, tabs }) => (
        <div key={category} className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 w-[72px] shrink-0">
            {category}
          </span>
          <div className="flex flex-wrap gap-1.5" role="tablist">
            {tabs.map(({ slug, label }) => {
              const href = `/admin/${slug}`;
              const isActive =
                pathname === href || pathname.startsWith(`${href}/`);

              return (
                <Link
                  key={slug}
                  href={href}
                  role="tab"
                  aria-selected={isActive}
                  className={`px-3 py-1 text-[13px] font-medium rounded-md transition-colors ${
                    isActive
                      ? "bg-indigo-600 text-white dark:bg-indigo-500"
                      : "text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
