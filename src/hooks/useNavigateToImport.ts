"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { warrenImportHref } from "@/lib/import-entry";

/** Navigate into the existing `/import` wizard (SnapTrade / CSV / manual). */
export function useNavigateToImport() {
  const router = useRouter();
  const go = useCallback((href: string) => router.push(href), [router]);

  return useMemo(
    () => ({
      onSelectSync: (slug: string) => go(warrenImportHref({ type: "snaptrade", brokerSlug: slug })),
      onSelectTradeRepublic: () =>
        go(
          warrenImportHref({
            type: "csv",
            guideId: "trade_republic",
            format: "trade_republic",
          }),
        ),
      onCsvFallback: (typedName: string) =>
        go(warrenImportHref({ type: "csv", guideId: "simple_csv", query: typedName })),
      onRequestBroker: (typedName: string) =>
        go(warrenImportHref({ type: "csv", guideId: "simple_csv", query: typedName })),
      onManualAdd: () => go(warrenImportHref({ type: "manual" })),
    }),
    [go],
  );
}
