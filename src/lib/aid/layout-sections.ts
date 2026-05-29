export const AID_MAIN_HOLDINGS_SECTION_IDS = [
  "briefing",
  "priority",
  "finpulse",
  "news",
  "earnings",
  "portfolio",
  "extras",
  "holdings_lookup",
  "shortcuts",
] as const;

export const AID_MAIN_EMPTY_SECTION_IDS = ["empty_main", "finpulse", "shortcuts"] as const;

export const AID_SIDEBAR_SECTION_IDS = ["warren", "will", "clara"] as const;

export type AidMainSectionId =
  | (typeof AID_MAIN_HOLDINGS_SECTION_IDS)[number]
  | (typeof AID_MAIN_EMPTY_SECTION_IDS)[number];

export type AidSidebarSectionId = (typeof AID_SIDEBAR_SECTION_IDS)[number];

export interface AidLayoutOrder {
  main: AidMainSectionId[];
  sidebar: AidSidebarSectionId[];
}

export const DEFAULT_AID_LAYOUT_HOLDINGS: AidLayoutOrder = {
  main: [...AID_MAIN_HOLDINGS_SECTION_IDS],
  sidebar: [...AID_SIDEBAR_SECTION_IDS],
};

export const DEFAULT_AID_LAYOUT_EMPTY: AidLayoutOrder = {
  main: [...AID_MAIN_EMPTY_SECTION_IDS],
  sidebar: [...AID_SIDEBAR_SECTION_IDS],
};

function dedupe<T extends string>(ids: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function resolveColumn<T extends string>(
  stored: unknown,
  catalog: readonly T[],
  fallback: readonly T[],
): T[] {
  const allowed = new Set<string>(catalog);
  const base = fallback.filter((id) => allowed.has(id));
  if (!Array.isArray(stored) || stored.length === 0) return [...base];

  const filtered = dedupe(
    stored.filter((id): id is T => typeof id === "string" && allowed.has(id as T)),
  );
  for (const id of base) {
    if (!filtered.includes(id)) filtered.push(id);
  }
  return filtered;
}

export interface AidLayoutStored {
  main?: readonly string[];
  sidebar?: readonly string[];
}

export function parseAidLayoutOrderJson(raw: string | null | undefined): AidLayoutStored {
  if (!raw || raw.trim() === "" || raw.trim() === "{}") return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const obj = parsed as Record<string, unknown>;
    return {
      main: Array.isArray(obj.main) ? obj.main.map(String) : undefined,
      sidebar: Array.isArray(obj.sidebar) ? obj.sidebar.map(String) : undefined,
    };
  } catch {
    return {};
  }
}

export function resolveAidLayout(
  stored: AidLayoutStored | string | null | undefined,
  options: { isEmpty: boolean },
): AidLayoutOrder {
  const partial =
    typeof stored === "string" ? parseAidLayoutOrderJson(stored) : (stored ?? {});

  const defaults = options.isEmpty ? DEFAULT_AID_LAYOUT_EMPTY : DEFAULT_AID_LAYOUT_HOLDINGS;
  const mainCatalog = options.isEmpty ? AID_MAIN_EMPTY_SECTION_IDS : AID_MAIN_HOLDINGS_SECTION_IDS;

  return {
    main: resolveColumn(partial.main, mainCatalog, defaults.main),
    sidebar: resolveColumn(partial.sidebar, AID_SIDEBAR_SECTION_IDS, defaults.sidebar),
  };
}

export function isValidAidLayoutBody(
  body: { main: string[]; sidebar: string[] },
  options: { isEmpty: boolean },
): body is AidLayoutOrder {
  const resolved = resolveAidLayout(body, options);
  const mainCatalog = options.isEmpty ? AID_MAIN_EMPTY_SECTION_IDS : AID_MAIN_HOLDINGS_SECTION_IDS;
  if (resolved.main.length !== mainCatalog.length) return false;
  if (resolved.sidebar.length !== AID_SIDEBAR_SECTION_IDS.length) return false;
  return (
    resolved.main.every((id, i) => id === body.main[i]) &&
    resolved.sidebar.every((id, i) => id === body.sidebar[i])
  );
}

export function serializeAidLayoutOrder(layout: AidLayoutOrder): string {
  return JSON.stringify({ main: layout.main, sidebar: layout.sidebar });
}
