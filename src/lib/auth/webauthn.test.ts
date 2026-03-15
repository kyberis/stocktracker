import { describe, it, expect, vi, beforeEach } from "vitest";
import { getWebAuthnConfig, getChallengeCookieConfig, getChallengeFromRequest, getExpiredChallengeCookieConfig } from "./webauthn";

describe("getWebAuthnConfig", () => {
  beforeEach(() => {
    delete process.env.APP_BASE_URL;
  });

  it("uses APP_BASE_URL env var when set", () => {
    process.env.APP_BASE_URL = "https://trefolio.app";
    const config = getWebAuthnConfig();
    expect(config.rpName).toBe("trefolio");
    expect(config.rpID).toBe("trefolio.app");
    expect(config.origin).toBe("https://trefolio.app");
  });

  it("falls back to localhost when no env or request", () => {
    const config = getWebAuthnConfig();
    expect(config.rpID).toBe("localhost");
    expect(config.origin).toBe("http://localhost:3000");
  });

  it("uses request origin when no env var", () => {
    const req = {
      nextUrl: { origin: "https://custom.example.com" },
    } as any;
    const config = getWebAuthnConfig(req);
    expect(config.rpID).toBe("custom.example.com");
    expect(config.origin).toBe("https://custom.example.com");
  });
});

describe("getChallengeCookieConfig", () => {
  it("returns correct cookie config", () => {
    const config = getChallengeCookieConfig("test-challenge-abc");
    expect(config.name).toBe("trefolio_webauthn_challenge");
    expect(config.value).toBe("test-challenge-abc");
    expect(config.httpOnly).toBe(true);
    expect(config.sameSite).toBe("lax");
    expect(config.path).toBe("/");
    expect(config.maxAge).toBe(300);
  });

  it("sets secure flag based on NODE_ENV", () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    expect(getChallengeCookieConfig("x").secure).toBe(true);
    process.env.NODE_ENV = "test";
    expect(getChallengeCookieConfig("x").secure).toBe(false);
    process.env.NODE_ENV = origEnv;
  });
});

describe("getChallengeFromRequest", () => {
  it("returns the cookie value when present", () => {
    const req = {
      cookies: { get: vi.fn().mockReturnValue({ value: "my-challenge" }) },
    } as any;
    expect(getChallengeFromRequest(req)).toBe("my-challenge");
    expect(req.cookies.get).toHaveBeenCalledWith("trefolio_webauthn_challenge");
  });

  it("returns null when cookie is absent", () => {
    const req = {
      cookies: { get: vi.fn().mockReturnValue(undefined) },
    } as any;
    expect(getChallengeFromRequest(req)).toBeNull();
  });
});

describe("getExpiredChallengeCookieConfig", () => {
  it("returns config with maxAge 0 and empty value", () => {
    const config = getExpiredChallengeCookieConfig();
    expect(config.name).toBe("trefolio_webauthn_challenge");
    expect(config.value).toBe("");
    expect(config.maxAge).toBe(0);
  });
});
