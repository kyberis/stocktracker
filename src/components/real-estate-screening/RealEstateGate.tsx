"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFeatureFlagContext } from "@/lib/feature-flag-context";
import { useI18n } from "@/lib/i18n";

export function RealEstateGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { flags, isLoaded } = useFeatureFlagContext();
  const { t } = useI18n();
  const enabled = Boolean(flags.real_estate_screening_enabled);

  useEffect(() => {
    if (isLoaded && !enabled) router.replace("/");
  }, [isLoaded, enabled, router]);

  if (!isLoaded || !enabled) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <p className="text-sm text-[color:var(--muted)]" role="status">
          {t("loading")}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
