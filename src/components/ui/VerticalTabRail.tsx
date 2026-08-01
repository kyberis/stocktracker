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
  /**
   * "light" — high-contrast slate on a cream/white surface (public analisis).
   * Avoids dark-mode token text (near-white) washing out on #faf9f7.
   * "auto" — follows app light/dark theme tokens.
   */
  tone?: "auto" | "light";
}

/**
 * Horizontal segmented tab control (scrollable on narrow viewports).
 * Kept export name for call-site stability; layout is no longer a left rail.
 */
export default function VerticalTabRail<T extends string>({
  tabs,
  activeId,
  onChange,
  className = "",
  tone = "auto",
}: VerticalTabRailProps<T>) {
  const track =
    tone === "light"
      ? "border border-slate-200 bg-white shadow-sm"
      : "border border-[color:var(--border)] bg-[color:var(--surface-soft)]";

  const inactive =
    tone === "light"
      ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      : "text-[color:var(--muted)] hover:bg-[color:var(--surface-highlight)] hover:text-[color:var(--foreground)]";

  return (
    <div
      role="tablist"
      className={`flex w-full gap-1 overflow-x-auto rounded-xl p-1 ${track} ${className}`}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`flex min-h-10 min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive ? "bg-emerald-500 text-white shadow-sm" : inactive
            }`}
          >
            {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden />}
            <span className="truncate">{tab.label}</span>
            {tab.locked && <Lock className="h-3 w-3 shrink-0 opacity-70" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}
