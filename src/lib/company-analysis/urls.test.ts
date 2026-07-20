import { describe, expect, it } from "vitest";
import { sanitizeHttpUrl } from "./urls";

describe("sanitizeHttpUrl", () => {
  it("keeps http(s)", () => {
    expect(sanitizeHttpUrl("https://example.com/a")).toBe("https://example.com/a");
    expect(sanitizeHttpUrl("http://example.com")).toBe("http://example.com/");
  });

  it("rejects dangerous schemes", () => {
    expect(sanitizeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeHttpUrl("data:text/html,hi")).toBeNull();
    expect(sanitizeHttpUrl("ftp://files.example.com")).toBeNull();
  });

  it("handles empty", () => {
    expect(sanitizeHttpUrl(null)).toBeNull();
    expect(sanitizeHttpUrl("  ")).toBeNull();
  });
});
