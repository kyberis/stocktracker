import { NextRequest, NextResponse } from "next/server";
import { createUser, findUserByUsername, trackEvent } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import {
  createSessionToken,
  getSessionCookieConfig,
} from "@/lib/auth/session";
import { ensureSessionSecret } from "@/lib/auth/session-secret";
import { withMetrics } from "@/lib/with-metrics";
import { authEventsTotal } from "@/lib/metrics";
import { parseBody } from "@/lib/api-response";
import { signupSchema } from "@/lib/schemas";

export const POST = withMetrics("/api/auth/signup", async (req: NextRequest) => {
  ensureSessionSecret();

  const result = await parseBody(req, signupSchema);
  if (!result.success) return result.error;
  const { username, password, seedWithData } = result.data;
  const trimmedUsername = username.trim();
  if (trimmedUsername.length < 3) {
    return NextResponse.json({ error: "Username must be at least 3 characters." }, { status: 400 });
  }
  if (trimmedUsername.toLowerCase() === "admin") {
    return NextResponse.json({ error: "Username is reserved." }, { status: 400 });
  }

  try {
    const existing = await findUserByUsername(trimmedUsername);
    if (existing) {
      return NextResponse.json({ error: "Username already exists." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser({ username: trimmedUsername, passwordHash, seedWithData: Boolean(seedWithData) });
    const token = await createSessionToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      plan: user.plan,
    });

    trackEvent(user.id, "signup");
    authEventsTotal.inc({ event: "signup" });
    const response = NextResponse.json({ user }, { status: 201 });
    response.cookies.set(getSessionCookieConfig(token));
    return response;
  } catch (error) {
    console.error("Signup failed:", error);
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }
});
