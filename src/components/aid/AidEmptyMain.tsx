"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { usePortfolioCommand } from "@/contexts/portfolio-command-context";

export default function AidEmptyMain() {
  const { t } = useI18n();
  const { gatedAdd } = usePortfolioCommand();

  return (
    <div className="space-y-4">
      <section className="card rounded-[var(--radius-card)] p-5 text-center">
        <div className="text-3xl font-semibold tabular-nums text-[color:var(--muted)]">€0</div>
        <h2 className="mt-3 text-lg font-bold text-[color:var(--foreground)]">{t("aidEmptyWelcome")}</h2>
        <p className="mt-1 text-sm text-[color:var(--muted)]">{t("aidEmptySubtitle")}</p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/import"
            className="min-h-11 rounded-[var(--radius-button)] bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            {t("emptyStateImport")}
          </Link>
          <button
            type="button"
            onClick={() => gatedAdd("stock")}
            className="min-h-11 rounded-[var(--radius-button)] border border-[color:var(--border)] px-4 py-2.5 text-sm font-semibold text-[color:var(--foreground)]"
          >
            {t("addStock")}
          </button>
          <Link
            href="/demo"
            className="min-h-11 rounded-[var(--radius-button)] border border-violet-500/30 bg-violet-500/10 px-4 py-2.5 text-sm font-semibold text-violet-700 dark:text-violet-300"
          >
            {t("aidEmptyDemo")}
          </Link>
        </div>
      </section>

      <section className="card rounded-[var(--radius-card)] p-4 opacity-60 pointer-events-none" aria-hidden>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--muted)] mb-2">
          {t("aidColType")}
        </div>
        <div className="h-24 rounded-lg border border-dashed border-[color:var(--border)] bg-[color:var(--surface-soft)]" />
      </section>

      <section className="card rounded-[var(--radius-card)] p-4">
        <h3 className="text-sm font-semibold text-[color:var(--foreground)]">{t("aidNewsTitle")}</h3>
        <p className="mt-2 text-sm text-[color:var(--muted)]">{t("aidNewsEmpty")}</p>
      </section>

      <section className="card rounded-[var(--radius-card)] p-4">
        <h3 className="text-sm font-semibold text-[color:var(--foreground)]">{t("aidPreviewTitle")}</h3>
        <p className="mt-1 text-xs text-[color:var(--muted)]">{t("aidPreviewDesc")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[t("aidPreviewMovers"), t("aidPreviewAlerts"), t("aidPreviewCalendar")].map((label) => (
            <span
              key={label}
              className="rounded-full border border-[color:var(--border)] px-2.5 py-1 text-[10px] text-[color:var(--muted)]"
            >
              {label}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
