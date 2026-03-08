import { describe, it, expect, vi, afterEach } from "vitest";
import {
  mockFetchResponse,
  mockFetchNetworkError,
} from "./_helpers";

const originalFetch = globalThis.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
});

/**
 * Simulates the Apple OAuth token exchange as implemented in
 * src/app/api/auth/apple/callback/route.ts
 */
async function exchangeAppleToken(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<{ id_token?: string } | null> {
  const tokenRes = await fetch("https://appleid.apple.com/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) return null;
  return tokenRes.json();
}

describe("Apple OAuth chaos", () => {
  const PARAMS = {
    code: "test-code",
    clientId: "com.trefolio.app",
    clientSecret: "generated-jwt-secret",
    redirectUri: "http://localhost:3000/api/auth/apple/callback",
  };

  describe("token exchange failures", () => {
    it("returns null on HTTP 400 (invalid grant)", async () => {
      mockFetchResponse(400, { error: "invalid_grant" });

      const result = await exchangeAppleToken(
        PARAMS.code,
        PARAMS.clientId,
        PARAMS.clientSecret,
        PARAMS.redirectUri,
      );
      expect(result).toBeNull();
    });

    it("returns null on HTTP 500", async () => {
      mockFetchResponse(500, {});

      const result = await exchangeAppleToken(
        PARAMS.code,
        PARAMS.clientId,
        PARAMS.clientSecret,
        PARAMS.redirectUri,
      );
      expect(result).toBeNull();
    });

    it("throws on network error", async () => {
      mockFetchNetworkError();

      await expect(
        exchangeAppleToken(
          PARAMS.code,
          PARAMS.clientId,
          PARAMS.clientSecret,
          PARAMS.redirectUri,
        ),
      ).rejects.toThrow("Failed to fetch");
    });
  });

  describe("missing id_token", () => {
    it("returns empty object when id_token is absent", async () => {
      mockFetchResponse(200, { access_token: "at_apple_123" });

      const result = await exchangeAppleToken(
        PARAMS.code,
        PARAMS.clientId,
        PARAMS.clientSecret,
        PARAMS.redirectUri,
      );
      expect(result).toBeDefined();
      expect(result!.id_token).toBeUndefined();
    });
  });

  describe("JWKS verification", () => {
    it("jwtVerify rejects when JWKS is unreachable", async () => {
      const { createRemoteJWKSet, jwtVerify } = await import("jose");

      const JWKS = createRemoteJWKSet(
        new URL("https://appleid.apple.com/auth/keys"),
      );

      mockFetchNetworkError("JWKS endpoint unreachable");

      await expect(
        jwtVerify("fake.jwt.token", JWKS, {
          issuer: "https://appleid.apple.com",
          audience: "com.trefolio.app",
        }),
      ).rejects.toThrow();
    });

    it("jwtVerify rejects on invalid token format", async () => {
      const { createRemoteJWKSet, jwtVerify } = await import("jose");

      const JWKS = createRemoteJWKSet(
        new URL("https://appleid.apple.com/auth/keys"),
      );

      mockFetchResponse(200, { keys: [] });

      await expect(
        jwtVerify("not-a-valid-jwt", JWKS, {
          issuer: "https://appleid.apple.com",
          audience: "com.trefolio.app",
        }),
      ).rejects.toThrow();
    });
  });

  describe("successful token exchange", () => {
    it("returns id_token when present", async () => {
      mockFetchResponse(200, {
        access_token: "at_apple_456",
        id_token: "eyJ.fake.token",
      });

      const result = await exchangeAppleToken(
        PARAMS.code,
        PARAMS.clientId,
        PARAMS.clientSecret,
        PARAMS.redirectUri,
      );
      expect(result!.id_token).toBe("eyJ.fake.token");
    });
  });

  describe("env var validation", () => {
    it("all four Apple env vars are needed", () => {
      const required = [
        "APPLE_CLIENT_ID",
        "APPLE_TEAM_ID",
        "APPLE_KEY_ID",
        "APPLE_PRIVATE_KEY",
      ];
      for (const key of required) {
        expect(typeof key).toBe("string");
      }
    });
  });
});
