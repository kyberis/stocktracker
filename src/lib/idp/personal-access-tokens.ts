import { call } from "@/lib/idp/client";

export interface IdpPersonalAccessTokenRow {
  id: string;
  prefix: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
}

export function listPersonalAccessTokensForIdpSub(
  sub: string,
): Promise<{ tokens: IdpPersonalAccessTokenRow[] }> {
  return call(`/v1/users/${encodeURIComponent(sub)}/personal-access-tokens`);
}

export function createPersonalAccessTokenForIdpSub(
  sub: string,
  body: { name?: string; scopes?: string[] },
): Promise<{
  id: string;
  token: string;
  prefix: string;
  name: string;
  expires_at: string | null;
  scopes?: string[];
}> {
  return call(`/v1/users/${encodeURIComponent(sub)}/personal-access-tokens`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function revokePersonalAccessTokenForIdpSub(
  sub: string,
  id: string,
): Promise<{ ok: boolean }> {
  return call(`/v1/users/${encodeURIComponent(sub)}/personal-access-tokens/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
