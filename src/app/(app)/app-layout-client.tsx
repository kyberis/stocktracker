"use client";

import { ThemeProvider, useTheme } from "@/lib/theme-context";
import { AuthProvider } from "@/lib/auth-context";
import { I18nProvider } from "@/lib/i18n";
import { SettingsProvider } from "@/lib/settings-context";
import { StealthProvider } from "@/lib/stealth-context";
import AppNav from "@/components/AppNav";
import SidebarNav from "@/components/SidebarNav";
import MarketTickerBar from "@/components/MarketTickerBar";
import MobileTabBar from "@/components/MobileTabBar";
import InstallPrompt from "@/components/InstallPrompt";
import MarketMoveToast from "@/components/MarketMoveToast";
import CapacitorBridge from "@/components/CapacitorBridge";
import NativePushBridge from "@/components/NativePushBridge";
import DeviceInterestEnroller from "@/components/DeviceInterestEnroller";
import ThemeWizard from "@/components/ThemeWizard";
import type { LayoutTheme } from "@/lib/types";

function AppShell({ children }: { children: React.ReactNode }) {
  const { layoutTheme } = useTheme();
  const isStudio = layoutTheme === "studio";

  if (isStudio) {
    return (
      <div className="min-h-screen bg-[#09090b] flex" style={{ fontFamily: "var(--font-primary, inherit)" }}>
        <SidebarNav />
        <div className="flex-1 min-h-screen bg-[#18181b] pb-14 sm:pb-0">
          <MarketTickerBar />
          <main id="main-content">{children}</main>
          <MobileTabBar />
          <InstallPrompt />
          <MarketMoveToast />
          <CapacitorBridge />
          <NativePushBridge />
          <DeviceInterestEnroller />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-14 sm:pb-0" style={{ background: "var(--background)", fontFamily: "var(--font-primary, inherit)" }}>
      <MarketTickerBar />
      <AppNav />
      <main id="main-content">{children}</main>
      <MobileTabBar />
      <InstallPrompt />
      <MarketMoveToast />
      <CapacitorBridge />
      <NativePushBridge />
      <DeviceInterestEnroller />
    </div>
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
        <I18nProvider>
          <SettingsProvider>
            <StealthProvider>
              <AppShell>{children}</AppShell>
              <ThemeWizard />
            </StealthProvider>
          </SettingsProvider>
        </I18nProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
