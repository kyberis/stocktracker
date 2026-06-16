import {
  introspectTfpPat,
  introspectTfpPatDetailed,
  isTfpPatToken,
  type PatIntrospectFailureReason,
} from "@/lib/accounts-pat-introspect";
import { findUserIdByIdpSub } from "@/lib/db";
import { isIdpOAuthAccessToken, verifyIdpOAuthAccessBearer } from "@/lib/mcp/idp-oauth-access-auth";

export type TrefolioMcpAuth = { userId: string; tokenId: string };

export type McpPatAuthFailureReason =
  | "missing_bearer"
  | "invalid_token_format"
  | PatIntrospectFailureReason
  | "user_not_linked";

export type McpPatAuthResult =
  | { ok: true; auth: TrefolioMcpAuth }
  | { ok: false; reason: McpPatAuthFailureReason };

const MCP_PAT_AUTH_MESSAGES: Record<McpPatAuthFailureReason, string> = {
  missing_bearer: "Missing Authorization: Bearer tfp_pat_… header.",
  invalid_token_format: "Token must start with tfp_pat_.",
  local_secret_missing:
    "MCP PAT validation is not configured on trefolio (TREFOLIO_PAT_INTROSPECTION_SECRET).",
  idp_url_missing: "IdP URL is not configured; cannot validate PAT.",
  idp_not_configured:
    "PAT introspection is not configured on user.trefolio.com (TREFOLIO_PAT_INTROSPECTION_SECRET).",
  inactive: "Invalid, expired, or revoked personal access token.",
  network_error: "Could not reach the IdP to validate the token.",
  user_not_linked:
    "No trefolio account is linked to this IdP user. Sign in to trefolio.com once with the same account.",
};

export function mcpPatAuthFailureMessage(reason: McpPatAuthFailureReason): string {
  return MCP_PAT_AUTH_MESSAGES[reason];
}

export function mcpPatAuthFailureResponse(reason: McpPatAuthFailureReason): Response {
  return Response.json(
    { error: "invalid_token", error_description: mcpPatAuthFailureMessage(reason) },
    { status: 401, headers: { "Content-Type": "application/json" } },
  );
}

export async function verifyTrefolioMcpBearerDetailed(
  bearer: string | null | undefined,
): Promise<McpPatAuthResult> {
  if (!bearer) return { ok: false, reason: "missing_bearer" };
  const trimmed = bearer.trim();
  if (!isTfpPatToken(trimmed)) return { ok: false, reason: "invalid_token_format" };
  const intro = await introspectTfpPatDetailed(trimmed);
  if (!intro.ok) return { ok: false, reason: intro.reason };
  const userId = await findUserIdByIdpSub(intro.sub);
  if (!userId) return { ok: false, reason: "user_not_linked" };
  return {
    ok: true,
    auth: { userId, tokenId: intro.tokenId ? `acc:${intro.tokenId}` : "acc:unknown" },
  };
}

export async function verifyTrefolioMcpBearer(
  bearer: string | null | undefined,
): Promise<TrefolioMcpAuth | null> {
  const result = await verifyTrefolioMcpBearerDetailed(bearer);
  return result.ok ? result.auth : null;
}

/** PAT (`tfp_pat_…`) or IdP OAuth access token (`dev-access-…`) for MCP. */
export async function verifyMcpRequestAuthDetailed(
  bearer: string | null | undefined,
): Promise<McpPatAuthResult> {
  if (!bearer) return { ok: false, reason: "missing_bearer" };
  const trimmed = bearer.trim();
  if (isTfpPatToken(trimmed)) return verifyTrefolioMcpBearerDetailed(trimmed);
  if (isIdpOAuthAccessToken(trimmed)) {
    const oauth = await verifyIdpOAuthAccessBearer(trimmed);
    if (!oauth) return { ok: false, reason: "inactive" };
    return {
      ok: true,
      auth: {
        userId: oauth.userId,
        tokenId: `oauth:${oauth.sub.length > 12 ? oauth.sub.slice(-12) : oauth.sub}`,
      },
    };
  }
  return { ok: false, reason: "invalid_token_format" };
}

export function extractBearer(headers: Headers): string | null {
  const auth = headers.get("authorization");
  if (!auth) return null;
  const [scheme, ...rest] = auth.split(" ");
  if (scheme?.toLowerCase() !== "bearer") return null;
  const value = rest.join(" ").trim();
  return value || null;
}

export async function authenticateTrefolioMcpRequest(request: Request): Promise<TrefolioMcpAuth | null> {
  return verifyTrefolioMcpBearer(extractBearer(request.headers));
}
