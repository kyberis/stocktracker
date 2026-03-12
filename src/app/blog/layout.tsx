import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: {
    template: "%s — trefolio blog",
    default: "Blog — trefolio",
  },
  description:
    "Guides, tutorials, and insights for European investors. Portfolio tracking tips, broker import guides, and AI analysis strategies.",
  alternates: { canonical: "https://trefolio.com/blog" },
  openGraph: {
    title: "Blog — trefolio",
    description:
      "Guides, tutorials, and insights for European investors. Portfolio tracking tips, broker import guides, and AI analysis strategies.",
    url: "https://trefolio.com/blog",
    siteName: "trefolio",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/screenshots/dashboard-overview.png",
        width: 1280,
        height: 800,
        alt: "trefolio portfolio dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog — trefolio",
    description:
      "Guides, tutorials, and insights for European investors. Portfolio tracking tips, broker import guides, and AI analysis strategies.",
    images: ["/screenshots/dashboard-overview.png"],
  },
};

const BLOG_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Blog",
  name: "trefolio Blog",
  url: "https://trefolio.com/blog",
  description:
    "Investment insights, portfolio management tips, and product updates from trefolio.",
  publisher: {
    "@type": "Organization",
    name: "trefolio",
    url: "https://trefolio.com",
    logo: "https://trefolio.com/icon.svg",
  },
  inLanguage: "en",
};

const BREADCRUMB_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "trefolio", item: "https://trefolio.com" },
    { "@type": "ListItem", position: 2, name: "Blog", item: "https://trefolio.com/blog" },
  ],
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={BLOG_SCHEMA} />
      <JsonLd data={BREADCRUMB_SCHEMA} />
      {children}
    </>
  );
}
