"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme-context";
import { useStealthMode } from "@/lib/stealth-context";
import { useTrack } from "@/lib/use-track";
import LanguageSwitcher from "./LanguageSwitcher";
import UserDropdown from "./UserDropdown";
import TierFeatureBadge from "./TierFeatureBadge";

interface AppNavProps {
  onWhatsNew?: () => void;
  hasNewRelease?: boolean;
}

const NAV_LINKS = [
  {
    href: "/",
    labelKey: "portfolio" as const,
    match: (p: string) => p === "/",
  },
  {
    href: "/import",
    labelKey: "importNav" as const,
    match: (p: string) => p === "/import",
  },
  {
    href: "/tools",
    labelKey: "toolsNav" as const,
    match: (p: string) => p === "/tools",
  },
  {
    href: "/crypto",
    labelKey: "cryptoNav" as const,
    match: (p: string) => p === "/crypto",
    tierBadge: "pro" as const,
  },
  {
    href: "/economic-indicators",
    labelKey: "indicatorsNav" as const,
    match: (p: string) => p === "/economic-indicators",
    tierBadge: "pro" as const,
  },
];

export default function AppNav({ onWhatsNew, hasNewRelease }: AppNavProps) {
  const pathname = usePathname();
  const { t } = useI18n();
  const { isDark, canToggleMode, toggleTheme } = useTheme();
  const { stealthMode, toggleStealth } = useStealthMode();
  const track = useTrack();

  function handleStealthToggle() {
    const next = !stealthMode;
    toggleStealth();
    track(next ? "stealth_mode_enabled" : "stealth_mode_disabled");
  }

  return (
    <>
    <header className="border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-nav-bg sticky top-7 z-40" data-tour="nav">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-1 sm:gap-6">
          <Link href="/" className="flex items-center gap-2 mr-2 sm:mr-0">
            <svg className="w-7 h-7 rounded-lg" viewBox="0 0 32 32" aria-hidden="true">
              <defs>
                <linearGradient id="nav-a" x1=".5" y1="0" x2=".5" y2="1"><stop offset="0%" stopColor="#6ee7b7"/><stop offset="100%" stopColor="#10b981"/></linearGradient>
                <linearGradient id="nav-b" x1="0" y1=".3" x2="1" y2=".7"><stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor="#059669"/></linearGradient>
                <linearGradient id="nav-c" x1=".5" y1="1" x2=".5" y2="0"><stop offset="0%" stopColor="#10b981"/><stop offset="100%" stopColor="#047857"/></linearGradient>
                <linearGradient id="nav-d" x1="1" y1=".3" x2="0" y2=".7"><stop offset="0%" stopColor="#a7f3d0"/><stop offset="100%" stopColor="#34d399"/></linearGradient>
              </defs>
              <rect width="32" height="32" rx="7" fill="#0f172a"/>
              <g transform="translate(16,16) rotate(45)">
                <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="url(#nav-a)"/>
                <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="url(#nav-b)" transform="rotate(90)"/>
                <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="url(#nav-c)" transform="rotate(180)"/>
                <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="url(#nav-d)" transform="rotate(270)"/>
                <circle cx="0" cy="0" r="1.2" fill="#0f172a" opacity=".35"/>
              </g>
            </svg>
            <span className="hidden sm:inline text-base font-bold text-gray-900 dark:text-white">{t("appTitle")}</span>
          </Link>

          <nav className="hidden sm:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const active = link.match(pathname);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {t(link.labelKey)}
                  {"tierBadge" in link && link.tierBadge && (
                    <TierFeatureBadge requiredPlan={link.tierBadge} size="xs" className="ml-1" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {onWhatsNew && (
            <button
              onClick={onWhatsNew}
              className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400 transition-colors"
              title={t("whatsNew")}
              aria-label={t("whatsNew")}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              {hasNewRelease && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 border-2 border-white dark:border-nav-bg" />
              )}
            </button>
          )}

          {/* Stealth mode toggle */}
          <button
            onClick={handleStealthToggle}
            aria-pressed={stealthMode}
            aria-label={stealthMode ? t("stealthModeDisable") : t("stealthModeEnable")}
            title={stealthMode ? t("stealthModeDisable") : t("stealthModeEnable")}
            className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors ${
              stealthMode
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-gray-500 dark:text-slate-400"
            }`}
          >
            {stealthMode ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>

          {canToggleMode && (
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400 transition-colors"
              title={isDark ? "Light mode" : "Dark mode"}
              aria-label={isDark ? "Light mode" : "Dark mode"}
            >
              {isDark ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          )}

          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>

          <UserDropdown />
        </div>
      </div>
    </header>
    {/* aria-live region for stealth mode announcements */}
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {stealthMode ? t("stealthModeOnAnnounce") : ""}
    </div>
    </>
  );
}
