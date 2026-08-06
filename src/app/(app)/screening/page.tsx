"use client";

import { Suspense } from "react";
import { ExposureEntry } from "@/components/screening/ExposureEntry";
import { ScreeningGate } from "@/components/screening/ScreeningGate";

export default function ScreeningEntryPage() {
  return (
    <ScreeningGate>
      <Suspense fallback={null}>
        <ExposureEntry />
      </Suspense>
    </ScreeningGate>
  );
}
