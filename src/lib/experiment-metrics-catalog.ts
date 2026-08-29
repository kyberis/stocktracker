/**
 * Catalog of analytics_events that can be used as experiment conversion metrics.
 *
 * Experiment live stats join assignments → analytics_events by event name
 * after assigned_at. Only events written via trackEvent() (server) or
 * POST /api/analytics/track (client allow-list) appear in those tables.
 *
 * useTrack() / gtag-only events are NOT listed here — they never hit Turso.
 */

export type ExperimentMetricSource = "server" | "client_allowlist" | "both";

export type ExperimentMetricCategory =
  | "experiment"
  | "activation"
  | "portfolio"
  | "import"
  | "billing"
  | "engagement"
  | "ai"
  | "alerts"
  | "social"
  | "other";

export interface ExperimentMetricDefinition {
  /** Exact analytics_events.event value to put in metrics_json */
  key: string;
  /** Short human title */
  title: string;
  /** Where / why it fires */
  description: string;
  /** Code path hint for agents and admins */
  where: string;
  source: ExperimentMetricSource;
  category: ExperimentMetricCategory;
  /** Typical metadata keys (not exhaustive) */
  metadataKeys?: string[];
  /** Good default for empty / onboarding experiments */
  recommendedFor?: string[];
}

export const EXPERIMENT_METRICS_CATALOG: ExperimentMetricDefinition[] = [
  // —— Experiment system ——
  {
    key: "experiment_exposure",
    title: "Experiment exposure",
    description:
      "Fired server-side on first sticky assignment. Used for Exposed counts in live stats — usually do not list as a conversion metric.",
    where: "src/lib/db/experiments.ts → resolveExperimentVariant",
    source: "server",
    category: "experiment",
    metadataKeys: ["experiment", "variant"],
  },
  {
    key: "empty_activation_cta",
    title: "Empty activation CTA click",
    description:
      "User clicked a CTA on the empty portfolio welcome (import, add, Warren).",
    where: "src/components/EmptyPortfolio.tsx → trackExperimentEvent",
    source: "client_allowlist",
    category: "activation",
    metadataKeys: ["cta", "experiment", "variant"],
    recommendedFor: ["empty_activation", "warren_first_stock"],
  },
  {
    key: "first_stock_activation_shown",
    title: "Warren first-stock panel shown",
    description:
      "Treatment: left Warren panel opened after onboarding skip with a prefilled add-stock example.",
    where: "src/components/homepage/HomeV2Dashboard.tsx",
    source: "client_allowlist",
    category: "activation",
    metadataKeys: ["experiment", "variant"],
    recommendedFor: ["warren_first_stock"],
  },
  {
    key: "first_stock_example_sent",
    title: "Warren first-stock example sent",
    description: "User sent the prefilled Apple example (or the Try this example chip) to Warren.",
    where: "src/components/homepage/HomeV2Dashboard.tsx → WarrenDrawer",
    source: "client_allowlist",
    category: "activation",
    metadataKeys: ["experiment", "variant"],
    recommendedFor: ["warren_first_stock"],
  },
  {
    key: "agent_intro_post_action",
    title: "Agent intro post-splash action",
    description:
      "Primary success metric: first meaningful home action after the intro (treatment) or on first home load (control).",
    where: "src/hooks/useAgentIntroPostAction.ts → HomeV2Dashboard / EmptyPortfolio",
    source: "client_allowlist",
    category: "activation",
    metadataKeys: ["experiment", "variant", "dest", "action"],
    recommendedFor: ["agent_intro"],
  },
  {
    key: "agent_intro_completed",
    title: "Agent intro completed",
    description: "User watched the Warren + Clara home intro animation through to the end.",
    where: "src/components/agent-intro/AgentIntroGate.tsx → trackExperimentEvent",
    source: "client_allowlist",
    category: "activation",
    metadataKeys: ["experiment", "variant", "dest"],
    recommendedFor: ["agent_intro"],
  },
  {
    key: "agent_intro_skipped",
    title: "Agent intro skipped",
    description: "User tapped Skip on the Warren + Clara home intro overlay.",
    where: "src/components/agent-intro/AgentIntroGate.tsx → trackExperimentEvent",
    source: "client_allowlist",
    category: "activation",
    metadataKeys: ["experiment", "variant", "dest"],
    recommendedFor: ["agent_intro"],
  },

  // —— Activation / portfolio ——
  {
    key: "holding_add",
    title: "Holding added",
    description: "A holding was created via the holdings API (manual add or similar).",
    where: "src/app/api/holdings/route.ts POST",
    source: "server",
    category: "portfolio",
    metadataKeys: ["ticker"],
    recommendedFor: ["empty_activation", "agent_intro", "warren_first_stock"],
  },
  {
    key: "holding_delete",
    title: "Holding deleted",
    description: "A holding was removed.",
    where: "src/app/api/holdings/route.ts DELETE",
    source: "server",
    category: "portfolio",
    metadataKeys: ["holdingId"],
  },
  {
    key: "warren_action",
    title: "Warren action",
    description:
      "Warren executed a tool action (addHolding, removeHolding, recordTransaction, addCash, createAlert, addWatchlist).",
    where: "src/lib/ai/warren/dispatch.ts",
    source: "server",
    category: "ai",
    metadataKeys: ["action", "ticker"],
    recommendedFor: ["empty_activation", "warren_first_stock"],
  },
  {
    key: "portfolio_import",
    title: "Portfolio import succeeded",
    description: "CSV / AI / broker import finished and wrote transactions or holdings.",
    where: "src/app/api/import-portfolio/route.ts, src/app/api/transactions/import-broker/route.ts",
    source: "server",
    category: "import",
    metadataKeys: ["method", "broker", "count"],
    recommendedFor: ["empty_activation", "warren_first_stock"],
  },
  {
    key: "import_error",
    title: "Import error",
    description: "Import failed (parse, AI, or broker sync). Useful as a negative / friction metric.",
    where: "import + snaptrade routes",
    source: "both",
    category: "import",
    metadataKeys: ["method", "reason", "broker"],
  },
  {
    key: "display_invariant_violation",
    title: "Display invariant violation",
    description:
      "Home totals failed a consistency check (P/L identity, day-change %, invested+cash, sleeves, dual-path). Codes and relative bps only — no amounts.",
    where: "usePortfolioHomeData → POST /api/analytics/track",
    source: "client_allowlist",
    category: "portfolio",
    metadataKeys: ["codes", "max_bps", "surface", "holding_bucket"],
  },

  // —— Onboarding ——
  {
    key: "onboarding_import_method",
    title: "Onboarding import method chosen",
    description: "User selected how they plan to import during onboarding.",
    where: "src/app/api/auth/onboarding/route.ts",
    source: "both",
    category: "activation",
    metadataKeys: ["method"],
  },
  {
    key: "onboarding_trial_activated",
    title: "Onboarding trial activated",
    description: "User activated a trial from onboarding or activation link.",
    where: "src/app/api/auth/onboarding/route.ts, src/app/api/trial/activate/route.ts",
    source: "server",
    category: "billing",
    metadataKeys: ["source"],
  },
  {
    key: "onboarding_trial_skipped",
    title: "Onboarding trial skipped",
    description: "User skipped the trial step in onboarding.",
    where: "src/app/api/auth/onboarding/route.ts",
    source: "server",
    category: "billing",
    metadataKeys: ["source"],
  },
  {
    key: "onboarding_clara_step_viewed",
    title: "Onboarding Clara step viewed",
    description: "User saw the optional Clara activation step in onboarding.",
    where: "src/app/onboarding/page.tsx → POST /api/analytics/track",
    source: "client_allowlist",
    category: "activation",
  },
  {
    key: "onboarding_clara_activate_clicked",
    title: "Onboarding Clara activate clicked",
    description: "User opened Clara login SSO from the onboarding wizard.",
    where: "src/app/onboarding/page.tsx → POST /api/analytics/track",
    source: "client_allowlist",
    category: "activation",
  },
  {
    key: "onboarding_clara_linked",
    title: "Onboarding Clara linked",
    description: "User completed Clara SSO during onboarding (status poll linked).",
    where: "src/app/api/auth/onboarding/route.ts",
    source: "server",
    category: "activation",
    metadataKeys: ["source"],
  },
  {
    key: "onboarding_clara_skipped",
    title: "Onboarding Clara skipped",
    description: "User skipped Clara activation in onboarding. Home money desk still offers create-account.",
    where: "src/app/api/auth/onboarding/route.ts",
    source: "server",
    category: "activation",
    metadataKeys: ["source"],
  },
  {
    key: "signup",
    title: "Signup",
    description: "New account created (email, Google, Apple, etc.).",
    where: "auth signup / OAuth callbacks",
    source: "server",
    category: "activation",
  },
  {
    key: "signup_completed",
    title: "Signup completed",
    description: "Signup flow finished (companion to signup).",
    where: "auth signup / OAuth callbacks",
    source: "server",
    category: "activation",
  },
  {
    key: "login",
    title: "Login",
    description: "User logged in.",
    where: "auth login / OAuth / passkey",
    source: "server",
    category: "engagement",
  },

  // —— Billing ——
  {
    key: "checkout_started",
    title: "Checkout started",
    description: "User started Stripe checkout.",
    where: "billing checkout routes / ProCompareCard (server path)",
    source: "server",
    category: "billing",
  },
  {
    key: "checkout_completed",
    title: "Checkout completed",
    description: "Stripe checkout completed via webhook.",
    where: "src/app/api/billing/webhook/route.ts",
    source: "server",
    category: "billing",
  },
  {
    key: "billing_checkout_started",
    title: "Billing checkout started (detailed)",
    description: "Checkout started with plan/interval metadata.",
    where: "billing checkout routes",
    source: "server",
    category: "billing",
  },
  {
    key: "billing_checkout_completed",
    title: "Billing checkout completed (detailed)",
    description: "Checkout completed with plan metadata.",
    where: "src/app/api/billing/webhook/route.ts",
    source: "server",
    category: "billing",
  },
  {
    key: "paywall_shown",
    title: "Paywall shown",
    description: "Quota or plan gate blocked an action.",
    where: "src/lib/auth/guards.ts",
    source: "server",
    category: "billing",
    metadataKeys: ["feature", "reason"],
  },

  // —— AI / tools ——
  {
    key: "portfolio_review_requested",
    title: "Portfolio review requested",
    description: "User asked for an AI portfolio review.",
    where: "src/app/api/portfolio-review/route.ts",
    source: "server",
    category: "ai",
  },
  {
    key: "portfolio_review_completed",
    title: "Portfolio review completed",
    description: "AI portfolio review finished successfully.",
    where: "src/app/api/portfolio-review/route.ts",
    source: "server",
    category: "ai",
  },
  {
    key: "portfolio_score_requested",
    title: "Portfolio score requested",
    description: "User requested a portfolio score.",
    where: "src/app/api/portfolio/score/route.ts",
    source: "server",
    category: "ai",
  },
  {
    key: "portfolio_score_completed",
    title: "Portfolio score completed",
    description: "Portfolio score generation finished.",
    where: "src/app/api/portfolio/score/route.ts",
    source: "server",
    category: "ai",
  },

  // —— Alerts ——
  {
    key: "alert_created",
    title: "Price alert created",
    description: "User created a price alert.",
    where: "src/app/api/alerts/route.ts POST",
    source: "server",
    category: "alerts",
  },
  {
    key: "alert_triggered",
    title: "Price alert triggered",
    description: "Cron fired an alert condition.",
    where: "src/app/api/cron/check-alerts/route.ts",
    source: "server",
    category: "alerts",
  },

  // —— Share / export ——
  {
    key: "portfolio_share_created",
    title: "Portfolio share link created",
    description: "User created a public portfolio share link.",
    where: "src/app/api/portfolio/share/route.ts",
    source: "server",
    category: "engagement",
  },
  {
    key: "csv_exported",
    title: "CSV exported",
    description: "User exported holdings, cash, or transactions.",
    where: "src/app/api/export/portfolio/route.ts",
    source: "server",
    category: "engagement",
    metadataKeys: ["type", "count"],
  },

  // —— Social / referral (client allow-list + server) ——
  {
    key: "referral_link_copied",
    title: "Referral link copied",
    description: "User copied their referral link (client track allow-list).",
    where: "client → POST /api/analytics/track",
    source: "client_allowlist",
    category: "social",
  },
  {
    key: "referral_link_shared",
    title: "Referral link shared",
    description: "User used the share action for their referral link.",
    where: "client → POST /api/analytics/track",
    source: "client_allowlist",
    category: "social",
  },
  {
    key: "referral_signup",
    title: "Referral signup",
    description: "New user signed up with a referrer.",
    where: "auth signup / OAuth callbacks",
    source: "server",
    category: "social",
    metadataKeys: ["referrerId"],
  },
  {
    key: "people_search",
    title: "People search",
    description: "User searched people in the social network.",
    where: "client → POST /api/analytics/track",
    source: "client_allowlist",
    category: "social",
  },
  {
    key: "feed_view",
    title: "Social feed view",
    description: "User viewed the social feed.",
    where: "client → POST /api/analytics/track",
    source: "client_allowlist",
    category: "social",
  },

  // —— Account ——
  {
    key: "account_delete_started",
    title: "Account delete started",
    description: "User began account deletion (client allow-list).",
    where: "ProfilePage → /api/analytics/track",
    source: "client_allowlist",
    category: "other",
  },
];

export const EXPERIMENT_METRIC_CATEGORY_LABELS: Record<ExperimentMetricCategory, string> = {
  experiment: "Experiment system",
  activation: "Activation / onboarding",
  portfolio: "Portfolio",
  import: "Import",
  billing: "Billing / paywall",
  engagement: "Engagement",
  ai: "AI / tools",
  alerts: "Alerts",
  social: "Social / referral",
  other: "Other",
};

export function getExperimentMetric(key: string): ExperimentMetricDefinition | undefined {
  return EXPERIMENT_METRICS_CATALOG.find((m) => m.key === key);
}

export function listExperimentMetricsByCategory(): {
  category: ExperimentMetricCategory;
  label: string;
  metrics: ExperimentMetricDefinition[];
}[] {
  const order: ExperimentMetricCategory[] = [
    "experiment",
    "activation",
    "portfolio",
    "import",
    "billing",
    "ai",
    "alerts",
    "engagement",
    "social",
    "other",
  ];
  return order
    .map((category) => ({
      category,
      label: EXPERIMENT_METRIC_CATEGORY_LABELS[category],
      metrics: EXPERIMENT_METRICS_CATALOG.filter((m) => m.category === category),
    }))
    .filter((g) => g.metrics.length > 0);
}
