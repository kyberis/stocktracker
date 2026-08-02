"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Dashboard from "@/components/Dashboard";
import { useFeatureFlagContext } from "@/lib/feature-flag-context";
import { useI18n } from "@/lib/i18n";

/**
 * Legacy classic dashboard (tabs / Market & Cash). Gated by `classic_home`.
 */
export default function ClassicHomePage() {
  const router = useRouter();
  const { flags, isLoaded } = useFeatureFlagContext();
  const { t } = useI18n();

  useEffect(() => {
    if (isLoaded && !flags.classic_home) {
      router.replace("/");
    }
  }, [isLoaded, flags.classic_home, router]);

  if (!isLoaded || !flags.classic_home) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <p className="text-sm text-[color:var(--muted)]" role="status">
          {t("loading")}
        </p>
      </div>
    );
  }

  return <Dashboard />;
}
