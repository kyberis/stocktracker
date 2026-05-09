import { introspectTfpPat, isTfpPatToken } from "@/lib/accounts-pat-introspect";
import { findUserIdByIdpSub } from "@/lib/db";

export type TrefolioMcpAuth = { userId: string; tokenId: string };

export async function verifyTrefolioMcpBearer(
  bearer: string | null | undefined,
): Promise<TrefolioMcpAuth | null> {
  if (!bearer) return null;
  const trimmed = bearer.trim();
  if (!isTfpPatToken(trimmed)) return null;
  const intro = await introspectTfpPat(trimmed);
  if (!intro) return null;
  const userId = await findUserIdByIdpSub(intro.sub);
  if (!userId) return null;
  return { userId, tokenId: intro.tokenId ? `acc:${intro.tokenId}` : "acc:unknown" };
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
