"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useI18n } from "@/lib/i18n";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  ariaLabel?: string;
  children: React.ReactNode;
}

export default function AidModalShell({ open, onClose, title, ariaLabel, children }: Props) {
  const [mounted, setMounted] = useState(false);
  const trapRef = useFocusTrap(open, onClose);
  const { t } = useI18n();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        aria-label={t("close")}
        onClick={onClose}
      />
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? title}
        className="glass-overlay relative z-[121] flex max-h-[min(92vh,720px)] w-full sm:max-w-lg flex-col overflow-hidden rounded-t-[var(--radius-card)] sm:rounded-[var(--radius-card)] shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-[color:var(--border)] px-4 py-3 shrink-0">
          <h2 id="aid-modal-title" className="text-sm font-semibold text-[color:var(--foreground)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 rounded-xl border border-[color:var(--border)] text-[color:var(--foreground)] hover:bg-[color:var(--surface-soft)]"
            aria-label={t("close")}
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
