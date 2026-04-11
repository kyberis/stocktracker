import type { TranslationKey } from "@/lib/i18n";

export type AppNavTierBadge = "pro";

export interface AppNavPrimaryItem {
  href: string;
  labelKey: TranslationKey;
  tierBadge?: AppNavTierBadge;
  featureFlag?: string;
  matches: (pathname: string) => boolean;
  /** AppNav (top) + SidebarNav (studio) */
  desktop: boolean;
  /** AppNav horizontal strip — false means desktop “More” menu (sidebar lists all). */
  desktopTopStrip: boolean;
  /** Mobile web bottom bar — direct tabs (not More) */
  mobileWebTab: boolean;
  /** Mobile web — overflow sheet */
  mobileWebMore: boolean;
}

function exactOrChild(base: string) {
  return (pathname: string) => pathname === base || pathname.startsWith(`${base}/`);
}

export function matchHome(pathname: string): boolean {
  return pathname === "/";
}

export function matchTools(pathname: string): boolean {
  return pathname === "/tools" || pathname.startsWith("/tools/");
}

/**
 * Single ordering for the whole app: Home → Portfolio page → Import → Tools →
 * Daily digests → Crypto → Economic Indicators → Network.
 */
export const APP_NAV_PRIMARY: AppNavPrimaryItem[] = [
  {
    href: "/",
    labelKey: "homeNav",
    matches: matchHome,
    desktop: true,
    desktopTopStrip: true,
    mobileWebTab: true,
    mobileWebMore: false,
  },
  {
    href: "/portfolio",
    labelKey: "portfolioPerformanceNav",
    matches: exactOrChild("/portfolio"),
    desktop: true,
    desktopTopStrip: true,
    mobileWebTab: true,
    mobileWebMore: false,
  },
  {
    href: "/import",
    labelKey: "importNav",
    matches: exactOrChild("/import"),
    desktop: true,
    desktopTopStrip: true,
    mobileWebTab: true,
    mobileWebMore: false,
  },
  {
    href: "/tools",
    labelKey: "toolsNav",
    matches: matchTools,
    desktop: true,
    desktopTopStrip: true,
    mobileWebTab: true,
    mobileWebMore: false,
  },
  {
    href: "/daily-digests",
    labelKey: "dailyDigestsNav",
    matches: exactOrChild("/daily-digests"),
    desktop: true,
    desktopTopStrip: true,
    mobileWebTab: true,
    mobileWebMore: false,
  },
  {
    href: "/crypto",
    labelKey: "cryptoNav",
    tierBadge: "pro",
    matches: exactOrChild("/crypto"),
    desktop: true,
    desktopTopStrip: false,
    mobileWebTab: false,
    mobileWebMore: true,
  },
  {
    href: "/economic-indicators",
    labelKey: "indicatorsNav",
    tierBadge: "pro",
    matches: exactOrChild("/economic-indicators"),
    desktop: true,
    desktopTopStrip: false,
    mobileWebTab: false,
    mobileWebMore: true,
  },
  {
    href: "/network",
    labelKey: "networkNav",
    featureFlag: "social_network_enabled",
    matches: exactOrChild("/network"),
    desktop: true,
    desktopTopStrip: false,
    mobileWebTab: false,
    mobileWebMore: true,
  },
];

export interface MobileMoreExtraItem {
  href: string;
  labelKey: TranslationKey;
  matches: (pathname: string) => boolean;
}

export const MOBILE_MORE_EXTRA: MobileMoreExtraItem[] = [
  {
    href: "/profile",
    labelKey: "profile",
    matches: (pathname) => pathname === "/profile" || pathname.startsWith("/profile/"),
  },
];

export function filterNavByFlag<T extends { featureFlag?: string }>(items: T[], flags: Record<string, boolean>): T[] {
  return items.filter((item) => !item.featureFlag || flags[item.featureFlag]);
}

export function getDesktopNavItems(flags: Record<string, boolean>): AppNavPrimaryItem[] {
  return filterNavByFlag(APP_NAV_PRIMARY, flags).filter((i) => i.desktop);
}

/** AppNav top strip only (avoids horizontal overflow). */
export function getDesktopTopStripNavItems(flags: Record<string, boolean>): AppNavPrimaryItem[] {
  return getDesktopNavItems(flags).filter((i) => i.desktopTopStrip);
}

/** Insights, Crypto, Indicators, Network — desktop AppNav “More” menu. */
export function getDesktopOverflowNavItems(flags: Record<string, boolean>): AppNavPrimaryItem[] {
  return getDesktopNavItems(flags).filter((i) => !i.desktopTopStrip);
}

export function desktopOverflowNavActive(pathname: string, items: AppNavPrimaryItem[]): boolean {
  return items.some((item) => item.matches(pathname));
}

export function getMobileWebTabItems(flags: Record<string, boolean>): AppNavPrimaryItem[] {
  return filterNavByFlag(APP_NAV_PRIMARY, flags).filter((i) => i.mobileWebTab);
}

export function getMobileWebMoreItems(flags: Record<string, boolean>): AppNavPrimaryItem[] {
  return filterNavByFlag(APP_NAV_PRIMARY, flags).filter((i) => i.mobileWebMore);
}

/** Native app bottom bar: Home, Tools, Profile */
export const NATIVE_MOBILE_TABS: {
  href: string;
  labelKey: TranslationKey;
  match: (p: string) => boolean;
}[] = [
  { href: "/", labelKey: "homeNav", match: matchHome },
  { href: "/tools", labelKey: "toolsNav", match: matchTools },
  {
    href: "/profile",
    labelKey: "profile",
    match: (p) => p === "/profile" || p.startsWith("/profile/"),
  },
];

/** SVG path `d` for MobileTabBar icons keyed by href */
export const MOBILE_TAB_ICON_PATH: Record<string, string> = {
  "/": "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  "/portfolio":
    "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
  "/import":
    "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12",
  "/tools":
    "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  "/daily-digests":
    "M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z",
  more: "M4 6h16M4 12h16M4 18h16",
  "/profile":
    "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
};

/** Sidebar / studio: icon component id */
export type AppNavSidebarIconId =
  | "home"
  | "portfolio"
  | "import"
  | "tools"
  | "newspaper"
  | "crypto"
  | "indicators"
  | "network";

export const APP_NAV_SIDEBAR_ICON: Record<string, AppNavSidebarIconId> = {
  "/": "home",
  "/portfolio": "portfolio",
  "/import": "import",
  "/tools": "tools",
  "/daily-digests": "newspaper",
  "/crypto": "crypto",
  "/economic-indicators": "indicators",
  "/network": "network",
};
