"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId } from "react";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme-context";
import { useStealthMode } from "@/lib/stealth-context";
import { useTrack } from "@/lib/use-track";
import { useFeatureFlags } from "@/lib/feature-flag-context";
import { useIsMobileViewport } from "@/lib/use-mobile-viewport";
import LanguageSwitcher from "./LanguageSwitcher";
import UserDropdown from "./UserDropdown";
import NotificationBell from "./NotificationBell";
import GlobalPortfolioSelector from "./GlobalPortfolioSelector";
import NavAssetSearch from "./NavAssetSearch";
import AppNavPrimaryPills from "./AppNavPrimaryPills";
import { getDesktopNavItems } from "@/lib/app-nav";

function NavLogoWordmark() {
  const { t } = useI18n();
  const gid = useId().replace(/:/g, "");
  const ga = `nav-a-${gid}`;
  const gb = `nav-b-${gid}`;
  const gc = `nav-c-${gid}`;
  const gd = `nav-d-${gid}`;
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2 mr-2 sm:mr-0">
      <svg className="w-7 h-7 rounded-lg" viewBox="0 0 32 32" aria-hidden="true">
        <defs>
          <linearGradient id={ga} x1=".5" y1="0" x2=".5" y2="1">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <linearGradient id={gb} x1="0" y1=".3" x2="1" y2=".7">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id={gc} x1=".5" y1="1" x2=".5" y2="0">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
          <linearGradient id={gd} x1="1" y1=".3" x2="0" y2=".7">
            <stop offset="0%" stopColor="#a7f3d0" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="7" fill="#0f172a" />
        <g transform="translate(16,16) rotate(45)">
          <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill={`url(#${ga})`} />
          <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill={`url(#${gb})`} transform="rotate(90)" />
          <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill={`url(#${gc})`} transform="rotate(180)" />
          <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill={`url(#${gd})`} transform="rotate(270)" />
          <circle cx="0" cy="0" r="1.2" fill="#0f172a" opacity=".35" />
        </g>
      </svg>
      <span className="hidden sm:inline text-base font-bold text-gray-900 dark:text-white">{t("appTitle")}</span>
    </Link>
  );
}

function HeaderActions({
  stealthMode,
  onStealthToggle,
  canToggleMode,
  isDark,
  toggleTheme,
}: {
  stealthMode: boolean;
  onStealthToggle: () => void;
  canToggleMode: boolean;
  isDark: boolean;
  toggleTheme: () => void;
}) {
  const { t } = useI18n();
  return (
    <>
      <NotificationBell />
      <button
        onClick={onStealthToggle}
        aria-pressed={stealthMode}
        aria-label={stealthMode ? t("stealthModeDisable") : t("stealthModeEnable")}
        title={stealthMode ? t("stealthModeDisable") : t("stealthModeEnable")}
        className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors ${
          stealthMode ? "text-emerald-600 dark:text-emerald-400" : "text-gray-500 dark:text-slate-400"
        }`}
      >
        {stealthMode ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
            />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
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
    </>
  );
}

export default function AppNav() {
  const pathname = usePathname();
  const isMobileViewport = useIsMobileViewport();
  const { t } = useI18n();
  const { isDark, canToggleMode, toggleTheme } = useTheme();
  const { stealthMode, toggleStealth } = useStealthMode();
  const track = useTrack();
  const flags = useFeatureFlags();

  const desktopNavItems = getDesktopNavItems(flags);
  /** Home / demo + desktop: skip global nav pills here (dashboard toolbar / mobile strip has shortcuts). Other routes: show pills on mobile too. */
  const showPrimaryPillsInHeader =
    isMobileViewport || (pathname !== "/" && pathname !== "/demo");
  /** Desktop lg+: portfolio switcher lives in DashboardToolbar on home/demo; keep header selector on other routes. */
  const showPortfolioSelectorInHeader = pathname !== "/" && pathname !== "/demo";

  function handleStealthToggle() {
    const next = !stealthMode;
    toggleStealth();
    track(next ? "stealth_mode_enabled" : "stealth_mode_disabled");
  }

  const actionsProps = {
    stealthMode,
    onStealthToggle: handleStealthToggle,
    canToggleMode,
    isDark,
    toggleTheme,
  };

  return (
    <>
      <header className="border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-nav-bg sticky top-7 z-40" data-tour="nav">
        <div className="max-w-7xl mx-auto min-w-0 px-3 py-1.5 sm:px-6 sm:py-2">
          {/* Desktop (lg+): command bar — three columns, items-start; pills single row + scroll */}
          <div className="hidden lg:grid lg:grid-cols-[minmax(0,auto)_minmax(0,1fr)_auto] lg:items-start lg:gap-x-6">
            <div className="flex min-w-0 items-center gap-3">
              <NavLogoWordmark />
              {showPortfolioSelectorInHeader && (
                <div className="min-w-0 shrink-0">
                  <GlobalPortfolioSelector />
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-col gap-1 px-0 sm:px-1">
              <NavAssetSearch variant="command" />
              {showPrimaryPillsInHeader ? (
                <AppNavPrimaryPills
                  items={desktopNavItems}
                  pathname={pathname}
                  navAriaLabel={t("primaryNavAriaLabel")}
                />
              ) : null}
            </div>

            <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-1.5">
              <HeaderActions {...actionsProps} />
            </div>
          </div>

          {/* Mobile / tablet: compact top row + full-width search + scroll pills */}
          <div className="lg:hidden flex flex-col gap-1.5">
            <div className="flex min-w-0 items-center gap-2">
              <NavLogoWordmark />
              {showPortfolioSelectorInHeader && (
                <div className="hidden sm:block min-w-0 shrink-0 max-w-[40%]">
                  <GlobalPortfolioSelector />
                </div>
              )}
              <div className="flex-1 min-w-0" aria-hidden />
              <div className="flex shrink-0 items-center gap-1">
                <HeaderActions {...actionsProps} />
              </div>
            </div>

            <NavAssetSearch variant="command" />

            {showPrimaryPillsInHeader ? (
              <AppNavPrimaryPills
                items={desktopNavItems}
                pathname={pathname}
                variant="scroll"
                navAriaLabel={t("primaryNavAriaLabel")}
              />
            ) : null}
          </div>
        </div>
      </header>
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {stealthMode ? t("stealthModeOnAnnounce") : ""}
      </div>
    </>
  );
}
