import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up Free — trefolio",
  description:
    "Create a free trefolio account to track your stock portfolio. Import from DEGIRO, IBKR, Trading 212, or Revolut. Real-time quotes and AI insights included.",
  alternates: { canonical: "https://trefolio.app/signup" },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
