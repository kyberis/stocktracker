import { NextResponse } from "next/server";
import type { StockDataProvider } from "./types";

export function jsonWithCallCount(
  provider: StockDataProvider,
  data: unknown,
  init?: { status?: number }
): NextResponse {
  const res = NextResponse.json(data, init);
  const count = provider.callCount ?? 0;
  if (count > 0) {
    res.headers.set("x-av-calls", String(count));
  }
  return res;
}
