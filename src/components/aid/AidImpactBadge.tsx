"use client";

import { useI18n } from "@/lib/i18n";
import type { AidImpactScore, AidNewsImpact } from "@/lib/types";
import { impactClass, impactLabel, impactScoreClass, impactScoreLabel } from "@/lib/aid/impact-score";

interface Props {
  impact: AidNewsImpact;
  impactScore?: AidImpactScore;
  showScore?: boolean;
}

export default function AidImpactBadge({ impact, impactScore, showScore = true }: Props) {
  const { t } = useI18n();
  if (showScore && impactScore != null) {
    return (
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums ${impactScoreClass(impactScore)}`}
        title={impactLabel(impact, t)}
      >
        {impactScoreLabel(impactScore, t)}
      </span>
    );
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${impactClass(impact)}`}>
      {impactLabel(impact, t)}
    </span>
  );
}
