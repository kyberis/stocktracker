import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { verifySessionToken } from "@/lib/auth/session";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

function getRedirectUri(req: NextRequest): string {
  const base = process.env.APP_BASE_URL || req.nextUrl.origin;
  return `${base}/api/auth/google/callback`;
}

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "Google OAuth is not configured." },
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
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state,
  });

  const response = NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
  response.cookies.set({
    name: "google_oauth_state",
    value: state,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  if (isLinkIntent) {
    response.cookies.set({
      name: "google_link_intent",
      value: "1",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    });
  }

  const postLoginRedirect = req.nextUrl.searchParams.get("redirect");
  if (postLoginRedirect && postLoginRedirect.startsWith("/")) {
    response.cookies.set({
      name: "oauth_redirect",
      value: postLoginRedirect,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    });
  }

  return response;
}
