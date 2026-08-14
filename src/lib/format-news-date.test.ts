import { describe, expect, it } from "vitest";
import {
  formatNewsPublishedCompact,
  formatNewsPublishedFull,
  formatNewsPublishedShort,
  parseNewsPublishedAt,
} from "@/lib/format-news-date";

describe("format-news-date", () => {
  it("parses ISO timestamps", () => {
    const d = parseNewsPublishedAt("2026-08-14T14:32:00.000Z");
    expect(d).toBeInstanceOf(Date);
    expect(d?.toISOString()).toBe("2026-08-14T14:32:00.000Z");
  });

  it("formats a short published stamp", () => {
    const text = formatNewsPublishedShort("2026-08-14T14:32:00.000Z", "en-GB");
    expect(text).toMatch(/14/);
    expect(text).toMatch(/Aug/i);
    expect(text).toContain("·");
  });

  it("formats compact day and time parts", () => {
    const compact = formatNewsPublishedCompact("2026-08-14T14:32:00.000Z", "en-GB");
    expect(compact?.day).toMatch(/14/);
    expect(compact?.time.length).toBeGreaterThan(0);
  });

  it("keeps a full locale string for the news page", () => {
    const full = formatNewsPublishedFull("2026-08-14T14:32:00.000Z", "en-GB");
    expect(full).toMatch(/14/);
    expect(full).toMatch(/2026/);
  });
});
