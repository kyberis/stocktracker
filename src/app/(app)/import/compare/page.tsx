import type { Metadata } from "next";
import ImportCompareContent from "./compare-content";

export const metadata: Metadata = {
  title: "Broker Sync vs CSV Import | trefolio",
  description: "Compare broker API sync and CSV import methods to find the best way to get detailed transaction data into trefolio.",
};

export default function ImportComparePage() {
  return <ImportCompareContent />;
}
