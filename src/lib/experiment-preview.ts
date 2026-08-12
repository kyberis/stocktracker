/**
 * Admin-only client preview overrides for experiment variants.
 * In-memory map is the source of truth for the current JS realm; mirrored to
 * sessionStorage when available so full page reloads in the same tab keep the
 * override (and so overrides clear when the tab closes).
 */

const STORAGE_KEY = "trefolio:exp-preview";

export type ExperimentPreviewMap = Record<string, string>;

type Listener = () => void;

const listeners = new Set<Listener>();

/** Module-scoped mirror — works in Node tests and SSR without sessionStorage. */
let memoryMap: ExperimentPreviewMap = {};
let hydratedFromStorage = false;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

function readStorage(): ExperimentPreviewMap {
  if (!canUseStorage()) return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: ExperimentPreviewMap = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof k === "string" && typeof v === "string" && k && v) {
        out[k] = v;
      }
    }
    return out;
  } catch {
    return {};
  }
}

function writeStorage(map: ExperimentPreviewMap): void {
  if (!canUseStorage()) return;
  try {
    if (Object.keys(map).length === 0) {
      sessionStorage.removeItem(STORAGE_KEY);
    } else {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    }
  } catch {
    // Private mode / quota — ignore
  }
}

function ensureHydrated(): void {
  if (hydratedFromStorage) return;
  hydratedFromStorage = true;
  const fromStorage = readStorage();
  if (Object.keys(fromStorage).length > 0) {
    memoryMap = { ...fromStorage };
  }
}

function notify(): void {
  for (const cb of listeners) cb();
}

function commit(map: ExperimentPreviewMap): void {
  memoryMap = map;
  hydratedFromStorage = true;
  writeStorage(map);
  notify();
}

export function listExperimentPreviews(): ExperimentPreviewMap {
  ensureHydrated();
  return { ...memoryMap };
}

export function getExperimentPreview(key: string): string | null {
  ensureHydrated();
  return memoryMap[key] || null;
}

export function hasAnyExperimentPreview(): boolean {
  ensureHydrated();
  return Object.keys(memoryMap).length > 0;
}

export function setExperimentPreview(key: string, variant: string): void {
  if (!key || !variant) return;
  ensureHydrated();
  commit({ ...memoryMap, [key]: variant });
}

/** Clear one key, or all previews when key is omitted / `"all"`. */
export function clearExperimentPreview(key?: string | "all"): void {
  ensureHydrated();
  if (!key || key === "all") {
    commit({});
    return;
  }
  const next = { ...memoryMap };
  delete next[key];
  commit(next);
}

export function subscribeExperimentPreview(cb: Listener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/**
 * Parse `?exp_preview=key:variant` (or multiple via comma) and write overrides.
 * Returns the last applied pair for convenience.
 */
export function syncExperimentPreviewFromSearchParams(
  searchParams: URLSearchParams | { get(name: string): string | null },
): { key: string; variant: string } | null {
  const raw = searchParams.get("exp_preview");
  if (!raw) return null;
  let last: { key: string; variant: string } | null = null;
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const colon = trimmed.indexOf(":");
    if (colon <= 0) continue;
    const key = trimmed.slice(0, colon).trim();
    const variant = trimmed.slice(colon + 1).trim();
    if (!key || !variant) continue;
    setExperimentPreview(key, variant);
    last = { key, variant };
  }
  return last;
}

/** Test-only: reset module state between cases when sessionStorage is absent. */
export function __resetExperimentPreviewForTests(): void {
  memoryMap = {};
  hydratedFromStorage = false;
  listeners.clear();
  writeStorage({});
}
