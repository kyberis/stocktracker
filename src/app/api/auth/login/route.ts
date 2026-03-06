import { NextRequest, NextResponse } from "next/server";
import { findUserByUsername, findUserByEmail, toPublicUser, trackEvent } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import {
  createSessionToken,
  getSessionCookieConfig,
} from "@/lib/auth/session";
import { ensureSessionSecret } from "@/lib/auth/session-secret";
import { withMetrics } from "@/lib/with-metrics";
import { authEventsTotal } from "@/lib/metrics";
import { parseBody } from "@/lib/api-response";
import { loginSchema } from "@/lib/schemas";

export const POST = withMetrics("/api/auth/login", async (req: NextRequest) => {
  ensureSessionSecret();

  const result = await parseBody(req, loginSchema);
  if (!result.success) return result.error;
  const { identifier, password } = result.data;
  const trimmed = identifier.trim();

  try {
    const isEmail = trimmed.includes("@");
    const user = isEmail
      ? await findUserByEmail(trimmed)
      : await findUserByUsername(trimmed);

    if (!user) {
      authEventsTotal.inc({ event: "login_failure" });
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    if (user.auth_provider === "google") {
      return NextResponse.json(
        { error: "This account uses Google sign-in. Please use the Google button." },
        { status: 400 },
      );
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      authEventsTotal.inc({ event: "login_failure" });
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const token = await createSessionToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      mustChangePassword: user.must_change_password === 1,
      plan: user.plan,
    });

    trackEvent(user.id, "login");
    authEventsTotal.inc({ event: "login_success" });
    const response = NextResponse.json({ user: toPublicUser(user) });
    response.cookies.set(getSessionCookieConfig(token));
    return response;
  } catch (error) {
    console.error("Login failed:", error);
    authEventsTotal.inc({ event: "login_failure" });
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }
});
