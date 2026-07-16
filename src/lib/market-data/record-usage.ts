import { recordFmpUsageAsync } from "@/lib/rate-limit";
import type { MarketDataBackend } from "./resolve-provider";

/**
 * Record usage against the shared premium market-data RPM bucket.
 * Free backends share the same per-user minute budget formerly used for FMP.
 */
export function recordMarketDataUsageAsync(
  userId: string,
  backend: MarketDataBackend,
  callCount: number
): Promise<void> {
  if (backend === "fmp" || backend === "free") {
    return recordFmpUsageAsync(userId, callCount);
  }
  return Promise.resolve();
}
