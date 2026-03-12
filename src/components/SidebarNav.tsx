"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useStealthMode } from "@/lib/stealth-context";
import { useAuth } from "@/lib/auth-context";
import TierFeatureBadge from "./TierFeatureBadge";

const NAV_LINKS = [
  { href: "/", labelKey: "portfolio" as const, icon: "home" },
  { href: "/import", labelKey: "importNav" as const, icon: "import" },
  { href: "/tools", labelKey: "toolsNav" as const, icon: "tools" },
  { href: "/crypto", labelKey: "cryptoNav" as const, icon: "crypto", tierBadge: "pro" as const },
  { href: "/economic-indicators", labelKey: "indicatorsNav" as const, icon: "indicators", tierBadge: "pro" as const },
];

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
  indicators: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
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

  const initials = user?.displayName
    ? user.displayName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() ?? "?";

  return (
    <aside className="hidden sm:flex w-[200px] flex-shrink-0 flex-col border-r border-white/5 bg-[#09090b] sticky top-0 h-screen overflow-y-auto" data-tour="nav">
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
        <span className="text-base font-extrabold text-white tracking-tight">{t("appTitle")}</span>
      </div>

      {/* Main nav */}
      <nav className="px-3 mt-2" aria-label="Main navigation">
        <h2 className="sr-only">Main</h2>
        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 px-2 mb-1" aria-hidden="true">
          Main
        </div>
        {NAV_LINKS.map((link) => {
          const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm font-medium transition-colors mb-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                active
                  ? "text-white bg-emerald-500/10"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]"
              }`}
            >
              <span className={active ? "text-emerald-500" : "text-zinc-600"} aria-hidden="true">
                {ICONS[link.icon]}
              </span>
              {t(link.labelKey)}
              {"tierBadge" in link && link.tierBadge && (
                <TierFeatureBadge requiredPlan={link.tierBadge} size="xs" className="ml-auto" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Account */}
      <nav className="px-3 mt-4" aria-label="Account navigation">
        <h2 className="sr-only">Account</h2>
        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 px-2 mb-1" aria-hidden="true">
          Account
        </div>
        {ACCOUNT_LINKS
          .filter((link) => !("adminOnly" in link && link.adminOnly) || user?.role === "admin")
          .map((link) => {
            const active = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm font-medium transition-colors mb-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  active
                    ? "text-white bg-emerald-500/10"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]"
                }`}
              >
                <span className={active ? "text-emerald-500" : "text-zinc-600"} aria-hidden="true">
                  {ICONS[link.icon]}
                </span>
                {t(link.labelKey)}
              </Link>
            );
          })}
      </nav>

      {/* User */}
      <div className="mt-auto border-t border-white/5 px-3 py-3">
        <div className="flex items-center gap-2 px-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-indigo-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {stealthMode ? "••" : initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-white truncate">
              {stealthMode ? "••••" : (user?.displayName || user?.email || "User")}
            </div>
            <div className="text-xs text-zinc-600 truncate">
              {user?.plan === "pro" ? "Trefolio (Pro)" : user?.plan === "starter" ? "Bifolio (Starter)" : "Folio (Free)"}
            </div>
          </div>
          <button
            onClick={logout}
            title={t("signOut")}
            aria-label={t("signOut")}
            className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-white/[0.03] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
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
