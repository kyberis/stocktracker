"use client";

import { createPortal } from "react-dom";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useI18n } from "@/lib/i18n";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

function ExplainerSection({ title, body }: { title: string; body: string }) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-[color:var(--foreground)]">{title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-[color:var(--muted)]">{body}</p>
    </section>
  );
}

export default function PerformanceMatrixExplainerModal({ isOpen, onClose }: Props) {
  const focusTrapRef = useFocusTrap(isOpen, onClose);
  const { t } = useI18n();

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm dark:bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="matrix-explainer-title"
        className="relative flex max-h-[min(90dvh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-xl sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[color:var(--border)] px-5 py-4">
          <h2 id="matrix-explainer-title" className="text-base font-semibold text-[color:var(--foreground)]">
            {t("matrixExplainerTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg text-[color:var(--muted)] transition-colors hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--foreground)]"
            aria-label={t("close")}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto px-5 py-4">
          <p className="text-xs leading-relaxed text-[color:var(--muted)]">{t("matrixExplainerIntro")}</p>

          <ExplainerSection title={t("matrixExplainerTodayTitle")} body={t("matrixExplainerTodayBody")} />
          <ExplainerSection title={t("matrixExplainerAllAssetsTitle")} body={t("matrixExplainerAllAssetsBody")} />
          <ExplainerSection title={t("matrixExplainerPeriodsTitle")} body={t("matrixExplainerPeriodsBody")} />
          <ExplainerSection title={t("matrixExplainerDisplayTitle")} body={t("matrixExplainerDisplayBody")} />

          <p className="border-t border-[color:var(--border)] pt-4 text-[10px] leading-relaxed text-[color:var(--muted)]">
            {t("growthCaveat")}
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
