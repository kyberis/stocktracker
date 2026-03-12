import { cookies } from "next/headers";
import AppLayoutClient from "./app-layout-client";
import type { LayoutTheme } from "@/lib/types";

const VALID_THEMES = new Set<string>(["default", "terminal", "canvas", "studio"]);

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const raw = cookieStore.get("trefolio_layout_theme")?.value;
  const initialTheme: LayoutTheme = raw && VALID_THEMES.has(raw) ? (raw as LayoutTheme) : "default";

  return (
    <AppLayoutClient initialTheme={initialTheme}>
      {children}
    </AppLayoutClient>
  );
}
