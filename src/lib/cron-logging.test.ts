import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyCronAuth } from "./cron-logging";

describe("verifyCronAuth", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows missing auth when CRON_SECRET is unset outside production deployment", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("CRON_SECRET", "");
    expect(verifyCronAuth("test-job", null)).toBeNull();
  });

  it("returns 500 when production deployment has no CRON_SECRET", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CRON_SECRET", "");
    const res = verifyCronAuth("test-job", null);
    expect(res?.status).toBe(500);
  });

  it("returns 500 on Vercel preview when CRON_SECRET is missing", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("CRON_SECRET", "");
    const res = verifyCronAuth("test-job", null);
    expect(res?.status).toBe(500);
  });

  it("returns 401 when secret is set but Authorization is wrong", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("CRON_SECRET", "s3cret");
    const res = verifyCronAuth("test-job", "Bearer wrong");
    expect(res?.status).toBe(401);
  });

  it("allows when Bearer matches CRON_SECRET", () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect(verifyCronAuth("test-job", "Bearer s3cret")).toBeNull();
  });
});
