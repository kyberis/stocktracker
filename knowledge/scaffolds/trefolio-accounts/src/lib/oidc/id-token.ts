import { SignJWT, jwtVerify, importPKCS8, importSPKI, type JWTPayload } from "jose";
import type { EntitlementClaims } from "../entitlements/resolve";

const ISSUER = "https://user.trefolio.com";
const ID_TOKEN_TTL_SECONDS = 60 * 15; // 15 minutes

let _privateKey: CryptoKey | null = null;
let _publicKey: CryptoKey | null = null;

async function getPrivateKey(): Promise<CryptoKey> {
  if (_privateKey) return _privateKey;
  const pem = process.env.IDP_RS256_PRIVATE_KEY;
  if (!pem) throw new Error("IDP_RS256_PRIVATE_KEY is not set");
  _privateKey = await importPKCS8(pem.replace(/\\n/g, "\n"), "RS256");
  return _privateKey;
}

async function getPublicKey(): Promise<CryptoKey> {
  if (_publicKey) return _publicKey;
  const pem = process.env.IDP_RS256_PUBLIC_KEY;
  if (!pem) throw new Error("IDP_RS256_PUBLIC_KEY is not set");
  _publicKey = await importSPKI(pem.replace(/\\n/g, "\n"), "RS256");
  return _publicKey;
}

function getKid(): string {
  return process.env.IDP_RS256_KID || "trefolio-idp-1";
}

export interface IdTokenClaims {
  sub: string;
  aud: string; // client_id
  email: string;
  email_verified: boolean;
  name?: string;
  locale?: string;
  pro_until?: string; // ISO
  entitlements: EntitlementClaims;
  nonce?: string;
}

export async function signIdToken(claims: IdTokenClaims): Promise<string> {
  const key = await getPrivateKey();
  return new SignJWT(claims as unknown as JWTPayload)
    .setProtectedHeader({ alg: "RS256", typ: "JWT", kid: getKid() })
    .setIssuer(ISSUER)
    .setAudience(claims.aud)
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${ID_TOKEN_TTL_SECONDS}s`)
    .sign(key);
}

export async function verifyIdToken(token: string, audience: string): Promise<IdTokenClaims> {
  const key = await getPublicKey();
  const { payload } = await jwtVerify(token, key, {
    algorithms: ["RS256"],
    issuer: ISSUER,
    audience,
  });
  return payload as unknown as IdTokenClaims;
}
