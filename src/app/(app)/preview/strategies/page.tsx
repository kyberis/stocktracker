import type { Metadata } from "next";
import StrategiesMockupPreview from "@/components/StrategiesMockupPreview";

export const metadata: Metadata = {
  title: "Strategies — design preview",
  robots: { index: false, follow: false },
};

export default function StrategiesPreviewPage() {
  return <StrategiesMockupPreview />;
}
