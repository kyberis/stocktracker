import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "trefolio Leaf — AMOLED Desk Display for Your Portfolio",
  description:
    "trefolio Leaf is a premium 2.41\" AMOLED desk display that shows your investment portfolio in real time. AI insights, 4 themes, live updates every 60 seconds. Limited to 10 units.",
  alternates: {
    canonical: "https://trefolio.com/leaf",
  },
  openGraph: {
    title: "trefolio Leaf — AMOLED Desk Display for Your Portfolio",
    description:
      "A premium 2.41\" AMOLED desk display that shows your portfolio in real time. AI insights with one tap, 4 beautiful themes, and updates every 60 seconds. Only 10 units — join the waitlist.",
    url: "https://trefolio.com/leaf",
    siteName: "trefolio",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/screenshots/device-t4s3.png",
        width: 1280,
        height: 800,
        alt: "trefolio Leaf AMOLED device showing a live portfolio dashboard on a desk",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "trefolio Leaf — AMOLED Desk Display for Your Portfolio",
    description:
      "A premium 2.41\" AMOLED desk display that shows your portfolio in real time. AI insights, 4 themes, live updates. Only 10 units — join the waitlist.",
    images: ["/screenshots/device-t4s3.png"],
  },
};

const PRODUCT_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "trefolio Leaf",
  description:
    "Premium 2.41\" AMOLED desk display that shows your investment portfolio in real time with AI-powered insights.",
  image: "https://trefolio.com/screenshots/device-t4s3.png",
  brand: { "@type": "Brand", name: "trefolio" },
  offers: [
    {
      "@type": "Offer",
      price: "99",
      priceCurrency: "EUR",
      name: "Device only",
      availability: "https://schema.org/PreOrder",
    },
    {
      "@type": "Offer",
      price: "139",
      priceCurrency: "EUR",
      name: "Leaf + 1 Year Pro",
      availability: "https://schema.org/PreOrder",
    },
  ],
};

export default function LeafLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd data={PRODUCT_SCHEMA} />
      {children}
    </>
  );
}
