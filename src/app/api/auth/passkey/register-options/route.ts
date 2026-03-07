import { NextRequest, NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { requireSession } from "@/lib/auth/guards";
import { findUserById, getPasskeysByUserId } from "@/lib/db";
import { getWebAuthnConfig, getChallengeCookieConfig } from "@/lib/auth/webauthn";
import { withMetrics } from "@/lib/with-metrics";

export const POST = withMetrics("/api/auth/passkey/register-options", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error!;

  const user = await findUserById(session.userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const existingPasskeys = await getPasskeysByUserId(session.userId);
  const { rpName, rpID } = getWebAuthnConfig(req);

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: session.userId,
    userName: user.email || user.username,
    userDisplayName: user.display_name || user.username,
    attestationType: "none",
    excludeCredentials: existingPasskeys.map((pk) => ({
      id: isoBase64URL.toBuffer(pk.id),
      type: "public-key" as const,
      transports: pk.transports as AuthenticatorTransport[],
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  const response = NextResponse.json(options);
  response.cookies.set(getChallengeCookieConfig(options.challenge));
  return response;
});
