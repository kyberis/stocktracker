"use client";

import { useCallback, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReadonlyURLSearchParams } from "next/navigation";

export function buildPathWithTab<T extends string>(
  pathname: string,
  searchParams: URLSearchParams | ReadonlyURLSearchParams,
  tab: T,
  defaultTab: T,
): string {
  const next = new URLSearchParams(searchParams.toString());
  if (tab === defaultTab) {
    next.delete("tab");
  } else {
    next.set("tab", tab);
  }
  const q = next.toString();
  return q ? `${pathname}?${q}` : pathname;
}

/**
 * Generic URL-synced tab state, mirroring the ?section=/?tab= convention used
 * by ProfilePage and the dashboard (src/lib/use-dashboard-tab-url.ts). The
 * default tab is always omitted from the URL.
 */
export function useTabUrl<T extends string>(values: readonly T[], defaultTab: T, clamp?: (tab: T) => T) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const parse = useCallback(
    (raw: string | null): T => {
      const parsed = raw && (values as readonly string[]).includes(raw) ? (raw as T) : defaultTab;
      return clamp ? clamp(parsed) : parsed;
    },
    [values, defaultTab, clamp],
  );

  const activeTab = useMemo(() => parse(searchParams.get("tab")), [searchParams, parse]);

  useEffect(() => {
    const raw = searchParams.get("tab");
    const effective = raw && (values as readonly string[]).includes(raw) ? (raw as T) : defaultTab;
    const clamped = clamp ? clamp(effective) : effective;
    if (effective !== clamped) {
      router.replace(buildPathWithTab(pathname, searchParams, clamped, defaultTab), { scroll: false });
    }
  }, [values, defaultTab, clamp, pathname, router, searchParams]);

  const navigateToTab = useCallback(
    (tab: T) => {
      router.replace(buildPathWithTab(pathname, searchParams, tab, defaultTab), { scroll: false });
    },
    [pathname, router, searchParams, defaultTab],
  );

  return { activeTab, navigateToTab };
}
