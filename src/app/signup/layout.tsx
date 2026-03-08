import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up Free — trefolio",
  description:
    "Create a free trefolio account to track your stock portfolio. Import from DEGIRO, IBKR, Trading 212, or Revolut. Real-time quotes and AI insights included.",
  alternates: { canonical: "https://trefolio.com/signup" },
  openGraph: {
    title: "Sign Up Free — trefolio",
    description:
      "Create a free trefolio account to track your stock portfolio. Import from DEGIRO, IBKR, Trading 212, or Revolut. Real-time quotes and AI insights included.",
    url: "https://trefolio.com/signup",
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
    title: "Sign Up Free — trefolio",
    description:
      "Create a free trefolio account to track your stock portfolio. Import from DEGIRO, IBKR, Trading 212, or Revolut. Real-time quotes and AI insights included.",
    images: ["/screenshots/dashboard-overview.png"],
  },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
