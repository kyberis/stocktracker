"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { isNativePlatform } from "@/lib/capacitor";
import {
  type ClientPlatform,
  type FeatureKey,
  isFeatureOnPlatform,
  canAccessFeatureOnPlatform,
  getRequiredPlan,
} from "@/lib/platform-features";
import type { SubscriptionPlan } from "@/lib/types";

interface PlatformContextValue {
  platform: ClientPlatform;
  isNative: boolean;
  /** Current subscription tier for upsell / tiered features (from layout). */
  userPlan: SubscriptionPlan;
  /** Whether the feature exists on the current platform (ignores tier). */
  hasFeature: (key: FeatureKey) => boolean;
  /** Whether the feature exists on this platform AND the user's plan allows it. */
  canAccess: (key: FeatureKey) => boolean;
  /** Returns the minimum plan needed for a feature. */
  requiredPlan: (key: FeatureKey) => SubscriptionPlan;
}

const PlatformContext = createContext<PlatformContextValue>({
  platform: "desktop",
  isNative: false,
  userPlan: "free",
  hasFeature: () => true,
  canAccess: () => true,
  requiredPlan: () => "free",
});

export function usePlatform() {
  return useContext(PlatformContext);
}

interface Props {
  children: ReactNode;
  userPlan?: SubscriptionPlan;
}

export function PlatformProvider({ children, userPlan = "free" }: Props) {
  const value = useMemo<PlatformContextValue>(() => {
    const native = isNativePlatform();
    const platform: ClientPlatform = native ? "mobile" : "desktop";

    return {
      platform,
      isNative: native,
      userPlan,
      hasFeature: (key: FeatureKey) => isFeatureOnPlatform(key, platform),
      canAccess: (key: FeatureKey) => canAccessFeatureOnPlatform(key, platform, userPlan),
      requiredPlan: (key: FeatureKey) => getRequiredPlan(key),
    };
  }, [userPlan]);

  return (
    <PlatformContext.Provider value={value}>
      {children}
    </PlatformContext.Provider>
  );
}
