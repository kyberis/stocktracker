"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { useDeferredNetwork } from "@/hooks/useDeferredNetwork";
import type { AidFeedItem } from "@/lib/types";

export default function HomeFinPulseTeaser({ enabled }: { enabled: boolean }) {
  const { t } = useI18n();
  const deferred = useDeferredNetwork(enabled);
  const [item, setItem] = useState<AidFeedItem | null>(null);

  useEffect(() => {
    if (!enabled || !deferred) return;
    let cancelled = false;
    fetch("/api/aid/feed", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data) => {
        if (cancelled) return;
        const items = Array.isArray(data?.priority) ? data.priority : [];
        setItem(items[0] ?? null);
      })
      .catch(() => {
        if (!cancelled) setItem(null);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, deferred]);

  if (!item) return null;

  return (
    <section className="card rounded-[var(--radius-card)] p-4" aria-label={t("homeV2FinPulseTitle")}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-[color:var(--foreground)]">{t("homeV2FinPulseTitle")}</h2>
          <p className="text-xs text-[color:var(--muted)]">{t("homeV2FinPulseSubtitle")}</p>
        </div>
        <Link
          href="/aid"
          className="min-h-9 rounded-full border border-[color:var(--border)] px-3 text-xs font-semibold text-[color:var(--foreground)] hover:border-emerald-500/30"
        >
          {t("homeV2SeeBriefing")}
        </Link>
      </div>
      <div className="rounded-[var(--radius-control)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-3">
        <p className="text-sm font-medium text-[color:var(--foreground)]">{item.headline}</p>
        {item.label && (
          <p className="mt-1 text-[11px] text-[color:var(--muted)]">{item.label}</p>
        )}
      </div>
    </section>
  );
}
