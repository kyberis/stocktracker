import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { verifySessionToken } from "@/lib/auth/session";
import { isFeatureEnabled } from "@/lib/db";

const APPLE_AUTH_URL = "https://appleid.apple.com/auth/authorize";

function getRedirectUri(req: NextRequest): string {
  const base = process.env.APP_BASE_URL || req.nextUrl.origin;
  return `${base}/api/auth/apple/callback`;
}

export async function GET(req: NextRequest) {
  if (!(await isFeatureEnabled("apple_signin_enabled"))) {
    return NextResponse.json(
      { error: "Apple Sign In is not enabled." },
      { status: 403 },
    );
  }

  const clientId = process.env.APPLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "Apple OAuth is not configured." },
      { status: 501 },
    );
  }

  const isLinkIntent = req.nextUrl.searchParams.get("intent") === "link";

  if (isLinkIntent) {
    const token = req.cookies.get("trefolio_session")?.value;
    const session = token ? await verifySessionToken(token) : null;
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
    }
  }

  const state = randomUUID();
  const redirectUri = getRedirectUri(req);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "name email",
    response_mode: "form_post",
    state,
  });

  const response = NextResponse.redirect(`${APPLE_AUTH_URL}?${params.toString()}`);
  response.cookies.set({
    name: "apple_oauth_state",
    value: state,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  if (isLinkIntent) {
    response.cookies.set({
      name: "apple_link_intent",
      value: "1",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    });
  }

  return response;
}
