"use client";

import { Suspense } from "react";
import { ThemeProvider } from "@/lib/theme-context";
import { AuthProvider } from "@/lib/auth-context";
import { I18nProvider } from "@/lib/i18n";
import { SettingsProvider } from "@/lib/settings-context";
import ProfilePage from "@/components/ProfilePage";

export default function Profile() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <I18nProvider>
          <SettingsProvider>
            <Suspense>
              <ProfilePage />
            </Suspense>
          </SettingsProvider>
        </I18nProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
