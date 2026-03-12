import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Interactive Demo — trefolio",
  description:
    "Try trefolio with a sample portfolio. No signup required. See the dashboard, performance metrics, dividends, and AI analysis in action.",
  alternates: { canonical: "https://trefolio.com/demo" },
  openGraph: {
    title: "Interactive Demo — trefolio",
    description:
      "Try trefolio with a sample portfolio. No signup required. See the dashboard, performance metrics, dividends, and AI analysis in action.",
    url: "https://trefolio.com/demo",
    siteName: "trefolio",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/screenshots/dashboard-overview.png",
        width: 1280,
        height: 800,
        alt: "trefolio demo portfolio dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Interactive Demo — trefolio",
    description:
      "Try trefolio with a sample portfolio. No signup required. See the dashboard, performance metrics, dividends, and AI analysis in action.",
    images: ["/screenshots/dashboard-overview.png"],
  },
};

const DEMO_APP_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "trefolio Demo",
  applicationCategory: "FinanceApplication",
  url: "https://trefolio.com/demo",
  description:
    "Try trefolio with a sample portfolio. No signup required. See the dashboard, performance metrics, dividends, and AI analysis in action.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "EUR",
    name: "Free Demo",
    description: "Full dashboard experience with sample data, no account required",
  },
};

const BREADCRUMB_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "trefolio", item: "https://trefolio.com" },
    { "@type": "ListItem", position: 2, name: "Interactive Demo", item: "https://trefolio.com/demo" },
  ],
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={DEMO_APP_SCHEMA} />
      <JsonLd data={BREADCRUMB_SCHEMA} />
      {children}
    </>
  );
}
