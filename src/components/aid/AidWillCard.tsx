"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import type { WillRecentTagsHit } from "@/lib/ai/office/types";

interface Props {
  will?: WillRecentTagsHit;
  loading: boolean;
}

export default function AidWillCard({ will, loading }: Props) {
  const { t } = useI18n();

  const hasTags = Boolean(will?.available && (will.tags?.length ?? 0) > 0);
  const hasExcerpt = Boolean(will?.available && will?.excerpt?.trim() && !hasTags);

  return (
    <section className="card rounded-[var(--radius-card)] border border-violet-500/20 bg-violet-500/[0.04] p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">Will</span>
        <span className="text-[10px] uppercase tracking-wide text-[color:var(--muted)]">{t("aidInsightOnly")}</span>
      </div>

      {loading && (
        <p className="text-xs text-[color:var(--muted)]" role="status">
          {t("loading")}
        </p>
      )}

      {!loading && hasTags && (
        <>
          <div className="flex flex-wrap gap-1.5" role="list" aria-label={t("aidWillTagsLabel")}>
            {will!.tags.slice(0, 6).map((tag) => (
              <span
                key={tag.label}
                role="listitem"
                className="rounded-full border border-violet-500/25 px-2 py-0.5 text-[10px] text-violet-800 dark:text-violet-200"
              >
                {tag.label}
                {tag.date ? <span className="ml-1 text-[color:var(--muted)]">{tag.date.slice(0, 10)}</span> : null}
              </span>
            ))}
          </div>
          {will?.excerpt && (
            <p className="mt-2 text-xs leading-relaxed text-[color:var(--muted)] line-clamp-2">{will.excerpt}</p>
          )}
        </>
      )}

      {!loading && hasExcerpt && (
        <>
          {will?.noteDate && (
            <p className="mb-1 text-[10px] text-[color:var(--muted)]">{will.noteDate}</p>
          )}
          <p className="text-xs leading-relaxed text-[color:var(--foreground)]">{will?.excerpt}</p>
        </>
      )}

      {!loading && !hasTags && !hasExcerpt && (
        <>
          <p className="text-xs text-[color:var(--muted)]">{will?.note ?? t("aidWillPlaceholder")}</p>
          <Link
            href="https://will.trefolio.com"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-xs font-semibold text-violet-700 dark:text-violet-300 hover:underline"
          >
            {t("aidConnectWill")} →
          </Link>
        </>
      )}

      <p className="mt-2 text-[10px] text-[color:var(--muted)]">{t("aidThirdPartyDisclaimer")}</p>
    </section>
  );
}
