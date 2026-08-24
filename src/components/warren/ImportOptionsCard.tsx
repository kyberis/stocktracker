"use client";

import type { ImportOptionsPartData, WarrenImportMethodId } from "@/lib/ai/warren/types";
import { useI18n } from "@/lib/i18n";

interface Props {
  data: ImportOptionsPartData;
  disabled?: boolean;
  onChoose: (id: WarrenImportMethodId) => void;
}

export default function ImportOptionsCard({ data, disabled, onChoose }: Props) {
  const { t } = useI18n();
  const labels: Record<WarrenImportMethodId, { title: string; desc: string }> = {
    csv: { title: t("warrenImportCsvTitle"), desc: t("warrenImportCsvDesc") },
    snaptrade: { title: t("warrenImportBrokerTitle"), desc: t("warrenImportBrokerDesc") },
    ai: { title: t("warrenImportAiTitle"), desc: t("warrenImportAiDesc") },
  };

  return (
    <div
      className="ml-9 max-w-[420px] rounded-2xl border border-amber-400/40 bg-white p-3.5 text-gray-900 dark:bg-slate-800/50 dark:text-slate-100"
      data-testid="warren-import-options"
    >
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-400">
        {t("warrenImportOptionsEyebrow")}
      </p>
      <p className="mb-3 text-[15px] font-bold leading-snug">{t("warrenImportOptionsTitle")}</p>
      <ul className="space-y-2">
        {data.methods.map((method) => {
          const copy = labels[method.id];
          return (
            <li key={method.id}>
              <button
                type="button"
                disabled={disabled || !method.available}
                onClick={() => onChoose(method.id)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-left transition-colors hover:border-amber-500/60 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.12]"
              >
                <span className="block text-xs font-semibold">{copy.title}</span>
                <span className="mt-0.5 block text-[11px] text-gray-600 dark:text-slate-400">
                  {method.available ? copy.desc : method.upgradeHint || copy.desc}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
