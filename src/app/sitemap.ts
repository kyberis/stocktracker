import type { MetadataRoute } from "next";
import { getAllPosts, getAllLocalizedSlugs, getPostsByLang } from "@/lib/blog";
import { buildPublicDocsSitemapEntries } from "@/lib/public-api-docs";
import "@/lib/blog-posts";
import "@/lib/blog-posts-es";
import "@/lib/blog-posts-fr";
import "@/lib/blog-posts-de";
import "@/lib/blog-posts-it";
import "@/lib/blog-posts-pt";
import "@/lib/blog-posts-nl";
import "@/lib/blog-posts-pl";
import "@/lib/blog-posts-sv";
import "@/lib/blog-posts-da";
import "@/lib/blog-posts-fi";

const BLOG_LANGS = ["es", "fr", "de", "it", "pt", "nl", "pl", "sv", "da", "fi"];

export default function sitemap(): MetadataRoute.Sitemap {
  const blogEntries: MetadataRoute.Sitemap = getAllPosts().map((post) => ({
    url: `https://trefolio.com/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const localizedBlogEntries: MetadataRoute.Sitemap = getAllLocalizedSlugs().map(({ lang, slug }) => ({
    url: `https://trefolio.com/blog/${lang}/${slug}`,
    lastModified: new Date("2026-03-13"),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const localizedBlogIndexes: MetadataRoute.Sitemap = BLOG_LANGS.map((lang) => ({
    url: `https://trefolio.com/blog/${lang}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  return [
    {
      url: "https://trefolio.com",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: "https://trefolio.com/blog",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...blogEntries,
    ...localizedBlogIndexes,
    ...localizedBlogEntries,
    {
      url: "https://trefolio.com/demo",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://trefolio.com/signup",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: "https://trefolio.com/login",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: "https://trefolio.com/privacy",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.2,
    },
    {
      url: "https://trefolio.com/terms",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.2,
    },
    {
      url: "https://trefolio.com/releasenotes",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.4,
    },
    {
      url: "https://trefolio.com/contact",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: "https://trefolio.com/leaf",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: "https://trefolio.com/landing",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: "https://trefolio.com/about",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    ...buildPublicDocsSitemapEntries(),
  ];
}
