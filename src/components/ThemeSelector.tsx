"use client";

import { useEffect, useState } from "react";
import type { LayoutTheme, SubscriptionPlan } from "@/lib/types";
import { canAccessTheme, getThemeUpgradeTarget, planDisplayName } from "@/lib/subscription";
import { useSettings } from "@/lib/settings-context";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";

interface ThemeOption {
  id: LayoutTheme;
  nameKey: string;
  descKey: string;
  previewBg: string;
  previewFg: string;
  previewAccent: string;
}

const THEMES: ThemeOption[] = [
  {
    id: "default",
    nameKey: "themeDefault",
    descKey: "themeDefaultDesc",
    previewBg: "#0f172a",
    previewFg: "#f1f5f9",
    previewAccent: "#10b981",
  },
  {
    id: "canvas",
    nameKey: "themeCanvas",
    descKey: "themeCanvasDesc",
    previewBg: "#f8f9fb",
    previewFg: "#1e293b",
    previewAccent: "#16a34a",
  },
  {
    id: "terminal",
    nameKey: "themeTerminal",
    descKey: "themeTerminalDesc",
    previewBg: "#0a0a0a",
    previewFg: "#a1a1aa",
    previewAccent: "#22c55e",
  },
  {
    id: "studio",
    nameKey: "themeStudio",
    descKey: "themeStudioDesc",
    previewBg: "#18181b",
    previewFg: "#d4d4d8",
    previewAccent: "#22c55e",
  },
];

function ThemeTierBadge({ theme, plan }: { theme: LayoutTheme; plan: SubscriptionPlan }) {
  const { t } = useI18n();
  if (theme === "default") return <span className="text-[10px] font-semibold text-gray-400 dark:text-slate-500">{t("themeAllTiers")}</span>;
  const target = getThemeUpgradeTarget(theme);
  if (!target) return null;
  const accessible = canAccessTheme(theme, plan);
  if (accessible) return <span className="text-[10px] font-semibold text-emerald-500">{t("themeUnlocked")}</span>;
  return <span className="text-[10px] font-semibold text-amber-500">{planDisplayName(target)}+</span>;
}

export default function ThemeSelector() {
  const { dashboardTheme, setDashboardTheme } = useSettings();
  const { user } = useAuth();
  const { t } = useI18n();
  const plan = (user?.plan ?? "free") as SubscriptionPlan;
  const [selected, setSelected] = useState<LayoutTheme>(dashboardTheme);
  const [isMobile, setIsMobile] = useState(false);
  const hasChanges = selected !== dashboardTheme;

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function handleSelect(theme: LayoutTheme) {
    if (!canAccessTheme(theme, plan)) return;
    setSelected(theme);
  }

  function handleSave() {
    if (!hasChanges) return;
    setDashboardTheme(selected);
  }

  const visibleThemes = isMobile ? THEMES.filter((th) => th.id !== "studio") : THEMES;

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        {visibleThemes.map((theme) => {
          const active = selected === theme.id;
          const locked = !canAccessTheme(theme.id, plan);

          return (
            <button
              key={theme.id}
              onClick={() => handleSelect(theme.id)}
              disabled={locked}
              className={`relative rounded-xl border-2 p-3 text-left transition-all ${
                active
                  ? "border-emerald-500 ring-2 ring-emerald-500/20"
                  : locked
                    ? "border-gray-200 dark:border-slate-700 cursor-not-allowed"
                    : "border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 cursor-pointer"
              }`}
              aria-pressed={active}
              aria-label={`${t(theme.nameKey as "themeDefault")} theme${locked ? " (locked)" : ""}`}
            >
              {/* Preview swatch */}
              <div
                className={`w-full h-14 rounded-lg mb-2 flex items-end px-2 pb-1.5 gap-1 ${locked ? "opacity-50" : ""}`}
                style={{ background: theme.previewBg }}
              >
                <div className="w-3 h-6 rounded-sm" style={{ background: theme.previewAccent, opacity: 0.8 }} />
                <div className="w-5 h-4 rounded-sm" style={{ background: theme.previewAccent, opacity: 0.5 }} />
                <div className="w-4 h-8 rounded-sm" style={{ background: theme.previewAccent, opacity: 0.65 }} />
                <div className="w-3 h-3 rounded-sm" style={{ background: theme.previewAccent, opacity: 0.35 }} />
                <div className="ml-auto text-[8px] font-bold" style={{ color: theme.previewFg, opacity: 0.5 }}>€47,832</div>
              </div>

              {/* Name + badge */}
              <div className="flex items-center justify-between gap-1">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {t(theme.nameKey as "themeDefault")}
                </span>
                <ThemeTierBadge theme={theme.id} plan={plan} />
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 leading-snug">
                {t(theme.descKey as "themeDefaultDesc")}
              </p>

              {/* Lock overlay with upgrade CTA */}
              {locked && (
                <div className="absolute inset-0 rounded-xl bg-white/60 dark:bg-slate-900/70 flex flex-col items-center justify-center gap-1.5">
                  <svg className="w-5 h-5 text-gray-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-800 px-3 py-1 rounded-full shadow-sm border border-amber-200 dark:border-amber-500/30">
                    {t("themeUpgrade")} {planDisplayName(getThemeUpgradeTarget(theme.id) ?? "starter")}
                  </span>
                </div>
              )}

              {/* Active checkmark */}
              {active && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {hasChanges && (
        <button
          onClick={handleSave}
          className="mt-4 w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors"
        >
          {t("save")}
        </button>
      )}
    </div>
  );
}
