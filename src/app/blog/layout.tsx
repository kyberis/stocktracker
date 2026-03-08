import type { Metadata } from "next";

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

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
