import type { Metadata } from "next";
import AidDashboard from "@/components/aid/AidDashboard";

export const metadata: Metadata = {
  title: "AID — Advanced Investor Dashboard",
  robots: { index: false },
};

export default function AidPage() {
  return <AidDashboard />;
}
