import type { Metadata } from "next";
import HomeV2Dashboard from "@/components/homepage/HomeV2Dashboard";

export const metadata: Metadata = {
  title: "Home v2",
  robots: { index: false },
};

export default function HomeV2Page() {
  return <HomeV2Dashboard />;
}
