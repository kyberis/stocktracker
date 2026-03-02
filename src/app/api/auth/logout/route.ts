import { NextResponse } from "next/server";
import { getExpiredSessionCookieConfig } from "@/lib/auth/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(getExpiredSessionCookieConfig());
  return response;
}
