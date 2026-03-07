import { NextRequest, NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { getWebAuthnConfig, getChallengeCookieConfig } from "@/lib/auth/webauthn";
import { withMetrics } from "@/lib/with-metrics";

export const POST = withMetrics("/api/auth/passkey/login-options", async (req: NextRequest) => {
  const { rpID } = getWebAuthnConfig(req);

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
  });

  const response = NextResponse.json(options);
  response.cookies.set(getChallengeCookieConfig(options.challenge));
  return response;
});
