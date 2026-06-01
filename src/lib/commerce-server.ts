import { isFeatureEnabled } from "@/lib/db";
import { COMMERCE_FLAG } from "@/lib/commerce-constants";

export { COMMERCE_FLAG };

export async function isCommerceEnabled(): Promise<boolean> {
  return isFeatureEnabled(COMMERCE_FLAG);
}
