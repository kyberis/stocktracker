"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useStealthMode } from "@/lib/stealth-context";
import { useAuth } from "@/lib/auth-context";
import { useFeatureFlags } from "@/lib/feature-flag-context";
import { usePortfolioCommand } from "@/contexts/portfolio-command-context";
import TierFeatureBadge from "./TierFeatureBadge";
import NotificationBell from "./NotificationBell";
import GlobalPortfolioSelector from "./GlobalPortfolioSelector";
import { APP_NAV_SIDEBAR_ICON, getDesktopNavItems, type AppNavSidebarIconId } from "@/lib/app-nav";

const ACCOUNT_LINKS = [
  { href: "/profile", labelKey: "profile" as const, icon: "settings" },
  { href: "/admin", labelKey: "admin" as const, icon: "admin", adminOnly: true },
  { href: "/developer", labelKey: "developer" as const, icon: "developer", adminOnly: true },
];

const ICONS: Record<string, React.ReactNode> = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  ),
  portfolio: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  import: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  ),
  tools: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-5.1m0 0L12 3.75m-5.68 6.32l-1.97 5.81a.75.75 0 00.95.95l5.81-1.97m0 0l6.32-5.68M18 14.25l1.72-1.72a2.25 2.25 0 000-3.18l-1.72-1.72" />
    </svg>
  ),
  office: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
    </svg>
  ),
  explore: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  ),
  analisis: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
    </svg>
  ),
  crypto: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M9.5 9h3a2 2 0 010 4h-3m0-4v4m0 0h3.5a2 2 0 010 4H9.5m0-4v4m2-11v1m0 10v1" />
    </svg>
  ),
  screener: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
      <circle cx="11" cy="11" r="8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.3-4.3" />
    </svg>
  ),
  newspaper: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
    </svg>
  ),
  indicators: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  network: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  admin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
  ),
  developer: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
};

export default function SidebarNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  const { stealthMode } = useStealthMode();
  const { user, logout } = useAuth();
  const flags = useFeatureFlags();
  const { openSettings } = usePortfolioCommand();

  /** Full desktop nav list — studio sidebar is vertical, so no overflow strip / More menu. */
  const visibleNavLinks = getDesktopNavItems(flags);

  const initials = user?.displayName
    ? user.displayName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() ?? "?";

  return (
    <aside
      className="glass-overlay hidden sm:flex h-screen w-[220px] flex-shrink-0 flex-col border-r border-[color:var(--border)] sticky top-0 overflow-y-auto"
      data-tour="nav"
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-4">
        <svg className="w-7 h-7 flex-shrink-0" viewBox="0 0 32 32" aria-hidden="true">
          <rect width="32" height="32" rx="7" fill="#0f172a"/>
          <g transform="translate(16,16) rotate(45)">
            <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="#10b981"/>
            <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="#059669" transform="rotate(90)"/>
            <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="#047857" transform="rotate(180)"/>
            <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="#34d399" transform="rotate(270)"/>
          </g>
        </svg>
        <span className="text-base font-extrabold tracking-tight text-[color:var(--foreground)]">{t("appTitle")}</span>
      </div>

      {/* Portfolio selector */}
      <div className="px-3 mt-1 mb-2">
        <GlobalPortfolioSelector />
      </div>

      {/* Main nav */}
      <nav className="px-3 mt-2" aria-label={t("mainNavigation")}>
        <h2 className="sr-only">Main</h2>
        <div className="mb-1 px-2 text-[10px] font-bold uppercase tracking-widest text-[color:var(--muted)]" aria-hidden="true">
          Main
        </div>
        {visibleNavLinks.map((link) => {
          const active = link.matches(pathname);
          const iconId = APP_NAV_SIDEBAR_ICON[link.href] as AppNavSidebarIconId | undefined;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`mb-0.5 flex min-h-11 items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                active
                  ? "border-emerald-500/30 bg-emerald-500/12 text-[color:var(--foreground)]"
                  : "border-transparent text-[color:var(--muted)] hover:border-[color:var(--border)] hover:text-[color:var(--foreground)] hover:bg-white/[0.04]"
              }`}
            >
              <span className={active ? "text-emerald-400" : "text-[color:var(--muted)]"} aria-hidden="true">
                {iconId ? ICONS[iconId] : null}
              </span>
              {t(link.labelKey)}
              {link.tierBadge ? <TierFeatureBadge requiredPlan={link.tierBadge} size="xs" className="ml-auto" /> : null}
            </Link>
          );
        })}
      </nav>

      {/* Account */}
      <nav className="px-3 mt-4" aria-label="Account navigation">
        <h2 className="sr-only">Account</h2>
        <div className="mb-1 px-2 text-[10px] font-bold uppercase tracking-widest text-[color:var(--muted)]" aria-hidden="true">
          Account
        </div>
        <button
          type="button"
          onClick={openSettings}
          className="mb-0.5 flex min-h-11 w-full items-center gap-2 rounded-2xl border border-transparent px-3 py-2 text-left text-sm font-medium text-[color:var(--muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 hover:border-[color:var(--border)] hover:bg-white/[0.04] hover:text-[color:var(--foreground)]"
        >
          <span className="text-[color:var(--muted)]" aria-hidden="true">
            {ICONS.settings}
          </span>
          {t("settings")}
        </button>
        {ACCOUNT_LINKS
          .filter((link) => !("adminOnly" in link && link.adminOnly) || user?.role === "admin")
          .map((link) => {
            const active = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`mb-0.5 flex min-h-11 items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  active
                    ? "border-emerald-500/30 bg-emerald-500/12 text-[color:var(--foreground)]"
                    : "border-transparent text-[color:var(--muted)] hover:border-[color:var(--border)] hover:text-[color:var(--foreground)] hover:bg-white/[0.04]"
                }`}
              >
                <span className={active ? "text-emerald-400" : "text-[color:var(--muted)]"} aria-hidden="true">
                  {ICONS[link.icon]}
                </span>
                {t(link.labelKey)}
              </Link>
            );
          })}
      </nav>

      {/* User */}
      <div className="mt-auto border-t border-[color:var(--border)] px-3 py-3">
        <div className="flex items-center gap-2 px-1">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-xs font-bold text-white shadow-lg shadow-cyan-500/10">
            {stealthMode ? "••" : initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-[color:var(--foreground)]">
              {stealthMode ? "••••" : (user?.displayName || user?.email || "User")}
            </div>
            <div className="truncate text-xs text-[color:var(--muted)]">
              {user?.plan === "pro" ? "Trefolio (Pro)" : "Folio (Free)"}
            </div>
          </div>
          <NotificationBell />
          <button
            onClick={logout}
            title={t("signOut")}
            aria-label={t("signOut")}
            className="min-h-10 min-w-10 rounded-2xl border border-transparent p-1.5 text-[color:var(--muted)] transition-colors hover:border-[color:var(--border)] hover:bg-white/[0.04] hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h5a2 2 0 012 2v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
