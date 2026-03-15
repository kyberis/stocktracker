import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("hashPassword", () => {
  it("returns a bcrypt hash string", async () => {
    const hash = await hashPassword("secret123");
    expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/);
  });

  it("produces different hashes for the same input (salt)", async () => {
    const h1 = await hashPassword("same");
    const h2 = await hashPassword("same");
    expect(h1).not.toBe(h2);
  });
});

describe("verifyPassword", () => {
  it("returns true for matching password", async () => {
    const hash = await hashPassword("correct");
    expect(await verifyPassword("correct", hash)).toBe(true);
  });

  it("returns false for wrong password", async () => {
    const hash = await hashPassword("correct");
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});
