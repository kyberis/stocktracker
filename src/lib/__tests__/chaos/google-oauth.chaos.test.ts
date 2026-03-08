import { describe, it, expect, vi, afterEach } from "vitest";
import {
  mockFetchResponse,
  mockFetchNetworkError,
  mockFetchSequence,
} from "./_helpers";

const originalFetch = globalThis.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
});

/**
 * Simulates the Google OAuth token exchange + userinfo flow
 * as implemented in src/app/api/auth/google/callback/route.ts
 */
async function exchangeCodeForGoogleUser(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<{ sub: string; email: string; name: string } | null> {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
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

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) return null;

  const userInfoRes = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    { headers: { Authorization: `Bearer ${tokenData.access_token}` } },
  );
  if (!userInfoRes.ok) return null;

  return userInfoRes.json();
}

describe("Google OAuth chaos", () => {
  const PARAMS = {
    code: "test-code",
    clientId: "test-client-id",
    clientSecret: "test-secret",
    redirectUri: "http://localhost:3000/api/auth/google/callback",
  };

  describe("token exchange failures", () => {
    it("returns null on HTTP 400", async () => {
      mockFetchResponse(400, { error: "invalid_grant" });

      const result = await exchangeCodeForGoogleUser(
        PARAMS.code,
        PARAMS.clientId,
        PARAMS.clientSecret,
        PARAMS.redirectUri,
      );
      expect(result).toBeNull();
    });

    it("returns null on HTTP 500", async () => {
      mockFetchResponse(500, { error: "server_error" });

      const result = await exchangeCodeForGoogleUser(
        PARAMS.code,
        PARAMS.clientId,
        PARAMS.clientSecret,
        PARAMS.redirectUri,
      );
      expect(result).toBeNull();
    });

    it("returns null when access_token is missing", async () => {
      mockFetchResponse(200, { token_type: "Bearer" });

      const result = await exchangeCodeForGoogleUser(
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
        exchangeCodeForGoogleUser(
          PARAMS.code,
          PARAMS.clientId,
          PARAMS.clientSecret,
          PARAMS.redirectUri,
        ),
      ).rejects.toThrow("Failed to fetch");
    });
  });

  describe("userinfo failures", () => {
    it("returns null when userinfo returns 500", async () => {
      mockFetchSequence([
        { status: 200, body: { access_token: "at_123" } },
        { status: 500, body: { error: "server_error" } },
      ]);

      const result = await exchangeCodeForGoogleUser(
        PARAMS.code,
        PARAMS.clientId,
        PARAMS.clientSecret,
        PARAMS.redirectUri,
      );
      expect(result).toBeNull();
    });

    it("returns null when userinfo returns 401", async () => {
      mockFetchSequence([
        { status: 200, body: { access_token: "at_123" } },
        { status: 401, body: { error: "invalid_token" } },
      ]);

      const result = await exchangeCodeForGoogleUser(
        PARAMS.code,
        PARAMS.clientId,
        PARAMS.clientSecret,
        PARAMS.redirectUri,
      );
      expect(result).toBeNull();
    });
  });

  describe("successful flow", () => {
    it("returns user info when both calls succeed", async () => {
      mockFetchSequence([
        { status: 200, body: { access_token: "at_123" } },
        {
          status: 200,
          body: {
            sub: "google-123",
            email: "user@gmail.com",
            name: "Test User",
            picture: "https://photo.url",
          },
        },
      ]);

      const result = await exchangeCodeForGoogleUser(
        PARAMS.code,
        PARAMS.clientId,
        PARAMS.clientSecret,
        PARAMS.redirectUri,
      );
      expect(result).toEqual(
        expect.objectContaining({ sub: "google-123", email: "user@gmail.com" }),
      );
    });
  });
});
