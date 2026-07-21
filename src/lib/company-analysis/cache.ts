interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

/** In-process L1 cache (short). Durable 7-day source of truth is Turso. */
export const COMPANY_ANALYSIS_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
/** Keep L1 short so regenerate on another instance is visible soon. */
export const COMPANY_ANALYSIS_L1_TTL_MS = 30 * 60 * 1000;
const DEFAULT_TTL_MS = COMPANY_ANALYSIS_L1_TTL_MS;

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

export function deleteCompanyAnalysisCacheKey(key: string): void {
  store.delete(key);
}

/** Test helper. */
export function clearCompanyAnalysisCache(): void {
  store.clear();
}
