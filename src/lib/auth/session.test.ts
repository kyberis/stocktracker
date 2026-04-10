import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { webcrypto } from "crypto";

vi.stubGlobal("crypto", webcrypto);

const origEnv = { ...process.env };

beforeEach(() => {
  vi.stubEnv("APP_SESSION_SECRET", "test-secret-that-is-long-enough-for-hs256-jwt");
  vi.stubEnv("NODE_ENV", "test");
});

afterEach(() => {
  vi.unstubAllEnvs();
  process.env = { ...origEnv };
});

import {
  createSessionToken,
  verifySessionToken,
  getSessionFromRequest,
  getSessionCookieConfig,
  getExpiredSessionCookieConfig,
  type SessionPayload,
} from "./session";

const validPayload: SessionPayload = {
  userId: "user-123",
  username: "testuser",
  email: "test@example.com",
  role: "user",
  mustChangePassword: false,
  plan: "free",
  emailVerified: true,
  onboardingCompleted: true,
};

describe("createSessionToken + verifySessionToken", () => {
  it("creates a valid JWT that can be verified", async () => {
    const token = await createSessionToken(validPayload);
    expect(token).toBeTruthy();
    expect(token.split(".")).toHaveLength(3);

    const result = await verifySessionToken(token);
    expect(result).not.toBeNull();
    expect(result!.userId).toBe("user-123");
    expect(result!.username).toBe("testuser");
    expect(result!.email).toBe("test@example.com");
    expect(result!.role).toBe("user");
    expect(result!.plan).toBe("free");
    expect(result!.emailVerified).toBe(true);
    expect(result!.onboardingCompleted).toBe(true);
  });

  it("preserves admin role", async () => {
    const token = await createSessionToken({ ...validPayload, role: "admin" });
    const result = await verifySessionToken(token);
    expect(result!.role).toBe("admin");
  });

  it("preserves pro plan", async () => {
    const token = await createSessionToken({ ...validPayload, plan: "pro" });
    const result = await verifySessionToken(token);
    expect(result!.plan).toBe("pro");
  });

  it("preserves starter plan", async () => {
    const token = await createSessionToken({ ...validPayload, plan: "starter" });
    const result = await verifySessionToken(token);
    expect(result!.plan).toBe("starter");
  });

  it("round-trips impersonatorUserId", async () => {
    const token = await createSessionToken({
      ...validPayload,
      impersonatorUserId: "admin-uuid",
    });
    const result = await verifySessionToken(token);
    expect(result!.impersonatorUserId).toBe("admin-uuid");
  });

  it("omits impersonator when not set", async () => {
    const token = await createSessionToken(validPayload);
    const result = await verifySessionToken(token);
    expect(result!.impersonatorUserId).toBeUndefined();
  });
});

describe("verifySessionToken", () => {
  it("returns null for invalid token", async () => {
    const result = await verifySessionToken("not-a-valid-jwt");
    expect(result).toBeNull();
  });

  it("returns null for tampered token", async () => {
    const token = await createSessionToken(validPayload);
    const tampered = token.slice(0, -5) + "XXXXX";
    const result = await verifySessionToken(tampered);
    expect(result).toBeNull();
  });

  it("defaults non-admin role to user", async () => {
    const token = await createSessionToken({ ...validPayload, role: "user" });
    const result = await verifySessionToken(token);
    expect(result!.role).toBe("user");
  });
});

describe("getSessionFromRequest", () => {
  it("returns session from valid cookie", async () => {
    const token = await createSessionToken(validPayload);
    const req = {
      cookies: { get: vi.fn().mockReturnValue({ value: token }) },
    } as any;

    const result = await getSessionFromRequest(req);
    expect(result).not.toBeNull();
    expect(result!.userId).toBe("user-123");
  });

  it("returns null when cookie is absent", async () => {
    const req = {
      cookies: { get: vi.fn().mockReturnValue(undefined) },
    } as any;

    const result = await getSessionFromRequest(req);
    expect(result).toBeNull();
  });

  it("returns null for invalid cookie value", async () => {
    const req = {
      cookies: { get: vi.fn().mockReturnValue({ value: "bad-token" }) },
    } as any;

    const result = await getSessionFromRequest(req);
    expect(result).toBeNull();
  });
});

describe("getSessionCookieConfig", () => {
  it("returns correct cookie config", () => {
    const config = getSessionCookieConfig("my-token");
    expect(config.name).toBe("trefolio_session");
    expect(config.value).toBe("my-token");
    expect(config.httpOnly).toBe(true);
    expect(config.sameSite).toBe("lax");
    expect(config.path).toBe("/");
    expect(config.maxAge).toBe(604800);
  });

  it("sets secure in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(getSessionCookieConfig("t").secure).toBe(true);
  });
});

describe("getExpiredSessionCookieConfig", () => {
  it("returns config with maxAge 0", () => {
    const config = getExpiredSessionCookieConfig();
    expect(config.name).toBe("trefolio_session");
    expect(config.value).toBe("");
    expect(config.maxAge).toBe(0);
  });
});
