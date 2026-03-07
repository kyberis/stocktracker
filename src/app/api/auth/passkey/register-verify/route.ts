import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { requireSession } from "@/lib/auth/guards";
import { createPasskey, countPasskeysByUserId } from "@/lib/db";
import {
  getWebAuthnConfig,
  getChallengeFromRequest,
  getExpiredChallengeCookieConfig,
} from "@/lib/auth/webauthn";
import { withMetrics } from "@/lib/with-metrics";

export const POST = withMetrics("/api/auth/passkey/register-verify", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error!;

  const expectedChallenge = getChallengeFromRequest(req);
  if (!expectedChallenge) {
    return NextResponse.json({ error: "Challenge expired or missing" }, { status: 400 });
  }

  const body = await req.json();
  const { rpID, origin } = getWebAuthnConfig(req);

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body.credential,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });
  } catch (e) {
    console.error("Passkey registration verification failed:", e);
    return NextResponse.json({ error: "Verification failed" }, { status: 400 });
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "Verification failed" }, { status: 400 });
  }

  const { credentialID, credentialPublicKey, counter, credentialDeviceType, credentialBackedUp } =
    verification.registrationInfo;

  const count = await countPasskeysByUserId(session.userId);
  const name = body.name || `Passkey ${count + 1}`;

  await createPasskey({
    id: isoBase64URL.fromBuffer(credentialID),
    userId: session.userId,
    publicKey: isoBase64URL.fromBuffer(credentialPublicKey),
    counter,
    deviceType: credentialDeviceType,
    backedUp: credentialBackedUp,
    transports: body.credential?.response?.transports || [],
    name,
  });

  const response = NextResponse.json({ verified: true });
  response.cookies.set(getExpiredChallengeCookieConfig());
  return response;
});
