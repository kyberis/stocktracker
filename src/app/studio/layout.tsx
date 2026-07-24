import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "trefolio Studio — AI agents for finance, notes, CVs & sales",
  description:
    "Meet the trefolio studio: Warren (portfolio), Clara (personal finance), Will (smart notes), Renata (AI CV writing), and Roxana (WhatsApp B2B sales) — built on shared multi-agent infrastructure.",
  alternates: { canonical: "https://trefolio.com/studio" },
  openGraph: {
    title: "trefolio Studio — AI agents for finance, notes, CVs & sales",
    description:
      "Five AI agents on one shared platform: portfolio analysis, personal finance, smart notes, CV writing, and a live WhatsApp B2B case study.",
    url: "https://trefolio.com/studio",
    siteName: "trefolio",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/screenshots/studio-og.png",
        width: 1200,
        height: 630,
        alt: "trefolio Studio — five AI agents, one shared platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "trefolio Studio — AI agents for finance, notes, CVs & sales",
    description:
      "Five AI agents on one shared platform: Warren, Clara, Will, Renata, and Roxana.",
    images: ["/screenshots/studio-og.png"],
  },
};

const STUDIO_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "trefolio Studio",
  description:
    "Hub for the trefolio studio of AI agents: Warren, Clara, Will, Renata, and Roxana.",
  url: "https://trefolio.com/studio",
  isPartOf: {
    "@type": "WebSite",
    name: "trefolio",
    url: "https://trefolio.com",
  },
  mainEntity: {
    "@type": "ItemList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Warren",
        description: "Investment and portfolio analyst inside trefolio",
        url: "https://trefolio.com/signup",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Clara",
        description: "Personal finance AI assistant",
        url: "https://clara.trefolio.com",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Will",
        description: "Smart notes AI assistant",
        url: "https://will.trefolio.com",
      },
      {
        "@type": "ListItem",
        position: 4,
        name: "Renata",
        description: "AI CV writing assistant",
        url: "https://renata.trefolio.com",
      },
      {
        "@type": "ListItem",
        position: 5,
        name: "Roxana",
        description: "WhatsApp B2B sales agent — production case study at PL Packaging",
      },
    ],
  },
};

const BREADCRUMB_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "trefolio", item: "https://trefolio.com" },
    { "@type": "ListItem", position: 2, name: "Studio", item: "https://trefolio.com/studio" },
  ],
};

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={STUDIO_SCHEMA} />
      <JsonLd data={BREADCRUMB_SCHEMA} />
      {children}
    </>
  );
}
