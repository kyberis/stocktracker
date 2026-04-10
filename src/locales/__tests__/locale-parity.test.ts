import { describe, it, expect } from "vitest";
import en from "@/locales/en";
import { LANGUAGE_CODES } from "@/lib/languages";

describe("locale parity", () => {
  it.each(LANGUAGE_CODES)("locale %s exports every key present in en", async (code) => {
    const mod = await import(/* @vite-ignore */ `@/locales/${code}.ts`);
    const loc = mod.default as Record<string, string>;
    for (const k of Object.keys(en)) {
      expect(loc[k], `${code} missing ${k}`).toBeDefined();
      expect(typeof loc[k]).toBe("string");
    }
  });
});
