import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/landing", "/privacy", "/terms", "/login", "/signup", "/blog", "/p/", "/demo"],
        disallow: ["/api/", "/admin/", "/developer/"],
      },
    ],
    sitemap: "https://trefolio.com/sitemap.xml",
  };
}
