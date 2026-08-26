"use client";

import { useParams } from "next/navigation";
import { RealEstateGate } from "@/components/real-estate-screening/RealEstateGate";
import { RealEstateRunProgress } from "@/components/real-estate-screening/RealEstateRunProgress";

export default function RealEstateRunPage() {
  const params = useParams<{ runId: string }>();
  const runId = Array.isArray(params?.runId) ? params.runId[0] : (params?.runId ?? "");
  return (
    <RealEstateGate>
      <RealEstateRunProgress runId={runId} />
    </RealEstateGate>
  );
}
