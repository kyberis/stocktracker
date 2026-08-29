import type { BillingInterval, SubscriptionPlan } from "@/lib/types";
import type { StripePriceKey } from "@/lib/db/settings";
import { parseSubscriptionPlan } from "@/lib/plan-rank";

export type StripePriceAdminField = {
  key: StripePriceKey;
  label: string;
  env: string;
  hint: string;
  placeholder: string;
};

export type StripePriceAdminGroup = {
  title: string;
  description: string;
  fields: StripePriceAdminField[];
};

/** Admin Settings → Stripe Price IDs. Keep in sync with `STRIPE_ENV_MAP`. */
export const STRIPE_PRICE_ADMIN_GROUPS: StripePriceAdminGroup[] = [
  {
    title: "Basic",
    description: "Daily Clara × Warren habit. €4.99/mo or €49/yr.",
    fields: [
      { key: "stripe_price_basic_monthly", label: "Monthly", env: "STRIPE_PRICE_BASIC_MONTHLY", hint: "€4.99 / month", placeholder: "price_..." },
      { key: "stripe_price_basic_annual", label: "Annual", env: "STRIPE_PRICE_BASIC_ANNUAL", hint: "€49 / year", placeholder: "price_..." },
    ],
  },
  {
    title: "Pro",
    description: "Scale + Will + 2 screenings/month. Existing STRIPE_PRICE_PRO_* map here.",
    fields: [
      { key: "stripe_price_pro_monthly", label: "Monthly", env: "STRIPE_PRICE_PRO_MONTHLY", hint: "€9.99 / month", placeholder: "price_..." },
      { key: "stripe_price_pro_annual", label: "Annual", env: "STRIPE_PRICE_PRO_ANNUAL", hint: "€89 / year", placeholder: "price_..." },
    ],
  },
  {
    title: "Wealth · Ultra",
    description: "Lab tier: 12 Advanced screenings/month. €24.99/mo or €199/yr.",
    fields: [
      { key: "stripe_price_wealth_monthly", label: "Monthly", env: "STRIPE_PRICE_WEALTH_MONTHLY", hint: "€24.99 / month", placeholder: "price_..." },
      { key: "stripe_price_wealth_annual", label: "Annual", env: "STRIPE_PRICE_WEALTH_ANNUAL", hint: "€199 / year", placeholder: "price_..." },
    ],
  },
  {
    title: "Screening packs",
    description: "One-time add-on credits (checkout later). Not a subscription.",
    fields: [
      { key: "stripe_price_screening_pack_1", label: "+1 run", env: "STRIPE_PRICE_SCREENING_PACK_1", hint: "€4.99 one-time", placeholder: "price_..." },
      { key: "stripe_price_screening_pack_5", label: "+5 runs", env: "STRIPE_PRICE_SCREENING_PACK_5", hint: "€19.99 one-time", placeholder: "price_..." },
    ],
  },
  {
    title: "Device",
    description: "Leaf hardware: 100% off coupon for one year of Pro.",
    fields: [
      { key: "stripe_coupon_device_free_year", label: "Free-year coupon", env: "STRIPE_COUPON_DEVICE_FREE_YEAR", hint: "coupon_… (not a price id)", placeholder: "coupon_..." },
    ],
  },
];

export const STRIPE_PRICE_ADMIN_FIELDS: StripePriceAdminField[] = STRIPE_PRICE_ADMIN_GROUPS.flatMap((g) => g.fields);

export function stripePriceKeyForPlan(
  plan: SubscriptionPlan,
  interval: BillingInterval,
): StripePriceKey | null {
  if (plan === "free") return null;
  if (plan === "basic") return interval === "annual" ? "stripe_price_basic_annual" : "stripe_price_basic_monthly";
  if (plan === "wealth") return interval === "annual" ? "stripe_price_wealth_annual" : "stripe_price_wealth_monthly";
  return interval === "annual" ? "stripe_price_pro_annual" : "stripe_price_pro_monthly";
}

export function planFromStripePriceKey(key: StripePriceKey): SubscriptionPlan | null {
  if (key.startsWith("stripe_price_basic_")) return "basic";
  if (key.startsWith("stripe_price_wealth_")) return "wealth";
  if (key.startsWith("stripe_price_pro_")) return "pro";
  return null;
}

/** Map a Stripe Price id (or checkout metadata) to a plan. Unknown paid prices default to Pro. */
export function planFromStripePriceId(
  priceId: string | undefined,
  priceConfig: Record<StripePriceKey, string>,
  metadataPlan?: string,
): SubscriptionPlan {
  const fromMeta = metadataPlan?.trim() ? parseSubscriptionPlan(metadataPlan) : "free";
  if (fromMeta !== "free") return fromMeta;
  if (!priceId) return "pro";
  for (const key of Object.keys(priceConfig) as StripePriceKey[]) {
    if (priceConfig[key] && priceConfig[key] === priceId) {
      return planFromStripePriceKey(key) ?? "pro";
    }
  }
  return "pro";
}
