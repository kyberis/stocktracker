import { describe, it, expect } from "vitest";
import {
  emailDomain,
  isTestAccountEmail,
  isTreefolioTestEmail,
  sqlExcludeTestAccountEmail,
  sqlIsTestAccountEmail,
} from "./test-accounts";

describe("test-accounts", () => {
  describe("emailDomain", () => {
    it("extracts domain case-insensitively", () => {
      expect(emailDomain("User@Trefolio.COM")).toBe("trefolio.com");
    });

    it("returns empty for malformed input", () => {
      expect(emailDomain("nope")).toBe("");
    });
  });

  describe("isTreefolioTestEmail", () => {
    it("matches any @trefolio.com address", () => {
      expect(isTreefolioTestEmail("test+foo@trefolio.com")).toBe(true);
      expect(isTreefolioTestEmail("marcos@trefolio.com")).toBe(true);
      expect(isTreefolioTestEmail("claude-mcp-review@TREFOLIO.COM")).toBe(true);
    });

    it("rejects non-trefolio domains", () => {
      expect(isTreefolioTestEmail("normal@gmail.com")).toBe(false);
      expect(isTreefolioTestEmail("user@example.com")).toBe(false);
    });
  });

  describe("isTestAccountEmail", () => {
    it("includes trefolio.com and example fixtures", () => {
      expect(isTestAccountEmail("staff@trefolio.com")).toBe(true);
      expect(isTestAccountEmail("a@example.com")).toBe(true);
      expect(isTestAccountEmail("b@test.example.com")).toBe(true);
    });

    it("excludes real customer domains", () => {
      expect(isTestAccountEmail("person@gmail.com")).toBe(false);
      expect(isTestAccountEmail("x@faketrefolio.com")).toBe(false);
    });
  });

  describe("sql helpers", () => {
    it("builds domain IN predicate", () => {
      const sql = sqlIsTestAccountEmail("u.email");
      expect(sql).toContain("u.email");
      expect(sql).toContain("'trefolio.com'");
      expect(sql).toContain("'example.com'");
      expect(sqlExcludeTestAccountEmail("u.email")).toMatch(/^NOT /);
    });
  });
});
