"use client";

import { useFeatureFlag } from "@/lib/feature-flag-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function NetworkLayout({ children }: { children: React.ReactNode }) {
  const enabled = useFeatureFlag("social_network_enabled");
  const router = useRouter();

  useEffect(() => {
    if (!enabled) router.replace("/");
  }, [enabled, router]);

  if (!enabled) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
