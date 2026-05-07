import { describe, expect, it } from "vitest";
import { resolveEffectiveTursoDatabaseUrl } from "./turso-env";

describe("resolveEffectiveTursoDatabaseUrl", () => {
  it("uses remote URL on Vercel even in development-shaped NODE_ENV", () => {
    expect(
      resolveEffectiveTursoDatabaseUrl({
        rawDatabaseUrl: "libsql://prod-example.turso.io",
        isVercel: true,
        nodeEnv: "development",
        useRemoteDbInDev: false,
      }),
    ).toBe("libsql://prod-example.turso.io");
  });

  it("ignores remote URL locally when NODE_ENV is development and no opt-in", () => {
    expect(
      resolveEffectiveTursoDatabaseUrl({
        rawDatabaseUrl: "libsql://prod-example.turso.io",
        isVercel: false,
        nodeEnv: "development",
        useRemoteDbInDev: false,
      }),
    ).toBeUndefined();
  });

  it("ignores remote URL when NODE_ENV is test and no opt-in", () => {
    expect(
      resolveEffectiveTursoDatabaseUrl({
        rawDatabaseUrl: "libsql://x.turso.io",
        isVercel: false,
        nodeEnv: "test",
        useRemoteDbInDev: false,
      }),
    ).toBeUndefined();
  });

  it("uses remote URL when opt-in is true in development", () => {
    expect(
      resolveEffectiveTursoDatabaseUrl({
        rawDatabaseUrl: "libsql://staging.turso.io",
        isVercel: false,
        nodeEnv: "development",
        useRemoteDbInDev: true,
      }),
    ).toBe("libsql://staging.turso.io");
  });

  it("uses remote URL for local production build (NODE_ENV production)", () => {
    expect(
      resolveEffectiveTursoDatabaseUrl({
        rawDatabaseUrl: "libsql://x.turso.io",
        isVercel: false,
        nodeEnv: "production",
        useRemoteDbInDev: false,
      }),
    ).toBe("libsql://x.turso.io");
  });

  it("uses remote URL when NODE_ENV is unset (CLI scripts)", () => {
    expect(
      resolveEffectiveTursoDatabaseUrl({
        rawDatabaseUrl: "libsql://x.turso.io",
        isVercel: false,
        nodeEnv: undefined,
        useRemoteDbInDev: false,
      }),
    ).toBe("libsql://x.turso.io");
  });

  it("passes through file: SQLite URLs in development without opt-in", () => {
    expect(
      resolveEffectiveTursoDatabaseUrl({
        rawDatabaseUrl: "file:data/custom.db",
        isVercel: false,
        nodeEnv: "development",
        useRemoteDbInDev: false,
      }),
    ).toBe("file:data/custom.db");
  });

  it("returns undefined when raw URL is empty", () => {
    expect(
      resolveEffectiveTursoDatabaseUrl({
        rawDatabaseUrl: undefined,
        isVercel: false,
        nodeEnv: "development",
        useRemoteDbInDev: false,
      }),
    ).toBeUndefined();
  });
});
