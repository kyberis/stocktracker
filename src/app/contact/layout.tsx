import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Contact Us — trefolio",
  description:
    "Get in touch with the trefolio team. Questions about portfolio tracking, broker imports, AI analysis, or your subscription? We typically respond within 24 hours.",
  alternates: { canonical: "https://trefolio.com/contact" },
  openGraph: {
    title: "Contact Us — trefolio",
    description:
      "Get in touch with the trefolio team. Questions about portfolio tracking, broker imports, AI analysis, or your subscription? We typically respond within 24 hours.",
    url: "https://trefolio.com/contact",
    siteName: "trefolio",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Contact Us — trefolio",
    description:
      "Get in touch with the trefolio team. Questions about portfolio tracking, broker imports, or your subscription?",
  },
};

const CONTACT_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "Contact trefolio",
  url: "https://trefolio.com/contact",
  mainEntity: {
    "@type": "Organization",
    name: "trefolio",
    email: "support@trefolio.com",
    contactPoint: {
      "@type": "ContactPoint",
      email: "support@trefolio.com",
      contactType: "customer support",
      availableLanguage: ["English", "Spanish"],
    },
  },
};

const BREADCRUMB_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "trefolio", item: "https://trefolio.com" },
    { "@type": "ListItem", position: 2, name: "Contact", item: "https://trefolio.com/contact" },
  ],
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={CONTACT_SCHEMA} />
      <JsonLd data={BREADCRUMB_SCHEMA} />
      {children}
    </>
  );
}
