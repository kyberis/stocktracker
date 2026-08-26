"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { fill } from "@/lib/real-estate-screening/copy";
import { MAX_ZONES_PER_RUN, type ZonaCatalogo } from "@/lib/real-estate-screening/schemas";
import { useRealEstateCopy } from "./use-real-estate-copy";

export function ZoneMultiSelect({
  selected,
  onChange,
}: {
  selected: ZonaCatalogo[];
  onChange: (zones: ZonaCatalogo[]) => void;
}) {
  const { copy } = useRealEstateCopy();
  const listboxId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ZonaCatalogo[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runSearch = useCallback(async (q: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch(`/api/real-estate/zones?q=${encodeURIComponent(q)}&limit=20`, {
        signal: controller.signal,
      });
      if (!res.ok) return;
      const data = (await res.json()) as { zones: ZonaCatalogo[] };
      if (controller.signal.aborted) return;
      setResults(data.zones ?? []);
      setHighlight(0);
    } catch {
      if (!controller.signal.aborted) setResults([]);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runSearch(query);
      setOpen(true);
    }, 220);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  function addZone(z: ZonaCatalogo) {
    if (z.disabledReason) return;
    if (selected.some((s) => s.geocod === z.geocod)) return;
    if (selected.length >= MAX_ZONES_PER_RUN) return;
    onChange([...selected, z]);
    setQuery("");
    setOpen(false);
  }

  function removeZone(geocod: string) {
    onChange(selected.filter((z) => z.geocod !== geocod));
  }

  const grouped = results.reduce<Record<string, ZonaCatalogo[]>>((acc, z) => {
    const key = z.distrito || "Portugal";
    acc[key] = acc[key] ?? [];
    acc[key].push(z);
    return acc;
  }, {});

  return (
    <div>
      <label htmlFor="re-zone-search" className="text-sm font-semibold text-[color:var(--foreground)]">
        {copy.entry.zonesLabel}
      </label>
      <p className="mt-0.5 text-xs text-[color:var(--muted)]">
        {fill(copy.entry.zonesHint, { max: MAX_ZONES_PER_RUN })}
      </p>
      {selected.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={copy.entry.zonesLabel}>
          {selected.map((z) => (
            <li key={z.geocod}>
              <button
                type="button"
                onClick={() => removeZone(z.geocod)}
                className="inline-flex min-h-11 items-center gap-1 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 text-xs font-semibold"
              >
                {z.nombre}
                {z.amMetropolitana ? (
                  <span className="text-[10px] uppercase text-amber-700 dark:text-amber-300">
                    {copy.entry.metroBadge}
                  </span>
                ) : null}
                <span aria-hidden>×</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative mt-2">
        <input
          id="re-zone-search"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={copy.entry.searchPlaceholder}
          className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2.5 text-sm"
        />
        {open && (
          <ul
            id={listboxId}
            role="listbox"
            className="glass-overlay absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-[color:var(--border)] p-1 text-sm"
          >
            {results.length === 0 ? (
              <li className="px-3 py-2 text-[color:var(--muted)]">{copy.entry.noMatches}</li>
            ) : (
              Object.entries(grouped).map(([district, zones]) => (
                <li key={district}>
                  <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[color:var(--muted)]">
                    {district}
                  </p>
                  <ul>
                    {zones.map((z) => {
                      const disabled = Boolean(z.disabledReason);
                      const reason =
                        z.disabledReason === "sin_datos_venta"
                          ? copy.entry.disabledNoSale
                          : z.disabledReason === "sin_datos_renta"
                            ? copy.entry.disabledNoRent
                            : z.disabledReason
                              ? copy.entry.disabledNone
                              : "";
                      const active = highlight === results.indexOf(z);
                      return (
                        <li key={z.geocod} role="option" aria-selected={active} aria-disabled={disabled}>
                          <button
                            type="button"
                            disabled={disabled}
                            title={disabled ? reason : undefined}
                            onClick={() => addZone(z)}
                            className={`flex w-full min-h-11 items-center justify-between rounded-lg px-2 text-left ${
                              disabled
                                ? "cursor-not-allowed opacity-50"
                                : active
                                  ? "bg-[color:var(--surface-highlight)]"
                                  : "hover:bg-[color:var(--surface-soft)]"
                            }`}
                          >
                            <span>
                              {z.nombre}
                              <span className="ml-1 text-[11px] text-[color:var(--muted)]">{z.tipo}</span>
                            </span>
                            {disabled ? (
                              <span className="text-[10px] text-[color:var(--muted)]">{reason}</span>
                            ) : z.amMetropolitana ? (
                              <span className="text-[10px] uppercase text-amber-700 dark:text-amber-300">
                                {copy.entry.metroBadge}
                              </span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
