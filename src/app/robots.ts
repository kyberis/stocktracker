import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/landing", "/privacy", "/terms", "/login", "/signup", "/blog", "/p/", "/demo", "/contact", "/releasenotes", "/leaf", "/about"],
        disallow: ["/api/", "/admin/", "/developer/"],
      },
      {
        userAgent: ["GPTBot", "ChatGPT-User", "Google-Extended", "PerplexityBot", "ClaudeBot", "Applebot-Extended"],
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: ["/api/", "/admin/"],
      },
    ],
    sitemap: "https://trefolio.com/sitemap.xml",
  };
}
