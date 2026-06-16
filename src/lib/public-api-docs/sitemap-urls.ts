import type { MetadataRoute } from "next";

import { listPublicDocSections } from "./sections";
import { getPublicDocsSiteUrl } from "./site";

/** Public HTML + machine-readable doc URLs for sitemap.xml and SEO. */
export function buildPublicDocsSitemapEntries(): MetadataRoute.Sitemap {
  const site = getPublicDocsSiteUrl();
  const now = new Date();
  const sectionEntries: MetadataRoute.Sitemap = listPublicDocSections().map((section) => ({
    url: `${site}/docs/${section.id}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.55,
  }));

  return [
    {
      url: `${site}/docs`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.65,
    },
    ...sectionEntries,
    {
      url: `${site}/api/docs`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    },
    ...listPublicDocSections().map((section) => ({
      url: section.url,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.45,
    })),
    {
      url: `${site}/openapi.json`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: `${site}/llms.txt`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.45,
    },
    {
      url: `${site}/.well-known/mcp.json`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];
}
