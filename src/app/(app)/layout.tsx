"use client";

import { ThemeProvider } from "@/lib/theme-context";
import { AuthProvider } from "@/lib/auth-context";
import { I18nProvider } from "@/lib/i18n";
import { SettingsProvider } from "@/lib/settings-context";
import { StealthProvider } from "@/lib/stealth-context";
import AppNav from "@/components/AppNav";
import MobileTabBar from "@/components/MobileTabBar";
import InstallPrompt from "@/components/InstallPrompt";
import DeviceInterestEnroller from "@/components/DeviceInterestEnroller";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <I18nProvider>
          <SettingsProvider>
            <StealthProvider>
              <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-14 sm:pb-0">
                <AppNav />
                <main id="main-content">
                  {children}
                </main>
                <MobileTabBar />
                <InstallPrompt />
                <DeviceInterestEnroller />
              </div>
            </StealthProvider>
          </SettingsProvider>
        </I18nProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
