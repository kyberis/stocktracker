import { createHash, randomBytes } from "crypto";

/**
 * RFC 7636 PKCE helpers.
 * Code verifier: high-entropy cryptographic random string between 43 and 128 chars.
 * Code challenge: BASE64URL(SHA256(code_verifier)).
 */

export function generateCodeVerifier(): string {
  return base64url(randomBytes(32));
}

export function deriveCodeChallenge(verifier: string): string {
  return base64url(createHash("sha256").update(verifier).digest());
}

export function verifyChallenge(verifier: string, challenge: string, method: string): boolean {
  if (method !== "S256") return false; // only S256 is allowed; "plain" is forbidden
  return deriveCodeChallenge(verifier) === challenge;
}

function base64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/=+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}
