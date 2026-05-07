import { NextResponse } from "next/server";

const ISSUER = "https://user.trefolio.com";

export const dynamic = "force-static";
export const revalidate = 3600;

/**
 * GET /.well-known/openid-configuration
 * OIDC Discovery 1.0 metadata document. Public.
 */
export function GET() {
  return NextResponse.json({
    issuer: ISSUER,
    authorization_endpoint: `${ISSUER}/oauth2/authorize`,
    token_endpoint: `${ISSUER}/oauth2/token`,
    userinfo_endpoint: `${ISSUER}/oauth2/userinfo`,
    jwks_uri: `${ISSUER}/oauth2/jwks`,
    revocation_endpoint: `${ISSUER}/oauth2/revoke`,
    response_types_supported: ["code"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    scopes_supported: ["openid", "email", "profile", "entitlements", "offline_access"],
    token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post"],
    claims_supported: [
      "sub",
      "email",
      "email_verified",
      "name",
      "locale",
      "pro_until",
      "entitlements",
    ],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
  });
}
