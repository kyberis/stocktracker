import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { verifyCronAuth } from "./cron-logging";

function reqWithAuth(value: string | null): NextRequest {
  const headers = new Headers();
  if (value !== null) headers.set("authorization", value);
  return new NextRequest("http://localhost/api/cron/test", { headers });
}

describe("verifyCronAuth", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows missing auth when CRON_SECRET is unset outside production deployment", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("CRON_SECRET", "");
    expect(verifyCronAuth("test-job", reqWithAuth(null))).toBeNull();
  });

  it("returns 500 when production deployment has no CRON_SECRET", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CRON_SECRET", "");
    const res = verifyCronAuth("test-job", reqWithAuth(null));
    expect(res?.status).toBe(500);
  });

  it("returns 500 on Vercel preview when CRON_SECRET is missing", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("CRON_SECRET", "");
    const res = verifyCronAuth("test-job", reqWithAuth(null));
    expect(res?.status).toBe(500);
  });

  it("returns 401 when secret is set but Authorization is wrong", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("CRON_SECRET", "s3cret");
    const res = verifyCronAuth("test-job", reqWithAuth("Bearer wrong"));
    expect(res?.status).toBe(401);
  });

  it("allows when Bearer matches CRON_SECRET", () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect(verifyCronAuth("test-job", reqWithAuth("Bearer s3cret"))).toBeNull();
  });

  it("trimmed CRON_SECRET matches (dashboard pasted newline)", () => {
    vi.stubEnv("CRON_SECRET", "s3cret\n");
    expect(verifyCronAuth("test-job", reqWithAuth("Bearer s3cret"))).toBeNull();
  });

  it("accepts flexible Bearer whitespace", () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect(verifyCronAuth("test-job", reqWithAuth("bearer s3cret"))).toBeNull();
  });

  it("accepts CRON_SECRET_FALLBACK during rotation", () => {
    vi.stubEnv("CRON_SECRET", "newsecret");
    vi.stubEnv("CRON_SECRET_FALLBACK", "oldsecret");
    expect(verifyCronAuth("test-job", reqWithAuth("Bearer oldsecret"))).toBeNull();
  });
});
