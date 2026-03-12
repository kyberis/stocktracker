import { JsonLd } from "@/components/JsonLd";

const PAGE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Privacy Policy",
  url: "https://trefolio.com/privacy",
  description:
    "trefolio is a GDPR-compliant portfolio tracker. Learn how we collect, process, and protect your personal data.",
  publisher: { "@type": "Organization", name: "trefolio", url: "https://trefolio.com" },
  dateModified: "2026-03-08",
  inLanguage: "en",
};

const BREADCRUMB_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "trefolio", item: "https://trefolio.com" },
    { "@type": "ListItem", position: 2, name: "Privacy Policy", item: "https://trefolio.com/privacy" },
  ],
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={PAGE_SCHEMA} />
      <JsonLd data={BREADCRUMB_SCHEMA} />
      {children}
    </>
  );
}
