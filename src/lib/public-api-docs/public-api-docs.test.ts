import { describe, expect, it } from "vitest";

import {
  buildPublicDocsIndex,
  buildPublicOpenApiDocument,
  getPublicDocSection,
  isPublicDocSectionId,
} from "@/lib/public-api-docs";

describe("public api docs", () => {
  it("builds docs index with warren-moat section", () => {
    const index = buildPublicDocsIndex();
    expect(index.sections.some((s) => s.id === "warren-moat")).toBe(true);
    expect(index.openapi).toContain("/openapi.json");
  });

  it("returns warren-moat section with endpoints", () => {
    expect(isPublicDocSectionId("warren-moat")).toBe(true);
    expect(isPublicDocSectionId("claude-desktop")).toBe(true);
    expect(isPublicDocSectionId("invalid")).toBe(false);
    const section = getPublicDocSection("warren-moat");
    const endpoints = section?.content.endpoints as { path: string }[];
    expect(endpoints.some((e) => e.path === "/api/stock-evaluation")).toBe(true);
    const claude = getPublicDocSection("claude-desktop");
    expect(claude?.content.problem).toBeDefined();
    expect(claude?.content.claude_desktop_config).toBeDefined();
  });

  it("openapi includes MOAT paths and x-documentation", () => {
    const spec = buildPublicOpenApiDocument() as Record<string, unknown>;
    const paths = spec.paths as Record<string, unknown>;
    expect(paths["/api/stock-evaluation"]).toBeDefined();
    expect(paths["/api/moat-screener"]).toBeDefined();
    const xDoc = spec["x-documentation"] as { warren_moat: string };
    expect(xDoc.warren_moat).toContain("/api/docs/warren-moat");
  });
});
