import { describe, expect, it } from "vitest";
import { encrypt, decrypt, tryDecryptOrPlaintext } from "./crypto";

describe("encrypt / decrypt", () => {
  it("round-trips a plain string", () => {
    const original = "sk-test-key-abc123";
    const encrypted = encrypt(original);
    expect(encrypted).not.toBe(original);
    expect(decrypt(encrypted)).toBe(original);
  });

  it("produces different ciphertext each time (random IV)", () => {
    const plain = "same-key";
    const a = encrypt(plain);
    const b = encrypt(plain);
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe(plain);
    expect(decrypt(b)).toBe(plain);
  });

  it("returns empty string for empty input", () => {
    expect(encrypt("")).toBe("");
    expect(decrypt("")).toBe("");
  });

  it("throws when decrypting invalid data", () => {
    expect(() => decrypt("not-valid-base64!@@")).toThrow();
  });

  it("throws when ciphertext is too short", () => {
    expect(() => decrypt("dG9vc2hvcnQ=")).toThrow("Ciphertext too short");
  });

  it("handles unicode characters", () => {
    const original = "clave-secreta-año-2026-🔑";
    expect(decrypt(encrypt(original))).toBe(original);
  });

  it("handles very long strings", () => {
    const original = "x".repeat(10_000);
    expect(decrypt(encrypt(original))).toBe(original);
  });
});

describe("tryDecryptOrPlaintext", () => {
  it("decrypts valid ciphertext", () => {
    const original = "my-api-key";
    const encrypted = encrypt(original);
    expect(tryDecryptOrPlaintext(encrypted)).toBe(original);
  });

  it("returns plaintext for invalid ciphertext (migration fallback)", () => {
    const plaintext = "old-unencrypted-key";
    expect(tryDecryptOrPlaintext(plaintext)).toBe(plaintext);
  });

  it("returns empty string for empty input", () => {
    expect(tryDecryptOrPlaintext("")).toBe("");
  });
});
