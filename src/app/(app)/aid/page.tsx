import type { Metadata } from "next";
import AidDashboard from "@/components/aid/AidDashboard";

export const metadata: Metadata = {
  title: "Investor Briefing",
  robots: { index: false },
};

export default function AidPage() {
  return <AidDashboard />;
}
