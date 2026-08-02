"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { useTrack } from "@/lib/use-track";

export default function HomeMcpCta() {
  const { t } = useI18n();
  const track = useTrack();

  return (
    <section
      className="card rounded-[var(--radius-card)] border border-violet-500/30 bg-gradient-to-br from-violet-500/[0.08] to-transparent p-4"
      aria-label={t("homeV2McpTitle")}
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className="grid h-7 w-7 place-items-center rounded-lg bg-[#d97757] text-sm font-extrabold text-white"
          aria-hidden
        >
          C
        </span>
        <div>
          <h2 className="text-sm font-semibold text-[color:var(--foreground)]">{t("homeV2McpTitle")}</h2>
          <p className="text-[11px] text-[color:var(--muted)]">{t("homeV2McpSubtitle")}</p>
        </div>
      </div>
      <p className="mb-3 text-xs text-[color:var(--muted)]">{t("homeV2McpBody")}</p>
      <ol className="mb-3 list-decimal space-y-1 pl-4 text-xs text-[color:var(--muted)]">
        <li>{t("homeV2McpStep1")}</li>
        <li>{t("homeV2McpStep2")}</li>
        <li>{t("homeV2McpStep3")}</li>
      </ol>
      <Link
        href="/profile?section=mcp"
        onClick={() => track("home_v2_mcp_cta_clicked")}
        className="btn-primary flex min-h-11 w-full items-center justify-center rounded-[14px] bg-[#d97757] text-sm font-semibold text-white hover:opacity-90"
      >
        {t("homeV2McpCta")}
      </Link>
      <p className="mt-2 text-center text-[11px] text-[color:var(--muted)]">{t("homeV2McpAlsoCursor")}</p>
    </section>
  );
}
