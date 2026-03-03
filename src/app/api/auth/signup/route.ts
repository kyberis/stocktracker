import { NextRequest, NextResponse } from "next/server";
import { createUser, findUserByUsername, trackEvent } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import {
  createSessionToken,
  getSessionCookieConfig,
} from "@/lib/auth/session";
import { ensureSessionSecret } from "@/lib/auth/session-secret";

async function parseBody(
  req: NextRequest
): Promise<{ username?: string; password?: string; seedWithData?: boolean }> {
  const raw = await req.text();
  if (!raw) return {};
  return JSON.parse(raw) as { username?: string; password?: string; seedWithData?: boolean };
}

export async function POST(req: NextRequest) {
  ensureSessionSecret();

  let body: { username?: string; password?: string; seedWithData?: boolean } = {};
  try {
    body = await parseBody(req);
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const username = (body.username || "").trim();
  const password = body.password || "";
  const seedWithData = Boolean(body.seedWithData);

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
  }
  if (username.length < 3) {
    return NextResponse.json({ error: "Username must have at least 3 characters." }, { status: 400 });
  }
  if (password.length < 4) {
    return NextResponse.json({ error: "Password must have at least 4 characters." }, { status: 400 });
  }
  if (username.toLowerCase() === "admin") {
    return NextResponse.json({ error: "Username is reserved." }, { status: 400 });
  }

  try {
    const existing = await findUserByUsername(username);
    if (existing) {
      return NextResponse.json({ error: "Username already exists." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser({ username, passwordHash, seedWithData });
    const token = await createSessionToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    });

    trackEvent(user.id, "signup");
    const response = NextResponse.json({ user }, { status: 201 });
    response.cookies.set(getSessionCookieConfig(token));
    return response;
  } catch (error) {
    console.error("Signup failed:", error);
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }
}
