"use client";

import type { BriefRow } from "@/lib/screening/brief-state";
import type { ScreeningCopy } from "@/lib/screening/copy";
import { MetricHelpTip } from "./MetricHelpTip";
import { useScreeningCopy } from "./use-screening-copy";

const SOURCE_TONE: Record<BriefRow["source"], string> = {
  chat: "bg-teal-500/12 text-teal-700 dark:text-teal-300",
  preset: "bg-white/5 text-[color:var(--muted)]",
  rebalance: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
  confirmed: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
};

export function SourceBadge({ source }: { source: BriefRow["source"] }) {
  const { copy } = useScreeningCopy();
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${SOURCE_TONE[source]}`}
    >
      {copy.intake.sourceLabels[source]}
    </span>
  );
}

function rowHelpFor(key: string, copy: ScreeningCopy) {
  return copy.intake.rowHelp[key as keyof typeof copy.intake.rowHelp];
}

function fillEditHint(template: string, label: string): string {
  return template.replace("{label}", label);
}

/** Compact list used in the chat side panel. Rows are clickable to edit. */
export function BriefList({
  rows,
  onEditRow,
}: {
  rows: BriefRow[];
  onEditRow?: (row: BriefRow) => void;
}) {
  const { copy } = useScreeningCopy();
  if (!rows.length) {
    return <p className="text-[12.5px] text-[color:var(--muted)]">{copy.intake.briefEmpty}</p>;
  }

  return (
    <ul className="list-none space-y-1.5 p-0">
      {rows.map((row) => {
        const help = rowHelpFor(row.key, copy);
        const label = (
          <MetricHelpTip
            label={row.label}
            help={help}
            className="text-[12px] text-[color:var(--muted)]"
          />
        );
        const condition = (
          <span className="shrink-0 text-[12px] font-semibold tabular-nums text-[color:var(--foreground)]">
            {row.condition}
          </span>
        );

        if (!onEditRow) {
          return (
            <li
              key={row.key}
              className="flex items-center justify-between gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-2.5 py-1.5"
            >
              {label}
              {condition}
            </li>
          );
        }

        return (
          <li
            key={row.key}
            className="flex items-center justify-between gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-2.5 py-1.5"
          >
            {label}
            <button
              type="button"
              onClick={() => onEditRow(row)}
              className="shrink-0 text-[12px] font-semibold tabular-nums text-[color:var(--foreground)] underline decoration-dotted underline-offset-2 transition-colors hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:hover:text-teal-300"
              title={fillEditHint(copy.intake.editRowHint, row.label)}
            >
              {row.condition}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Full table used on the confirmation step, where provenance matters. */
export function BriefTable({
  rows,
  onEditRow,
}: {
  rows: BriefRow[];
  onEditRow?: (row: BriefRow) => void;
}) {
  const { copy } = useScreeningCopy();
  if (!rows.length) {
    return <p className="text-sm text-[color:var(--muted)]">{copy.brief.empty}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-[color:var(--border)] bg-[color:var(--surface-soft)] text-left">
            {[copy.brief.colFilter, copy.brief.colCondition, copy.brief.colSource].map((heading) => (
              <th
                key={heading}
                className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--muted)]"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-[color:var(--border)]">
              <td className="px-3 py-2 text-[13px] text-[color:var(--muted)]">
                <MetricHelpTip label={row.label} help={rowHelpFor(row.key, copy)} />
              </td>
              <td className="px-3 py-2 text-[13px] font-semibold tabular-nums text-[color:var(--foreground)]">
                {onEditRow ? (
                  <button
                    type="button"
                    onClick={() => onEditRow(row)}
                    className="underline decoration-dotted underline-offset-2 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:hover:text-teal-300"
                    title={fillEditHint(copy.intake.editRowHint, row.label)}
                  >
                    {row.condition}
                  </button>
                ) : (
                  row.condition
                )}
              </td>
              <td className="px-3 py-2">
                <SourceBadge source={row.source} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
