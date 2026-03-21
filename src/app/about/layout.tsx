import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "About — trefolio",
  description:
    "Meet the person behind trefolio. A systems engineer turned investor who built the portfolio tracker he always wanted — affordable, accurate, and built for European investors.",
  alternates: { canonical: "https://trefolio.com/about" },
  openGraph: {
    title: "About — trefolio",
    description:
      "Meet the person behind trefolio. A systems engineer turned investor who built the portfolio tracker he always wanted.",
    url: "https://trefolio.com/about",
    siteName: "trefolio",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "About — trefolio",
    description:
      "Meet the person behind trefolio. A systems engineer turned investor who built the portfolio tracker he always wanted.",
  },
};

const ABOUT_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "About trefolio",
  url: "https://trefolio.com/about",
  mainEntity: {
    "@type": "Person",
    name: "Marcos C. Suarez",
    jobTitle: "Founder",
    worksFor: {
      "@type": "Organization",
      name: "trefolio",
      url: "https://trefolio.com",
    },
  },
};

const BREADCRUMB_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "trefolio", item: "https://trefolio.com" },
    { "@type": "ListItem", position: 2, name: "About", item: "https://trefolio.com/about" },
  ],
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={ABOUT_SCHEMA} />
      <JsonLd data={BREADCRUMB_SCHEMA} />
      {children}
    </>
  );
}
