import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portfolio Performance — trefolio",
  description:
    "Track your portfolio value evolution and performance over time with interactive charts, benchmark comparisons, and asset breakdown.",
  openGraph: {
    title: "Portfolio Performance — trefolio",
    description:
      "Interactive portfolio value and performance charts with benchmark comparisons.",
  },
};

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
