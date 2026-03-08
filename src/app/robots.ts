import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/landing", "/privacy", "/terms", "/login", "/signup", "/blog"],
        disallow: ["/api/", "/admin/", "/developer/"],
      },
    ],
    sitemap: "https://trefolio.com/sitemap.xml",
  };
}
