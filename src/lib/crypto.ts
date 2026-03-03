import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

function deriveKey(): Buffer {
  const secret =
    process.env.APP_SESSION_SECRET || "stocktracker-dev-session-secret-change-me";
  return createHash("sha256").update(secret).digest();
}

export function encrypt(plaintext: string): string {
  if (!plaintext) return "";
  const key = deriveKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decrypt(ciphertext: string): string {
  if (!ciphertext) return "";
  try {
    const buf = Buffer.from(ciphertext, "base64");
    if (buf.length < IV_LEN + TAG_LEN) return ciphertext;
    const key = deriveKey();
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const encrypted = buf.subarray(IV_LEN + TAG_LEN);
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final("utf8");
  } catch {
    // If decryption fails, the value is likely still in plaintext (pre-migration).
    return ciphertext;
  }
}
