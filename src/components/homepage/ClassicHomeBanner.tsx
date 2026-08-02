"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

/** Shown on `/classic` so users can return to the default home. */
export default function ClassicHomeBanner() {
  const { t } = useI18n();

  return (
    <div className="card flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-teal-500/25 bg-teal-500/[0.06] p-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[color:var(--foreground)]">{t("classicHomeCtaTitle")}</p>
        <p className="text-xs text-[color:var(--muted)]">{t("classicHomeCtaSubtitle")}</p>
      </div>
      <Link
        href="/"
        className="min-h-9 shrink-0 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 text-xs font-semibold text-teal-700 dark:text-teal-300"
      >
        {t("classicHomeBackToNew")}
      </Link>
    </div>
  );
}
