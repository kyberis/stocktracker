"use client";

import React, { lazy, Suspense, useState, useRef } from "react";
import { type Tab, TabSkeleton } from "./shared";

const UsersTab = lazy(() => import("./tabs/UsersTab"));
const SettingsTab = lazy(() => import("./tabs/SettingsTab"));
const AnalyticsTab = lazy(() => import("./tabs/AnalyticsTab"));
const FeedbackTab = lazy(() => import("./tabs/FeedbackTab"));
const SupportChatTab = lazy(() => import("./tabs/SupportChatTab"));
const WaitlistTab = lazy(() => import("./tabs/WaitlistTab"));
const DocsTab = lazy(() => import("./tabs/DocsTab"));
const NotificationsTab = lazy(() => import("./tabs/NotificationsTab"));
const SnapTradeLogsTab = lazy(() => import("./tabs/SnapTradeLogsTab"));
const XPostsTab = lazy(() => import("./tabs/XPostsTab"));

const TAB_COMPONENTS: Record<Tab, React.LazyExoticComponent<React.ComponentType>> = {
  users: UsersTab,
  settings: SettingsTab,
  analytics: AnalyticsTab,
  feedback: FeedbackTab,
  "support-chat": SupportChatTab,
  waitlist: WaitlistTab,
  docs: DocsTab,
  notifications: NotificationsTab,
  "snaptrade-logs": SnapTradeLogsTab,
  "x-posts": XPostsTab,
};

const TAB_LABELS: Record<Tab, string> = {
  users: "Users",
  settings: "Settings",
  analytics: "Analytics",
  feedback: "Feedback",
  "support-chat": "Support Chat",
  waitlist: "Waitlist",
  docs: "Docs",
  notifications: "Notifications",
  "snaptrade-logs": "SnapTrade Logs",
  "x-posts": "X Posts",
};

const ALL_TABS: Tab[] = [
  "users", "settings", "analytics", "feedback", "support-chat",
  "waitlist", "docs", "notifications", "snaptrade-logs", "x-posts",
];

function AdminContent() {
  const [tab, setTab] = useState<Tab>("users");
  const visitedRef = useRef<Set<Tab>>(new Set<Tab>(["users"]));

  const handleTabChange = (t: Tab) => {
    visitedRef.current.add(t);
    setTab(t);
  };

  return (
    <main className="px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Admin</h1>

        {/* Tab bar */}
        <div role="tablist" aria-label="Admin sections" className="flex gap-1 mb-6 border-b border-gray-200 dark:border-slate-700 overflow-x-auto">
          {ALL_TABS.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              aria-controls={`admin-tabpanel-${t}`}
              onClick={() => handleTabChange(t)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                tab === t
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                  : "border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Tab panels — mounted once visited, hidden when inactive */}
        {ALL_TABS.map((t) => {
          if (!visitedRef.current.has(t)) return null;
          const LazyComponent = TAB_COMPONENTS[t];
          return (
            <div
              key={t}
              role="tabpanel"
              id={`admin-tabpanel-${t}`}
              hidden={tab !== t}
            >
              <Suspense fallback={<TabSkeleton />}>
                <LazyComponent />
              </Suspense>
            </div>
          );
        })}
      </div>
    </main>
  );
}

export default function AdminPage() {
  return <AdminContent />;
}
