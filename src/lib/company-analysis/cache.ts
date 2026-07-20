interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

/** In-process L1 cache mirrors the durable 7-day DB TTL. */
export const COMPANY_ANALYSIS_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_TTL_MS = COMPANY_ANALYSIS_WEEK_MS;

export function getCompanyAnalysisCache<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCompanyAnalysisCache<T>(
  key: string,
  data: T,
  ttlMs: number = DEFAULT_TTL_MS,
): void {
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
}

/** Test helper. */
export function clearCompanyAnalysisCache(): void {
  store.clear();
}
