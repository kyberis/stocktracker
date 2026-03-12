import { JsonLd } from "@/components/JsonLd";

const PAGE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Terms of Service",
  url: "https://trefolio.com/terms",
  description:
    "trefolio Terms of Service. Subscription terms, acceptable use, financial disclaimers, and liability limitations.",
  publisher: { "@type": "Organization", name: "trefolio", url: "https://trefolio.com" },
  dateModified: "2026-03-08",
  inLanguage: "en",
};

const BREADCRUMB_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "trefolio", item: "https://trefolio.com" },
    { "@type": "ListItem", position: 2, name: "Terms of Service", item: "https://trefolio.com/terms" },
  ],
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={PAGE_SCHEMA} />
      <JsonLd data={BREADCRUMB_SCHEMA} />
      {children}
    </>
  );
}
