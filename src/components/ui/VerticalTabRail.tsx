"use client";

import type { ComponentType } from "react";
import { Lock } from "lucide-react";

export interface TabRailItem<T extends string> {
  id: T;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  locked?: boolean;
}

interface VerticalTabRailProps<T extends string> {
  tabs: TabRailItem<T>[];
  activeId: T;
  onChange: (id: T) => void;
  className?: string;
}

/**
 * Left rail on md+ viewports, horizontal scrollable pills below md.
 * Generic, reusable outside the stock detail page.
 */
export default function VerticalTabRail<T extends string>({
  tabs,
  activeId,
  onChange,
  className = "",
}: VerticalTabRailProps<T>) {
  return (
    <div
      role="tablist"
      className={`flex md:flex-col gap-1 overflow-x-auto md:overflow-visible -mx-4 px-4 md:mx-0 md:px-0 pb-2 md:pb-0 ${className}`}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`shrink-0 flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left ${
              isActive
                ? "bg-emerald-500 text-white"
                : "text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800"
            }`}
          >
            {Icon && <Icon className="w-4 h-4 shrink-0" />}
            <span>{tab.label}</span>
            {tab.locked && <Lock className="w-3 h-3 shrink-0 opacity-70" />}
          </button>
        );
      })}
    </div>
  );
}
