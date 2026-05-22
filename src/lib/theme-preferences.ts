export const THEME_MODE_STORAGE_KEY = "trefolio-theme";
export const LAYOUT_THEME_COOKIE_NAME = "trefolio_layout_theme";

/** Client-side: reset layout theme and light/dark preference after sign-out. */
export function clearGuestThemePreferences(): void {
  if (typeof document === "undefined") return;

  try {
    document.cookie = `${LAYOUT_THEME_COOKIE_NAME}=;path=/;max-age=0;SameSite=Lax`;
  } catch {
    // ignore
  }

  try {
    localStorage.removeItem(THEME_MODE_STORAGE_KEY);
  } catch {
    // ignore
  }

  try {
    const html = document.documentElement;
    html.classList.remove("dark", "theme-terminal", "theme-canvas", "theme-studio");
  } catch {
    // ignore
  }
}

export function getExpiredLayoutThemeCookieConfig() {
  return {
    name: LAYOUT_THEME_COOKIE_NAME,
    value: "",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}
