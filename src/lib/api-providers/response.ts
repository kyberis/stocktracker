import { NextResponse } from "next/server";
import type { StockDataProvider } from "./types";

export function jsonWithCallCount(
  provider: StockDataProvider,
  data: unknown,
  init?: { status?: number; headers?: Record<string, string> }
): NextResponse {
  const res = NextResponse.json(data, init);
  const count = provider.callCount ?? 0;
  if (count > 0) {
    res.headers.set("x-market-data-calls", String(count));
    if (provider.name === "alphavantage") {
      res.headers.set("x-av-calls", String(count));
    }
    if (provider.name === "fmp") {
      res.headers.set("x-fmp-calls", String(count));
    }
  }
  if (init?.headers) {
    for (const [key, value] of Object.entries(init.headers)) {
      res.headers.set(key, value);
    }
  }
  return res;
}
