import { recordAvUsageAsync, recordFmpUsageAsync } from "@/lib/rate-limit";
import type { MarketDataBackend } from "./resolve-provider";

export function recordMarketDataUsageAsync(
  userId: string,
  backend: MarketDataBackend,
  callCount: number
): Promise<void> {
  if (backend === "fmp") return recordFmpUsageAsync(userId, callCount);
  return recordAvUsageAsync(userId, callCount);
}
