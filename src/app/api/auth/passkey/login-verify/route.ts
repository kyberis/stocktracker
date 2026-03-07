import { NextRequest, NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import {
  getWebAuthnConfig,
  getChallengeFromRequest,
  getExpiredChallengeCookieConfig,
} from "@/lib/auth/webauthn";
import { getPasskeyById, updatePasskeyCounter, findUserById, toPublicUser, trackEvent } from "@/lib/db";
import { createSessionToken, getSessionCookieConfig } from "@/lib/auth/session";
import { ensureSessionSecret } from "@/lib/auth/session-secret";
import { withMetrics } from "@/lib/with-metrics";
import { authEventsTotal } from "@/lib/metrics";

export const POST = withMetrics("/api/auth/passkey/login-verify", async (req: NextRequest) => {
  ensureSessionSecret();

  const expectedChallenge = getChallengeFromRequest(req);
  if (!expectedChallenge) {
    return NextResponse.json({ error: "Challenge expired or missing" }, { status: 400 });
  }

  const body = await req.json();
  const credential = body.credential;
  if (!credential?.id) {
    return NextResponse.json({ error: "Invalid credential" }, { status: 400 });
  }

  const passkey = await getPasskeyById(credential.id);
  if (!passkey) {
    authEventsTotal.inc({ event: "login_failure" });
    return NextResponse.json({ error: "Passkey not recognized" }, { status: 401 });
  }

  const { rpID, origin } = getWebAuthnConfig(req);

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: isoBase64URL.toBuffer(passkey.id),
        credentialPublicKey: isoBase64URL.toBuffer(passkey.credential_public_key),
        counter: passkey.counter,
        transports: passkey.transports as AuthenticatorTransport[],
      },
    });
  } catch (e) {
    console.error("Passkey login verification failed:", e);
    authEventsTotal.inc({ event: "login_failure" });
    return NextResponse.json({ error: "Verification failed" }, { status: 401 });
  }

  if (!verification.verified) {
    authEventsTotal.inc({ event: "login_failure" });
    return NextResponse.json({ error: "Verification failed" }, { status: 401 });
  }

  await updatePasskeyCounter(passkey.id, verification.authenticationInfo.newCounter);

  const user = await findUserById(passkey.user_id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const token = await createSessionToken({
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    mustChangePassword: user.must_change_password === 1,
    plan: user.plan,
    emailVerified: user.email_verified === 1,
  });

  trackEvent(user.id, "login");
  authEventsTotal.inc({ event: "login_success" });

  const response = NextResponse.json({ user: toPublicUser(user) });
  response.cookies.set(getSessionCookieConfig(token));
  response.cookies.set(getExpiredChallengeCookieConfig());
  return response;
});
