import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "trefolio — Simple Portfolio Tracking with AI Insights",
  description:
    "Track your stock portfolio with real-time quotes, dividend projections, growth modeling, and AI-powered analysis. Free to start, Pro for €4.99/month. Built for European investors.",
  openGraph: {
    title: "trefolio — Simple Portfolio Tracking with AI Insights",
    description:
      "The simplest way to manage your stock portfolio. Real-time quotes, dividend tracking, growth projections, and AI analysis — for just €4.99/month.",
    type: "website",
  },
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
