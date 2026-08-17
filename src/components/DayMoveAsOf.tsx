"use client";

import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { formatDayMoveAsOf, resolveDayMoveAsOf } from "@/lib/quote-time";

export default function DayMoveAsOf({ className = "" }: { className?: string }) {
  const { t, language } = useI18n();
  const { quotes, lastUpdated } = usePortfolio();

  const asOf = useMemo(
    () => resolveDayMoveAsOf(quotes, lastUpdated),
    [quotes, lastUpdated],
  );

  if (!asOf) {
    return <span className={className}>{t("todayLabel")}</span>;
  }

  const label = formatDayMoveAsOf(asOf, language, t("todayLabel"));

  return (
    <time
      dateTime={asOf.toISOString()}
      data-testid="day-move-as-of"
      title={t("dayMoveAsOfTitle")}
      aria-label={`${t("dayMoveAsOfTitle")}: ${label}`}
      className={className}
    >
      {label}
    </time>
  );
}
