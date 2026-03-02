import { NextRequest, NextResponse } from "next/server";
import { findUserByUsername, toPublicUser } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import {
  createSessionToken,
  getSessionCookieConfig,
} from "@/lib/auth/session";
import { ensureSessionSecret } from "@/lib/auth/session-secret";

async function parseBody(req: NextRequest): Promise<{ username?: string; password?: string }> {
  const raw = await req.text();
  if (!raw) return {};
  return JSON.parse(raw) as { username?: string; password?: string };
}

export async function POST(req: NextRequest) {
  ensureSessionSecret();

  let body: { username?: string; password?: string } = {};
  try {
    body = await parseBody(req);
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const username = (body.username || "").trim();
  const password = body.password || "";

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
  }

  try {
    const user = await findUserByUsername(username);
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const token = await createSessionToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      mustChangePassword: user.must_change_password === 1,
    });

    const response = NextResponse.json({ user: toPublicUser(user) });
    response.cookies.set(getSessionCookieConfig(token));
    return response;
  } catch (error) {
    console.error("Login failed:", error);
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }
}
