import { Suspense } from "react";

import AnomaliesTab from "../tabs/AnomaliesTab";

export default function AdminAnomaliesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-gray-500">Loading anomalies…</p>}>
      <AnomaliesTab />
    </Suspense>
  );
}
