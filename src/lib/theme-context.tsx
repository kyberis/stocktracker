"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { LayoutTheme } from "./types";

type Theme = "light" | "dark";

const LAYOUT_THEME_CLASSES = ["theme-terminal", "theme-canvas", "theme-studio"] as const;

const FORCED_MODE: Record<LayoutTheme, Theme | null> = {
  default: null,
  terminal: "dark",
  canvas: "light",
  studio: "dark",
};

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  layoutTheme: LayoutTheme;
  canToggleMode: boolean;
  toggleTheme: () => void;
  setLayoutTheme: (lt: LayoutTheme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  isDark: false,
  layoutTheme: "default",
  canToggleMode: true,
  toggleTheme: () => {},
  setLayoutTheme: () => {},
});

const STORAGE_KEY = "trefolio-theme";

function applyLayoutClass(lt: LayoutTheme) {
  const el = document.documentElement;
  for (const cls of LAYOUT_THEME_CLASSES) el.classList.remove(cls);
  if (lt !== "default") el.classList.add(`theme-${lt}`);
}

const VALID_LAYOUT_THEMES = new Set<LayoutTheme>(["default", "terminal", "canvas", "studio"]);

function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function readLayoutThemeFromCookie(): LayoutTheme {
  const val = getCookieValue("trefolio_layout_theme") as LayoutTheme | null;
  if (val && VALID_LAYOUT_THEMES.has(val)) return val;
  return "default";
}

interface ThemeProviderProps {
  children: React.ReactNode;
  initialTheme?: LayoutTheme;
}

export function ThemeProvider({ children, initialTheme = "default" }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(FORCED_MODE[initialTheme] ?? "light");
  const [layoutTheme, setLayoutThemeRaw] = useState<LayoutTheme>(initialTheme);

  useEffect(() => {
    const cookieLayout = readLayoutThemeFromCookie();
    const effective = cookieLayout !== "default" ? cookieLayout : initialTheme;
    if (effective !== layoutTheme) {
      setLayoutThemeRaw(effective);
    }
    applyLayoutClass(effective);
    const forced = FORCED_MODE[effective];
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const preferred = forced ?? stored ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(preferred);
    document.documentElement.classList.toggle("dark", preferred === "dark");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyLayoutClass(layoutTheme);
    const forced = FORCED_MODE[layoutTheme];
    if (forced) {
      setTheme(forced);
      document.documentElement.classList.toggle("dark", forced === "dark");
    }
  }, [layoutTheme]);

  const toggleTheme = useCallback(() => {
    if (FORCED_MODE[layoutTheme]) return;
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem(STORAGE_KEY, next);
      document.documentElement.classList.toggle("dark", next === "dark");
      return next;
    });
  }, [layoutTheme]);

  const setLayoutTheme = useCallback((lt: LayoutTheme) => {
    setLayoutThemeRaw(lt);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: theme === "dark",
        layoutTheme,
        canToggleMode: FORCED_MODE[layoutTheme] === null,
        toggleTheme,
        setLayoutTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
