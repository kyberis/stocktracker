import type { MetadataRoute } from "next";

/**
 * Marketing and documentation paths crawlers may index. Everything else under
 * the root is the authenticated app or internal surfaces.
 */
const PUBLIC_ALLOW = [
  "/",
  "/landing",
  "/privacy",
  "/terms",
  "/login",
  "/signup",
  "/blog",
  "/p/",
  "/demo",
  "/contact",
  "/releasenotes",
  "/leaf",
  "/about",
  "/studio",
  "/analisis",
  "/analisis/",
  "/docs",
  "/docs/",
  "/api/docs",
  "/api/docs/",
  "/llms.txt",
  "/llms-full.txt",
  "/openapi.json",
  "/.well-known/oauth-protected-resource",
  "/.well-known/mcp.json",
];

const PRIVATE_DISALLOW = ["/api/", "/admin/", "/developer/"];

/**
 * Same user-agents as Will and Clara so AI answer engines can fetch marketing
 * pages (landing, blog, llms) — not only the homepage.
 *
 * References:
 *  - GPTBot, OAI-SearchBot, ChatGPT-User: https://platform.openai.com/docs/bots
 *  - ClaudeBot, Claude-Web, anthropic-ai: https://www.anthropic.com/transparency-center
 *  - PerplexityBot, Perplexity-User: https://docs.perplexity.ai/guides/bots
 *  - Google-Extended: https://blog.google/technology/ai/an-update-on-web-publisher-controls/
 *  - Applebot-Extended: https://support.apple.com/en-us/119829
 */
const AI_BOTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot",
  "Applebot-Extended",
  "Amazonbot",
  "Bytespider",
  "CCBot",
  "cohere-ai",
  "Cohere-AI",
  "Meta-ExternalAgent",
  "DuckAssistBot",
  "MistralAI-User",
  "YouBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: PUBLIC_ALLOW,
        disallow: PRIVATE_DISALLOW,
      },
      {
        userAgent: AI_BOTS,
        allow: PUBLIC_ALLOW,
        disallow: PRIVATE_DISALLOW,
      },
    ],
    sitemap: "https://trefolio.com/sitemap.xml",
  };
}
