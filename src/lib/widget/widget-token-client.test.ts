import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  clearStoredWidgetToken,
  isWidgetTokenShape,
  readStoredWidgetToken,
  writeStoredWidgetToken,
  WIDGET_TOKEN_STORAGE_KEY,
} from "./widget-token-client";

describe("widget-token-client", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    });
  });

  it("accepts tfw_ tokens of sufficient length", () => {
    expect(isWidgetTokenShape("tfw_" + "a".repeat(48))).toBe(true);
    expect(isWidgetTokenShape("short")).toBe(false);
    expect(isWidgetTokenShape("tfw_abc")).toBe(false);
  });

  it("persists and clears the token", () => {
    const token = "tfw_" + "b".repeat(48);
    writeStoredWidgetToken(token);
    expect(store.get(WIDGET_TOKEN_STORAGE_KEY)).toBe(token);
    expect(readStoredWidgetToken()).toBe(token);
    clearStoredWidgetToken();
    expect(readStoredWidgetToken()).toBe("");
  });

  it("ignores malformed stored values", () => {
    store.set(WIDGET_TOKEN_STORAGE_KEY, "not-a-token");
    expect(readStoredWidgetToken()).toBe("");
  });
});
