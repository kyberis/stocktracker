"use client";

import { useI18n } from "@/lib/i18n";

export default function AidPageFooter() {
  const { t } = useI18n();

  return (
    <footer className="mt-6 space-y-1 border-t border-[color:var(--border)] pt-4 text-[10px] leading-relaxed text-[color:var(--muted)]">
      <p>{t("financialDataDisclaimer")}</p>
      <p>{t("aiDisclaimer")}</p>
      <p>{t("aidPageDisclaimer")}</p>
    </footer>
  );
}
