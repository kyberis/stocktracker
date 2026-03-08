import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log In — trefolio",
  description:
    "Log in to trefolio to track your stock portfolio. Real-time quotes, broker imports, AI analysis, and dividend projections for European investors.",
  alternates: { canonical: "https://trefolio.com/login" },
  openGraph: {
    title: "Log In — trefolio",
    description:
      "Log in to trefolio to track your stock portfolio. Real-time quotes, broker imports, AI analysis, and dividend projections for European investors.",
    url: "https://trefolio.com/login",
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
    title: "Log In — trefolio",
    description:
      "Log in to trefolio to track your stock portfolio. Real-time quotes, broker imports, AI analysis, and dividend projections for European investors.",
    images: ["/screenshots/dashboard-overview.png"],
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
