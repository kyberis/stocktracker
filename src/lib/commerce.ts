"use client";

import { useFeatureFlag } from "@/lib/feature-flag-context";
import { COMMERCE_FLAG } from "@/lib/commerce-constants";

export { COMMERCE_FLAG };

/** Client hook — reads commerce_enabled from FeatureFlagProvider. */
export function useCommerceEnabled(): boolean {
  return useFeatureFlag(COMMERCE_FLAG);
}
