/** Browser-only helpers so one widget token can be reused across Scriptable scripts. */

export const WIDGET_TOKEN_STORAGE_KEY = "trefolio.widgetToken";

const TOKEN_PREFIX = "tfw_";

function browserStorage(): Storage | null {
  try {
    const ls = globalThis.localStorage;
    if (!ls) return null;
    return ls;
  } catch {
    return null;
  }
}

export function isWidgetTokenShape(value: string): boolean {
  const t = value.trim();
  return t.startsWith(TOKEN_PREFIX) && t.length >= TOKEN_PREFIX.length + 16;
}

export function readStoredWidgetToken(): string {
  const ls = browserStorage();
  if (!ls) return "";
  try {
    const raw = ls.getItem(WIDGET_TOKEN_STORAGE_KEY) ?? "";
    return isWidgetTokenShape(raw) ? raw.trim() : "";
  } catch {
    return "";
  }
}

export function writeStoredWidgetToken(token: string): void {
  const ls = browserStorage();
  if (!ls) return;
  const t = token.trim();
  if (!isWidgetTokenShape(t)) return;
  try {
    ls.setItem(WIDGET_TOKEN_STORAGE_KEY, t);
  } catch {
    /* private mode / quota */
  }
}

export function clearStoredWidgetToken(): void {
  const ls = browserStorage();
  if (!ls) return;
  try {
    ls.removeItem(WIDGET_TOKEN_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
