import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isE2EAuthBypassActive } from "./e2e-auth-bypass";

describe("isE2EAuthBypassActive", () => {
  const orig = { ...process.env };

  beforeEach(() => {
    process.env = { ...orig };
  });

  afterEach(() => {
    process.env = orig;
  });

  it("is false when E2E is not 1", () => {
    delete process.env.E2E;
    expect(isE2EAuthBypassActive()).toBe(false);
    process.env.E2E = "0";
    expect(isE2EAuthBypassActive()).toBe(false);
  });

  it("is true when E2E=1 and not Vercel production", () => {
    process.env.E2E = "1";
    delete process.env.VERCEL_ENV;
    expect(isE2EAuthBypassActive()).toBe(true);
  });

  it("is false on Vercel production even if E2E=1", () => {
    process.env.E2E = "1";
    process.env.VERCEL_ENV = "production";
    expect(isE2EAuthBypassActive()).toBe(false);
  });
});
