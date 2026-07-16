import { describe, it, expect, afterEach, vi } from "vitest";
import {
  isPreviewLoginAllowed,
  previewLoginSecretsConfigured,
  safePreviewRedirect,
  verifyPreviewLoginSecret,
} from "./preview-login";

describe("preview-login helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("denies production even if secrets exist", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("PREVIEW_LOGIN_SECRET", "secret");
    vi.stubEnv("PREVIEW_USER_EMAIL", "a@b.com");
    expect(isPreviewLoginAllowed()).toBe(false);
  });

  it("allows Vercel preview", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(isPreviewLoginAllowed()).toBe(true);
  });

  it("allows local only with explicit opt-in", () => {
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("PREVIEW_LOGIN_ALLOW_LOCAL", "1");
    expect(isPreviewLoginAllowed()).toBe(true);
  });

  it("verifies secret with timing-safe compare", () => {
    vi.stubEnv("PREVIEW_LOGIN_SECRET", "abc123");
    expect(verifyPreviewLoginSecret("abc123")).toBe(true);
    expect(verifyPreviewLoginSecret("wrong")).toBe(false);
    expect(verifyPreviewLoginSecret(null)).toBe(false);
  });

  it("requires both secret and email configured", () => {
    vi.stubEnv("PREVIEW_LOGIN_SECRET", "x");
    vi.stubEnv("PREVIEW_USER_EMAIL", "");
    expect(previewLoginSecretsConfigured()).toBe(false);
    vi.stubEnv("PREVIEW_USER_EMAIL", "preview@trefolio.com");
    expect(previewLoginSecretsConfigured()).toBe(true);
  });

  it("sanitizes redirect", () => {
    expect(safePreviewRedirect(null)).toBe("/");
    expect(safePreviewRedirect("/dashboard")).toBe("/dashboard");
    expect(safePreviewRedirect("https://evil.com")).toBe("/");
    expect(safePreviewRedirect("//evil.com")).toBe("/");
  });
});
