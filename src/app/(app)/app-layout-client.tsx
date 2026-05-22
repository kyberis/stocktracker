"use client";

import { ThemeProvider, useTheme } from "@/lib/theme-context";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { I18nProvider } from "@/lib/i18n";
import { SettingsProvider } from "@/lib/settings-context";
import { StealthProvider } from "@/lib/stealth-context";
import { PlatformProvider } from "@/lib/platform-context";
import { FeatureFlagProvider } from "@/lib/feature-flag-context";
import { PortfolioProvider } from "@/lib/portfolio-context";
import { PortfolioCommandProvider } from "@/contexts/portfolio-command-context";
import { useIsNative } from "@/lib/use-native";
import NavigationProgress from "@/components/NavigationProgress";
import AppNav from "@/components/AppNav";
import NavAssetSearch from "@/components/NavAssetSearch";
import AppNavPrimaryPills from "@/components/AppNavPrimaryPills";
import { usePathname } from "next/navigation";
import { useFeatureFlags } from "@/lib/feature-flag-context";
import { useI18n } from "@/lib/i18n";
import { getDesktopNavItems } from "@/lib/app-nav";
import SidebarNav from "@/components/SidebarNav";
import MarketTickerBar from "@/components/MarketTickerBar";
import MobileTabBar from "@/components/MobileTabBar";
import InstallPrompt from "@/components/InstallPrompt";
import MarketMoveToast from "@/components/MarketMoveToast";
import SatisfactionSurvey from "@/components/SatisfactionSurvey";
import CapacitorBridge from "@/components/CapacitorBridge";
import NativePushBridge from "@/components/NativePushBridge";
import DeviceInterestEnroller from "@/components/DeviceInterestEnroller";
import ThemeWizard from "@/components/ThemeWizard";
import EmailVerificationBanner from "@/components/EmailVerificationBanner";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import NativeShell from "@/components/NativeShell";
import SyncConfidenceBanner from "@/components/SyncConfidenceBanner";
import { CURRENT_VERSION } from "@/lib/release-version";
import Link from "next/link";
import type { LayoutTheme } from "@/lib/types";

function StudioCommandStrip() {
  const pathname = usePathname();
  const flags = useFeatureFlags();
  const { t } = useI18n();
  return (
    <div className="border-b border-white/5 bg-[#09090b] px-3 sm:px-4 py-2">
      <div className="mx-auto flex w-full min-w-0 max-w-2xl flex-col gap-2">
        <NavAssetSearch variant="studio" />
        <AppNavPrimaryPills
          variant="studio"
          items={getDesktopNavItems(flags)}
          pathname={pathname}
          navAriaLabel={t("primaryNavAriaLabel")}
        />
      </div>
    </div>
  );
}

function AppFooter() {
  return (
    <footer className="hidden sm:flex items-center justify-center gap-3 py-3 text-[11px] text-gray-400 dark:text-slate-500">
      <span>&copy; {new Date().getFullYear()} trefolio</span>
      <span className="opacity-40">·</span>
      <Link href="/releasenotes" className="hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
        v{CURRENT_VERSION} &mdash; What&apos;s New
      </Link>
      <span className="opacity-40">·</span>
      <Link href="/privacy" className="hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
        Privacy
      </Link>
      <span className="opacity-40">·</span>
      <Link href="/terms" className="hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
        Terms
      </Link>
    </footer>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  const { layoutTheme } = useTheme();
  const pathname = usePathname();
  const isOffice = pathname === "/office" || pathname.startsWith("/office/");
  const isStudio = layoutTheme === "studio";
  const isNative = useIsNative();

  if (isOffice) {
    return (
      <>
        <ImpersonationBanner />
        <EmailVerificationBanner />
        <main id="main-content">{children}</main>
        <CapacitorBridge />
        <NativePushBridge />
      </>
    );
  }

  if (isNative) {
    return <NativeShell>{children}</NativeShell>;
  }

  if (isStudio) {
    return (
      <div className="min-h-screen bg-[#09090b] flex" style={{ fontFamily: "var(--font-primary, inherit)" }}>
        <SidebarNav />
        <div className="flex-1 min-h-screen bg-[#18181b] pb-14 sm:pb-0 overflow-x-hidden">
          <ImpersonationBanner />
          <EmailVerificationBanner />
          <SyncConfidenceBanner />
          <MarketTickerBar />
          <StudioCommandStrip />
          <main id="main-content">{children}</main>
          <AppFooter />
          <MobileTabBar />
          <InstallPrompt />
          <MarketMoveToast />
          <SatisfactionSurvey />
          <CapacitorBridge />
          <NativePushBridge />
          <DeviceInterestEnroller />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-14 sm:pb-0 overflow-x-hidden" style={{ background: "var(--background)", fontFamily: "var(--font-primary, inherit)" }}>
      <ImpersonationBanner />
      <EmailVerificationBanner />
      <SyncConfidenceBanner />
      <MarketTickerBar />
      <AppNav />
      <main id="main-content">{children}</main>
      <AppFooter />
      <MobileTabBar />
      <InstallPrompt />
      <MarketMoveToast />
      <SatisfactionSurvey />
      <CapacitorBridge />
      <NativePushBridge />
      <DeviceInterestEnroller />
    </div>
  );
}

function PlatformBridge({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return (
    <PlatformProvider userPlan={user?.plan ?? "free"}>
      {children}
    </PlatformProvider>
  );
}

export default function AppLayoutClient({
  children,
  initialTheme,
}: {
  children: React.ReactNode;
  initialTheme: LayoutTheme;
}) {
  return (
    <ThemeProvider initialTheme={initialTheme}>
      <AuthProvider>
        <FeatureFlagProvider>
          <PlatformBridge>
            <I18nProvider>
              <SettingsProvider>
                <StealthProvider>
                  <PortfolioProvider>
                    <PortfolioCommandProvider>
                      <NavigationProgress />
                      <AppShell>{children}</AppShell>
                    </PortfolioCommandProvider>
                  </PortfolioProvider>
                  <ThemeWizard />
                </StealthProvider>
              </SettingsProvider>
            </I18nProvider>
          </PlatformBridge>
        </FeatureFlagProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
