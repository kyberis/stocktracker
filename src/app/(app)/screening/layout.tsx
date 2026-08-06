import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Investment screening",
  robots: { index: false },
};

export default function ScreeningLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
