import { findUserById } from "@/lib/db";
import { ensureLocalUserLinkedToIdp } from "@/lib/idp/entitlements";

/** Unified identity Warren passes to Clara and Will internal APIs. */
export interface OfficeIdentity {
  idpSub: string;
  email: string;
  trefolioUserId: string;
}

/**
 * Resolve the IdP subject for Office cross-app calls. Sister apps key users
 * by `idpSub` (OIDC `sub` from user.trefolio.com). When the local row is
 * missing `idp_sub` (legacy signup / trial), look up or provision via IdP
 * import-by-email and persist the link.
 */
export async function resolveOfficeIdentity(userId: string): Promise<OfficeIdentity | null> {
  const user = await findUserById(userId);
  if (!user) return null;

  const idpSub = (await ensureLocalUserLinkedToIdp(userId)) || user.idp_sub?.trim() || "";

  return {
    idpSub,
    email: user.email.trim(),
    trefolioUserId: userId,
  };
}
