"use client";

import { useCallback, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  buildPathWithTab,
  clampDashboardTab,
  parseDashboardTabParam,
  type ClampDashboardTabContext,
  type DashboardTab,
} from "./dashboard-tab-url";

export type { DashboardTab };

export function useDashboardTabUrl(ctx: ClampDashboardTabContext) {
  const { holdingsCount, tierGate, userPlan } = ctx;
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeTab = useMemo(() => {
    const parsed = parseDashboardTabParam(searchParams.get("tab"));
    return clampDashboardTab(parsed ?? "portfolio", { holdingsCount, tierGate, userPlan });
  }, [searchParams, holdingsCount, tierGate, userPlan]);

  useEffect(() => {
    const parsed = parseDashboardTabParam(searchParams.get("tab"));
    const effective = parsed ?? "portfolio";
    const clamped = clampDashboardTab(effective, { holdingsCount, tierGate, userPlan });
    if (effective !== clamped) {
      router.replace(buildPathWithTab(pathname, searchParams, clamped), { scroll: false });
    }
  }, [holdingsCount, tierGate, userPlan, pathname, router, searchParams]);

  const navigateToTab = useCallback(
    (tab: DashboardTab) => {
      router.replace(buildPathWithTab(pathname, searchParams, tab), { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return { activeTab, navigateToTab };
}
