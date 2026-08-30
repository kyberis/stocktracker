import type { SubscriptionPlan } from "@/lib/types";

export type NavPlanChipVariant = "nav" | "sidebar";

export type NavPlanChipKind =
  | "upgrade_cta"
  | "plan_link"
  | "plan_static"
  | "free_label"
  | "hidden";

/**
 * Free upgrade CTA is owned by Home (`home-free-upgrade-cta`) for the top nav.
 * Studio sidebar still shows Free → View plans under the account name.
 * Paid plans below Wealth link to /billing; Wealth is display-only.
 */
export function resolveNavPlanChipKind(
  plan: SubscriptionPlan,
  commerceEnabled: boolean,
  variant: NavPlanChipVariant,
): NavPlanChipKind {
  if (plan === "free") {
    if (!commerceEnabled) return variant === "nav" ? "hidden" : "free_label";
    return variant === "nav" ? "hidden" : "upgrade_cta";
  }
  if (!commerceEnabled || plan === "wealth") return "plan_static";
  return "plan_link";
}
