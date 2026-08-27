import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Real-estate zone screening",
  robots: { index: false },
};

export default function RealEstateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
