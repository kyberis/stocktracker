import { timingSafeEqual } from "crypto";

/**
 * Preview-only session mint for Vercel Preview deployments.
 * Never active when VERCEL_ENV=production.
 */
export function isPreviewLoginAllowed(): boolean {
  if (process.env.VERCEL_ENV === "production") return false;
  if (process.env.VERCEL_ENV === "preview") return true;
  // Local opt-in for testing the route without Vercel.
  if (
    process.env.NODE_ENV === "development" &&
    process.env.PREVIEW_LOGIN_ALLOW_LOCAL === "1"
  ) {
    return true;
  }
  return false;
}

export function previewLoginSecretsConfigured(): boolean {
  return Boolean(
    process.env.PREVIEW_LOGIN_SECRET?.trim() &&
      process.env.PREVIEW_USER_EMAIL?.trim(),
  );
}

export function verifyPreviewLoginSecret(provided: string | null | undefined): boolean {
  const expected = process.env.PREVIEW_LOGIN_SECRET?.trim() ?? "";
  const got = (provided ?? "").trim();
  if (!expected || !got) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(got);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function getPreviewUserEmail(): string {
  return process.env.PREVIEW_USER_EMAIL?.trim().toLowerCase() ?? "";
}

export function safePreviewRedirect(input: string | null | undefined): string {
  if (!input) return "/";
  if (!input.startsWith("/") || input.startsWith("//")) return "/";
  return input;
}
