import { CURRENT_VERSION } from "@/lib/release-version";

import { buildPublicOpenApiDocument } from "./openapi";
import { getPublicDocSection, listPublicDocSections } from "./sections";
import { getPublicDocsSiteUrl } from "./site";

export function buildPublicDocsIndex() {
  const site = getPublicDocsSiteUrl();
  return {
    name: "trefolio",
    version: CURRENT_VERSION,
    description:
      "Public integration documentation for LLMs, MCP clients, and external agents. " +
      "Includes Warren MOAT (Buffett-style competitive advantage analysis).",
    openapi: `${site}/openapi.json`,
    mcp: `${site}/.well-known/mcp.json`,
    ai_plugin: `${site}/.well-known/ai-plugin.json`,
    llms_txt: `${site}/llms.txt`,
    sections: listPublicDocSections(),
  };
}

export { buildPublicOpenApiDocument, getPublicDocSection, listPublicDocSections, getPublicDocsSiteUrl };
export { isPublicDocSectionId } from "./sections";
