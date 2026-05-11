import { syncEntitlementsForUser } from "./entitlements";

/**
 * Pull canonical profile fields from the IdP entitlements payload.
 * Implemented via {@link syncEntitlementsForUser} so we hit `/v1/entitlements`
 * once (plan + profile mirror share the same payload).
 */
export async function syncProfileFieldsFromIdp(userId: string): Promise<void> {
  await syncEntitlementsForUser(userId);
}
