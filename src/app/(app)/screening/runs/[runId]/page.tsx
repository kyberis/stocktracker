"use client";

import { useParams } from "next/navigation";
import { RunProgress } from "@/components/screening/RunProgress";
import { ScreeningGate } from "@/components/screening/ScreeningGate";

export default function ScreeningRunPage() {
  const params = useParams<{ runId: string }>();
  const runId = Array.isArray(params?.runId) ? params.runId[0] : (params?.runId ?? "");

  return (
    <ScreeningGate>
      <RunProgress runId={runId} />
    </ScreeningGate>
  );
}
