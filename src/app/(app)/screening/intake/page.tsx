"use client";

import { Suspense } from "react";
import { IntakeChat } from "@/components/screening/IntakeChat";
import { ScreeningDevLogButton } from "@/components/screening/ScreeningDevLogButton";
import { ScreeningGate } from "@/components/screening/ScreeningGate";

export default function ScreeningIntakePage() {
  return (
    <ScreeningGate>
      <Suspense fallback={null}>
        <IntakeChat />
      </Suspense>
      <ScreeningDevLogButton />
    </ScreeningGate>
  );
}
