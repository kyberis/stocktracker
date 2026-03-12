"use client";

import { useEffect } from "react";
import { useSettings } from "@/lib/settings-context";
import { useTheme } from "@/lib/theme-context";

/**
 * Syncs dashboardTheme from SettingsContext into ThemeProvider.
 * Must be rendered inside both providers (SettingsProvider is nested
 * within ThemeProvider in the app layout).
 */
export default function LayoutThemeBridge() {
  const { dashboardTheme } = useSettings();
  const { setLayoutTheme } = useTheme();

  useEffect(() => {
    setLayoutTheme(dashboardTheme);
  }, [dashboardTheme, setLayoutTheme]);

  return null;
}
