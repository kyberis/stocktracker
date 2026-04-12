"use client";

import { Suspense, useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { usePortfolioCommand } from "@/contexts/portfolio-command-context";
import { usePortfolio } from "@/lib/portfolio-context";
import { useIsMobileViewport } from "@/lib/use-mobile-viewport";
import { useTrack } from "@/lib/use-track";
import { buildPathWithTab } from "@/lib/dashboard-tab-url";
import { useDashboardTabUrl, type DashboardTab } from "@/lib/use-dashboard-tab-url";
import DashboardToolbar from "@/components/DashboardToolbar";

/**
 * Site-wide portfolio command row (matches former DashboardToolbar): portfolio, Holdings/Tools/…, Sync, Add.
 * Renders inside AppNav header. Hidden on mobile home/demo where MobileDashboard shows the same strip.
 */
function AppPortfolioCommandStripInner() {
  const pathname = usePathname();
  const router = useRouter();
  const track = useTrack();
  const isMobileViewport = useIsMobileViewport();
  const { holdings } = usePortfolio();
  const { user } = useAuth();
  const { gatedAdd, openSettings, openResetPortfolio } = usePortfolioCommand();

  const holdingsCount = holdings.length;
  const isDashboardRoute = pathname === "/" || pathname === "/demo";
  const hideOnMobileHome = isMobileViewport && isDashboardRoute;

  const { activeTab: urlActiveTab, navigateToTab } = useDashboardTabUrl({
    holdingsCount,
    tierGate: false,
    userPlan: user?.plan ?? "free",
  });

  const displayActiveTab = useMemo(
    () => (isDashboardRoute ? urlActiveTab : null),
    [isDashboardRoute, urlActiveTab],
  );

  const onSelectTab = useCallback(
    (tab: DashboardTab) => {
      const homePath = pathname.startsWith("/demo") ? "/demo" : "/";
      if (!isDashboardRoute) {
        router.push(buildPathWithTab(homePath, new URLSearchParams(), tab));
        return;
      }
      navigateToTab(tab);
      window.scrollTo({ top: 0, behavior: "instant" });
      if (tab === "diversification") track("diversification_tab_viewed");
      if (tab === "dividends") track("dividends_tab_viewed");
      if (tab === "metrics") track("metrics_tab_viewed");
      if (tab === "growth") track("growth_tab_viewed");
      if (tab === "events") track("events_tab_viewed");
    },
    [isDashboardRoute, navigateToTab, pathname, router, track],
  );

  if (hideOnMobileHome) {
    return null;
  }

  return (
    <DashboardToolbar
      onAddStock={() => gatedAdd("stock")}
      onAddCrypto={() => gatedAdd("crypto")}
      onAddAsset={() => gatedAdd("asset")}
      onOpenSettings={openSettings}
      onResetPortfolio={openResetPortfolio}
      quickNav={{
        activeTab: displayActiveTab,
        onSelectTab,
        holdingsCount,
      }}
    />
  );
}

export default function AppPortfolioCommandStrip() {
  return (
    <Suspense fallback={null}>
      <AppPortfolioCommandStripInner />
    </Suspense>
  );
}
