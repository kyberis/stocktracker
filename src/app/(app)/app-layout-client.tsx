"use client";

import { ThemeProvider, useTheme } from "@/lib/theme-context";
import { AuthProvider } from "@/lib/auth-context";
import { I18nProvider } from "@/lib/i18n";
import { SettingsProvider } from "@/lib/settings-context";
import { StealthProvider } from "@/lib/stealth-context";
import { useIsNative } from "@/lib/use-native";
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
import EmailVerificationBanner from "@/components/EmailVerificationBanner";
import NativeShell from "@/components/NativeShell";
import { CURRENT_VERSION } from "@/lib/release-notes";
import Link from "next/link";
import type { LayoutTheme } from "@/lib/types";

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
  const isStudio = layoutTheme === "studio";
  const isNative = useIsNative();

  if (isNative) {
    return <NativeShell>{children}</NativeShell>;
  }

  if (isStudio) {
    return (
      <div className="min-h-screen bg-[#09090b] flex" style={{ fontFamily: "var(--font-primary, inherit)" }}>
        <SidebarNav />
        <div className="flex-1 min-h-screen bg-[#18181b] pb-14 sm:pb-0">
          <EmailVerificationBanner />
          <MarketTickerBar />
          <main id="main-content">{children}</main>
          <AppFooter />
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
      <EmailVerificationBanner />
      <MarketTickerBar />
      <AppNav />
      <main id="main-content">{children}</main>
      <AppFooter />
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
