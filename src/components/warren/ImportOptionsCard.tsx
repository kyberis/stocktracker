"use client";

import type { ImportOptionsPartData } from "@/lib/ai/warren/types";
import { useI18n } from "@/lib/i18n";
import { BrokerPickerGrid } from "@/components/import/BrokerPickerGrid";

interface Props {
  data: ImportOptionsPartData;
  disabled?: boolean;
  onSelectSync: (slug: string) => void;
  onSelectTradeRepublic: () => void;
  onCsvFallback: (typedName: string) => void;
  onRequestBroker: (typedName: string) => void;
  onManualAdd: () => void;
}

export default function ImportOptionsCard({
  disabled,
  onSelectSync,
  onSelectTradeRepublic,
  onCsvFallback,
  onRequestBroker,
  onManualAdd,
}: Props) {
  const { t } = useI18n();

  return (
    <div
      className="max-w-[420px] rounded-2xl border border-amber-400/40 bg-white p-3.5 text-gray-900 dark:bg-slate-800/50 dark:text-slate-100"
      data-testid="warren-import-options"
      role="region"
      aria-label={t("brokerPickerTitle")}
    >
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-400">
        {t("warrenImportOptionsEyebrow")}
      </p>
      <p className="mb-3 text-[15px] font-bold leading-snug">{t("brokerPickerTitle")}</p>
      <fieldset disabled={disabled} className="m-0 min-w-0 border-0 p-0">
        <BrokerPickerGrid
          t={t}
          onSelectSync={onSelectSync}
          onSelectTradeRepublic={onSelectTradeRepublic}
          onCsvFallback={onCsvFallback}
          onRequestBroker={onRequestBroker}
        />
        <button
          type="button"
          onClick={onManualAdd}
          className="btn-secondary mt-3 w-full min-h-[44px] text-sm"
        >
          {t("warrenImportManualCta")}
        </button>
      </fieldset>
    </div>
  );
}
