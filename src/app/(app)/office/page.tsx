import type { Metadata } from "next";
import OfficePageClient from "@/components/office/OfficePageClient";

export const metadata: Metadata = {
  title: "Oficina de agentes",
  robots: { index: false },
};

export default function OfficePage() {
  return <OfficePageClient />;
}
