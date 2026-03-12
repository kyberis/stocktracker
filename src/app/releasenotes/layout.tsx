import { JsonLd } from "@/components/JsonLd";

const BREADCRUMB_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "trefolio", item: "https://trefolio.com" },
    { "@type": "ListItem", position: 2, name: "Release Notes", item: "https://trefolio.com/releasenotes" },
  ],
};

export default function ReleaseNotesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={BREADCRUMB_SCHEMA} />
      {children}
    </>
  );
}
