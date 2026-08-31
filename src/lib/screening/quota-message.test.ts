import { describe, expect, it } from "vitest";
import { getScreeningCopy } from "@/lib/screening/copy";
import {
  formatQuotaResetDate,
  isScreeningQuotaBlocked,
  resolveScreeningQuotaMessage,
} from "@/lib/screening/quota-message";

describe("resolveScreeningQuotaMessage", () => {
  const copy = getScreeningCopy("en");

  it("returns null for admins", () => {
    const msg = resolveScreeningQuotaMessage(
      copy,
      { used: 0, limit: 0, remaining: 0, resetAt: "2026-09-01T00:00:00.000Z", window: "month" },
      { isAdmin: true },
    );
    expect(msg).toBeNull();
  });

  it("returns null when quota is not loaded", () => {
    expect(resolveScreeningQuotaMessage(copy, undefined)).toBeNull();
  });

  it("explains not-included when limit is 0 (Free/Basic)", () => {
    const msg = resolveScreeningQuotaMessage(copy, {
      used: 0,
      limit: 0,
      remaining: 0,
      resetAt: "2026-09-01T00:00:00.000Z",
      window: "month",
    });
    expect(msg?.kind).toBe("not_included");
    expect(msg?.showUpgrade).toBe(true);
    expect(msg?.text).toContain("doesn't include");
    expect(msg?.text).not.toMatch(/used|3 screens|this week/i);
  });

  it("formats exhausted with used/limit/window/reset (not hardcoded 3/week)", () => {
    const msg = resolveScreeningQuotaMessage(
      copy,
      {
        used: 2,
        limit: 2,
        remaining: 0,
        resetAt: "2026-09-01T00:00:00.000Z",
        window: "month",
      },
      { language: "en" },
    );
    expect(msg?.kind).toBe("exhausted");
    expect(msg?.text).toContain("2 of 2");
    expect(msg?.text).toContain("month");
    expect(msg?.text).not.toContain("this week");
    expect(msg?.showUpgrade).toBe(true);
  });

  it("formats remaining when quota is available", () => {
    const msg = resolveScreeningQuotaMessage(copy, {
      used: 1,
      limit: 12,
      remaining: 11,
      resetAt: "2026-09-01T00:00:00.000Z",
      window: "month",
    });
    expect(msg?.kind).toBe("ok");
    expect(msg?.text).toBe("11 of 12 screens left this month");
    expect(msg?.showUpgrade).toBe(false);
  });

  it("uses Spanish copy for not-included", () => {
    const es = getScreeningCopy("es");
    const msg = resolveScreeningQuotaMessage(es, {
      used: 0,
      limit: 0,
      remaining: 0,
      resetAt: "2026-09-01T00:00:00.000Z",
      window: "month",
    });
    expect(msg?.text).toContain("no incluye");
  });
});

describe("isScreeningQuotaBlocked", () => {
  it("blocks when remaining is 0 and not admin", () => {
    expect(
      isScreeningQuotaBlocked(
        { used: 0, limit: 0, remaining: 0, resetAt: "", window: "month" },
        false,
      ),
    ).toBe(true);
  });

  it("does not block admins or unloaded quota", () => {
    expect(
      isScreeningQuotaBlocked(
        { used: 2, limit: 2, remaining: 0, resetAt: "", window: "month" },
        true,
      ),
    ).toBe(false);
    expect(isScreeningQuotaBlocked(undefined, false)).toBe(false);
  });
});

describe("formatQuotaResetDate", () => {
  it("formats a UTC calendar date", () => {
    const out = formatQuotaResetDate("2026-09-01T00:00:00.000Z", "en");
    expect(out).toMatch(/Sep/);
    expect(out).toMatch(/2026/);
  });
});
