"use client";

import { useId } from "react";
import type { ScreeningPipelineKind } from "@/lib/screening/pipeline-kind";
import { useScreeningCopy } from "./use-screening-copy";

export function ScreeningPipelineToggle({
  value,
  onChange,
  disabled,
}: {
  value: ScreeningPipelineKind;
  onChange: (next: ScreeningPipelineKind) => void;
  disabled?: boolean;
}) {
  const { copy } = useScreeningCopy();
  const p = copy.entry.pipeline;
  const legendId = useId();
  const helpId = useId();
  const groupName = useId();

  return (
    <fieldset
      className="mt-4 rounded-[20px] border border-[color:var(--border)] p-4"
      disabled={disabled}
      role="radiogroup"
      aria-labelledby={legendId}
      aria-describedby={helpId}
    >
      <legend
        id={legendId}
        className="px-1 text-[13px] font-semibold text-[color:var(--foreground)]"
      >
        {p.legend}
      </legend>
      <p id={helpId} className="mt-1 text-[13px] text-[color:var(--muted)]">
        {p.help}
      </p>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label
          className={`flex min-h-11 cursor-pointer items-start gap-2 rounded-xl border px-3 py-2.5 focus-within:ring-2 focus-within:ring-teal-500 ${
            value === "checklist"
              ? "border-teal-500/70 bg-teal-500/10"
              : "border-[color:var(--border)]"
          }`}
        >
          <input
            type="radio"
            name={groupName}
            value="checklist"
            checked={value === "checklist"}
            onChange={() => onChange("checklist")}
            className="mt-1 h-4 w-4 accent-teal-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500"
          />
          <span>
            <span className="block text-[13px] font-semibold text-[color:var(--foreground)]">
              {p.checklistLabel}
            </span>
            <span className="mt-0.5 block text-[12px] text-[color:var(--muted)]">
              {p.checklistHelp}
            </span>
          </span>
        </label>
        <label
          className={`flex min-h-11 cursor-pointer items-start gap-2 rounded-xl border px-3 py-2.5 focus-within:ring-2 focus-within:ring-teal-500 ${
            value === "thesis"
              ? "border-teal-500/70 bg-teal-500/10"
              : "border-[color:var(--border)]"
          }`}
        >
          <input
            type="radio"
            name={groupName}
            value="thesis"
            checked={value === "thesis"}
            onChange={() => onChange("thesis")}
            className="mt-1 h-4 w-4 accent-teal-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500"
          />
          <span>
            <span className="block text-[13px] font-semibold text-[color:var(--foreground)]">
              {p.thesisLabel}
            </span>
            <span className="mt-0.5 block text-[12px] text-[color:var(--muted)]">
              {p.thesisHelp}
            </span>
          </span>
        </label>
      </div>
    </fieldset>
  );
}
