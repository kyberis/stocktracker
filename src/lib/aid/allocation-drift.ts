import type { RebalanceTarget } from "@/lib/types";
import type { AllocationSlice } from "@/lib/portfolio-summary";

export interface AllocationDriftRow {
  label: string;
  actualPercent: number;
  targetPercent: number;
  driftPercent: number;
}

/** Largest absolute drifts for asset-type allocation vs rebalance targets. */
export function computeTypeAllocationDrifts(
  allocation: AllocationSlice[],
  targets: RebalanceTarget[],
): AllocationDriftRow[] {
  const typeTargets = targets.filter((t) => t.category === "type");
  if (typeTargets.length === 0) return [];

  const allocMap = Object.fromEntries(allocation.map((a) => [a.label, a.percent]));

  return typeTargets
    .map((tgt) => {
      const actualPercent = allocMap[tgt.label] ?? 0;
      const targetPercent = tgt.targetPercent;
      return {
        label: tgt.label,
        actualPercent,
        targetPercent,
        driftPercent: actualPercent - targetPercent,
      };
    })
    .filter((row) => Math.abs(row.driftPercent) >= 0.05)
    .sort((a, b) => Math.abs(b.driftPercent) - Math.abs(a.driftPercent));
}
