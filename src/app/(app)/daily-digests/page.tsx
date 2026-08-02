"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import DailyDigestsView from "@/components/daily-digests/DailyDigestsView";
import { useFeatureFlagContext } from "@/lib/feature-flag-context";
import { useI18n } from "@/lib/i18n";

export default function DailyDigestsPage() {
  const router = useRouter();
  const { flags, isLoaded } = useFeatureFlagContext();
  const { t } = useI18n();
  useEffect(() => {
    if (isLoaded && !flags.daily_digests_enabled) {
      router.replace("/");
    }
  }, [isLoaded, flags.daily_digests_enabled, router]);

  if (!isLoaded || !flags.daily_digests_enabled) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <p className="text-sm text-[color:var(--muted)]" role="status">
          {t("loading")}
        </p>
      </div>
    );
  }

  return <DailyDigestsView />;
}
