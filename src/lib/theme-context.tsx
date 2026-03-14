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

export const FORCED_MODE: Record<LayoutTheme, Theme | null> = {
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

interface ThemeProviderProps {
  children: React.ReactNode;
  initialTheme?: LayoutTheme;
}

export function ThemeProvider({ children, initialTheme = "default" }: ThemeProviderProps) {
  const [currentLayout, setCurrentLayout] = useState<LayoutTheme>(initialTheme);
  const [theme, setTheme] = useState<Theme>(FORCED_MODE[initialTheme] ?? "light");

  useEffect(() => {
    const forced = FORCED_MODE[currentLayout];
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const preferred = forced ?? stored ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(preferred);
    document.documentElement.classList.toggle("dark", preferred === "dark");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLayoutTheme = useCallback((lt: LayoutTheme) => {
    setCurrentLayout(lt);
    const forced = FORCED_MODE[lt];
    if (forced) {
      setTheme(forced);
      document.documentElement.classList.toggle("dark", forced === "dark");
    }
  }, []);

  const toggleTheme = useCallback(() => {
    if (FORCED_MODE[currentLayout]) return;
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem(STORAGE_KEY, next);
      document.documentElement.classList.toggle("dark", next === "dark");
      return next;
    });
  }, [currentLayout]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: theme === "dark",
        layoutTheme: currentLayout,
        canToggleMode: FORCED_MODE[currentLayout] === null,
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
