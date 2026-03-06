import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log In — trefolio",
  description:
    "Log in to trefolio to track your stock portfolio. Real-time quotes, broker imports, AI analysis, and dividend projections for European investors.",
  alternates: { canonical: "https://trefolio.app/login" },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
