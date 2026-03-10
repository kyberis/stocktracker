interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

type GlobalWithCache = typeof globalThis & {
  __apiCache?: Map<string, CacheEntry<unknown>>;
};

function getStore(): Map<string, CacheEntry<unknown>> {
  const g = globalThis as GlobalWithCache;
  if (!g.__apiCache) {
    g.__apiCache = new Map();
  }
  return g.__apiCache;
}

export const apiCache = {
  get<T>(key: string): T | null {
    const entry = getStore().get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      getStore().delete(key);
      return null;
    }
    return entry.data;
  },

  set<T>(key: string, data: T, ttlMs: number): void {
    getStore().set(key, { data, expiresAt: Date.now() + ttlMs });
  },

  async getOrFetch<T>(key: string, ttlMs: number, fetchFn: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) return cached;
    const data = await fetchFn();
    this.set(key, data, ttlMs);
    return data;
  },

  invalidate(key: string): void {
    getStore().delete(key);
  },

  clear(): void {
    getStore().clear();
  },
};

export const CACHE_TTL = {
  COINLORE_TICKERS: 2 * 60 * 1000,
  AV_CRYPTO_DAILY: 30 * 60 * 1000,
  AV_CRYPTO_WEEKLY: 2 * 60 * 60 * 1000,
  AV_CRYPTO_MONTHLY: 2 * 60 * 60 * 1000,
  AV_EXCHANGE_RATE: 5 * 60 * 1000,
} as const;
