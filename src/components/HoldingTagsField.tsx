"use client";

import { useMemo, useState, useId, useCallback } from "react";
import type { Holding } from "@/lib/types";
import { collectDistinctTagsFromHoldings, filterTagSuggestions } from "@/lib/tag-suggestions";

function hasTagCaseInsensitive(tags: string[], candidate: string): boolean {
  const c = candidate.toLowerCase();
  return tags.some((t) => t.toLowerCase() === c);
}

function canonicalFromPool(input: string, pool: string[]): string {
  const t = input.trim();
  if (!t) return t;
  const hit = pool.find((p) => p.toLowerCase() === t.toLowerCase());
  return hit ?? t;
}

export interface HoldingTagsFieldProps {
  tags: string[];
  onChange: (next: string[]) => void;
  holdings: Holding[];
  /** When editing one row, still use full portfolio for suggestions (exclude already-applied tags in UI). */
  excludeHoldingId?: string;
  label: string;
  hint?: string;
  compact?: boolean;
}

export default function HoldingTagsField({
  tags,
  onChange,
  holdings,
  excludeHoldingId,
  label,
  hint,
  compact,
}: HoldingTagsFieldProps) {
  const listId = useId();
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);

  const suggestionPool = useMemo(
    () => collectDistinctTagsFromHoldings(holdings, excludeHoldingId ? { excludeHoldingId } : undefined),
    [holdings, excludeHoldingId],
  );

  const filtered = useMemo(
    () => filterTagSuggestions(draft, suggestionPool).filter((t) => !hasTagCaseInsensitive(tags, t)),
    [draft, suggestionPool, tags],
  );

  const addTag = useCallback(
    (raw: string) => {
      const canonical = canonicalFromPool(raw, [...suggestionPool, ...tags]);
      if (!canonical) return;
      if (hasTagCaseInsensitive(tags, canonical)) return;
      if (tags.length >= 20) return;
      onChange([...tags, canonical]);
      setDraft("");
      setOpen(false);
    },
    [onChange, suggestionPool, tags],
  );

  const removeAt = (i: number) => {
    onChange(tags.filter((_, j) => j !== i));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === "Backspace" && !draft && tags.length > 0) {
      removeAt(tags.length - 1);
    }
  };

  return (
    <div className={compact ? "" : "sm:col-span-2"}>
      <label htmlFor={listId} className="block text-xs text-gray-500 dark:text-slate-400 mb-1">
        {label}
      </label>
      {hint ? <p className="text-[10px] text-gray-400 dark:text-slate-500 mb-1">{hint}</p> : null}
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {tags.map((tag, i) => (
          <span
            key={`${tag}-${i}`}
            className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 text-xs"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="opacity-70 hover:opacity-100 rounded p-0.5"
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="relative">
        <input
          id={listId}
          type="text"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 150);
          }}
          onKeyDown={onKeyDown}
          placeholder=""
          className="w-full text-xs px-2 py-1 rounded border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900"
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={`${listId}-listbox`}
          aria-expanded={open && filtered.length > 0}
        />
        {open && filtered.length > 0 && (
          <ul
            id={`${listId}-listbox`}
            role="listbox"
            className="absolute z-30 mt-0.5 max-h-36 w-full overflow-auto rounded-md border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 shadow-md text-xs"
          >
            {filtered.slice(0, 12).map((opt) => (
              <li key={opt} role="option">
                <button
                  type="button"
                  className="w-full text-left px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-800"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addTag(opt)}
                >
                  {opt}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
