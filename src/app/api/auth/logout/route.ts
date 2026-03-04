import { NextResponse } from "next/server";
import { getExpiredSessionCookieConfig } from "@/lib/auth/session";
import { withMetrics } from "@/lib/with-metrics";
import { authEventsTotal } from "@/lib/metrics";

export const POST = withMetrics("/api/auth/logout", async () => {
  authEventsTotal.inc({ event: "logout" });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(getExpiredSessionCookieConfig());
  return response;
});
