"use client";

import { Suspense } from "react";
import CryptoMarket from "@/components/CryptoMarket";

export default function CryptoPage() {
  return (
    <Suspense
      fallback={
        <main className="max-w-6xl mx-auto px-4 py-12 text-center text-gray-500 dark:text-slate-400 text-sm">
          Loading…
        </main>
      }
    >
      <CryptoMarket />
    </Suspense>
  );
}
