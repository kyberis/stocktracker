import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { findUserById, updateUserProfile, setEmailVerified } from "@/lib/db";
import {
  createVerificationToken,
  sendVerificationEmail,
  verifyVerificationToken,
} from "@/lib/email";
import { withMetrics } from "@/lib/with-metrics";

export const POST = withMetrics("/api/auth/verify-email", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const user = await findUserById(session.userId);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (!user.email) {
    return NextResponse.json({ error: "No email set. Update your profile first." }, { status: 400 });
  }

  if (user.email_verified === 1) {
    return NextResponse.json({ error: "Email already verified" }, { status: 400 });
  }

  const token = await createVerificationToken(session.userId, user.email);
  const result = await sendVerificationEmail(user.email, token);

  if (!result.success) {
    return NextResponse.json({ error: "Failed to send verification email" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "Verification email sent" });
});

export const GET = withMetrics("/api/auth/verify-email", async (req: NextRequest) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const payload = await verifyVerificationToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  const user = await findUserById(payload.userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.email !== payload.email) {
    return NextResponse.json({ error: "Email mismatch" }, { status: 400 });
  }

  await setEmailVerified(payload.userId, true);

  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  return NextResponse.redirect(`${baseUrl}/profile?emailVerified=true`);
});
