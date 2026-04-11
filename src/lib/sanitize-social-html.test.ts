import { describe, expect, it } from "vitest";
import { sanitizeSocialPostHtml } from "./sanitize-social-html";

describe("sanitizeSocialPostHtml", () => {
  it("strips script tags and inline handlers", () => {
    const dirty = `<p>Hi</p><script>alert(1)</script><img src=x onerror=alert(1)>`;
    const clean = sanitizeSocialPostHtml(dirty);
    expect(clean).not.toContain("<script");
    expect(clean).not.toContain("onerror");
    expect(clean).toContain("<p>Hi</p>");
  });

  it("allows safe formatting and links", () => {
    const html = `<p><strong>Bold</strong> and <a href="https://example.com" rel="noopener">link</a></p>`;
    expect(sanitizeSocialPostHtml(html)).toContain("https://example.com");
  });

  it("blocks javascript: URLs", () => {
    const html = `<a href="javascript:alert(1)">x</a>`;
    const out = sanitizeSocialPostHtml(html);
    expect(out).not.toContain("javascript:");
  });
});
