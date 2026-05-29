"use client";

import { useI18n } from "@/lib/i18n";

interface Props {
  editing: boolean;
  saving: boolean;
  onToggleEditing: () => void;
  onReset: () => void;
}

export default function AidLayoutCustomizeBar({
  editing,
  saving,
  onToggleEditing,
  onReset,
}: Props) {
  const { t } = useI18n();

  return (
    <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
      {editing ? (
        <p className="mr-auto text-[11px] text-[color:var(--muted)]">{t("aidLayoutDragHint")}</p>
      ) : null}
      {editing ? (
        <button
          type="button"
          onClick={onReset}
          className="min-h-9 rounded-full border border-[color:var(--border)] px-3 text-[11px] font-semibold text-[color:var(--muted)] hover:text-[color:var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
        >
          {t("aidLayoutReset")}
        </button>
      ) : null}
      <button
        type="button"
        onClick={onToggleEditing}
        aria-pressed={editing}
        className={`min-h-9 rounded-full px-3 text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 ${
          editing
            ? "bg-emerald-600 text-white hover:bg-emerald-500"
            : "border border-[color:var(--border)] text-[color:var(--foreground)] hover:bg-[color:var(--surface-soft)]"
        }`}
      >
        {editing ? t("aidLayoutDone") : t("aidCustomizeLayout")}
        {saving ? "…" : ""}
      </button>
    </div>
  );
}
