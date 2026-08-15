import type { PlatformFeature } from "@/lib/db/settings";

export type FlowNodeKind = "trigger" | "wait" | "condition" | "email" | "parallel" | "note";
export type FlowStatus = "enabled" | "flag_off" | "paused" | "always_on";
export type EmailBodySource = "code" | "template";

export const HARDCODED_EMAIL_SENDERS = [
  "sendVerificationEmail",
  "sendWelcomeEmail",
  "sendAlertEmail",
  "sendPercentAlertEmail",
  "sendFirstSyncCompleteEmail",
  "sendBifolioUpgradeEmail",
  "sendTrefolioUpgradeEmail",
  "sendTrialInvitationEmail",
  "sendTrialExpiredEmail",
  "sendMembershipGrantInvitationEmail",
  "sendSatisfactionTrustpilotEmail",
  "sendFeedbackAutoAckEmail",
  "sendFeedbackCompletionEmail",
  "sendAccountDeletionEmail",
  "buildWeeklyDigestEmailHtml",
] as const;

export type HardcodedEmailSender = (typeof HARDCODED_EMAIL_SENDERS)[number];

/** Slugs seeded in migrations rather than EMAIL_TEMPLATE_SEEDS. */
export const MIGRATION_SEEDED_TEMPLATE_SLUGS = [
  "broker-integration-request-received",
  "refund-request-received",
  "refund-request-approved",
  "refund-request-rejected",
] as const;

export interface FlowNode {
  id: string;
  kind: FlowNodeKind;
  label: string;
  description: string;
  conditionSummary?: string;
  templateSlug?: string;
  hardcodedSender?: HardcodedEmailSender;
  bodySource?: EmailBodySource;
  featureFlag?: PlatformFeature;
  cronId?: string;
  transactional?: boolean;
  logsToEmailSends?: boolean;
  children?: string[];
  edgeLabels?: Record<string, string>;
}

export interface EmailFlow {
  id: string;
  name: string;
  description: string;
  gatingFlags?: PlatformFeature[];
  entryNodeId: string;
  nodes: FlowNode[];
}

export const EMAIL_FLOWS: EmailFlow[] = [
  {
    id: "onboarding",
    name: "Onboarding / signup",
    description:
      "Signup starts verification and a welcome email in parallel with the user entering the product. After 48–72 hours, users still without holdings get a lifecycle nudge.",
    entryNodeId: "signup",
    nodes: [
      {
        id: "signup",
        kind: "trigger",
        label: "Signup",
        description: "User creates an account (credentials, Google, Apple, or IdP).",
        children: ["verify", "enter-site"],
        edgeLabels: { verify: "Email path", "enter-site": "In-app path" },
      },
      {
        id: "verify",
        kind: "email",
        label: "Confirm your email",
        description: "Transactional verification link. Credentials signup only; OAuth/IdP skip this.",
        hardcodedSender: "sendVerificationEmail",
        bodySource: "code",
        transactional: true,
        logsToEmailSends: false,
      },
      {
        id: "enter-site",
        kind: "parallel",
        label: "User enters the site",
        description: "The product is usable immediately; email confirmation is not a hard gate for OAuth users.",
        children: ["welcome"],
      },
      {
        id: "welcome",
        kind: "email",
        label: "Welcome",
        description:
          "Hardcoded welcome from sendWelcomeEmail. The seeded welcome-free-with-stocks template is not the live send path.",
        hardcodedSender: "sendWelcomeEmail",
        bodySource: "code",
        transactional: false,
        logsToEmailSends: false,
        children: ["wait-activation"],
      },
      {
        id: "wait-activation",
        kind: "wait",
        label: "Wait 48–72 hours",
        description: "Daily lifecycle-activation cron looks at a 24-hour signup window.",
        cronId: "lifecycle-activation",
        children: ["has-holdings"],
      },
      {
        id: "has-holdings",
        kind: "condition",
        label: "Has any holding?",
        description: "Verified users, marketing opt-in, not already sent this template.",
        conditionSummary:
          "email_verified = 1 AND created_at between 48h and 72h ago AND no holdings AND email_notifications_enabled != 0 AND no prior email_sends for welcome-no-stocks",
        featureFlag: "lifecycle_activation_email_enabled",
        cronId: "lifecycle-activation",
        children: ["welcome-no-stocks", "has-holdings-note"],
        edgeLabels: {
          "welcome-no-stocks": "No holdings",
          "has-holdings-note": "Has holdings",
        },
      },
      {
        id: "welcome-no-stocks",
        kind: "email",
        label: "Invite to add a holding",
        description: "DB-seeded lifecycle template inviting the user to import or add a first position.",
        templateSlug: "welcome-no-stocks",
        bodySource: "template",
        featureFlag: "lifecycle_activation_email_enabled",
        cronId: "lifecycle-activation",
        transactional: false,
        logsToEmailSends: true,
      },
      {
        id: "has-holdings-note",
        kind: "note",
        label: "No activation email",
        description:
          "Users who already added a holding skip this cron. Seeded welcome-free-with-stocks exists for admin send; it is not auto-fired.",
        templateSlug: "welcome-free-with-stocks",
        bodySource: "template",
        logsToEmailSends: true,
      },
    ],
  },
  {
    id: "winback",
    name: "Lifecycle winback",
    description: "Re-engage activated users who have gone quiet for two weeks.",
    gatingFlags: ["lifecycle_winback_email_enabled"],
    entryNodeId: "inactive",
    nodes: [
      {
        id: "inactive",
        kind: "trigger",
        label: "14+ days inactive",
        description: "last_active_at (or created_at if never active) is at least 14 days ago.",
        cronId: "lifecycle-winback",
        children: ["winback-eligible"],
      },
      {
        id: "winback-eligible",
        kind: "condition",
        label: "Activated and opted in?",
        description: "Must already have holdings so this does not overlap the no-holdings activation email.",
        conditionSummary:
          "email_verified = 1 AND has holdings AND marketing opt-in AND no prior email_sends for feature-ai-analysis",
        featureFlag: "lifecycle_winback_email_enabled",
        cronId: "lifecycle-winback",
        children: ["winback-email"],
        edgeLabels: { "winback-email": "Yes" },
      },
      {
        id: "winback-email",
        kind: "email",
        label: "AI analysis feature drip",
        description:
          "v1 re-engagement uses the feature-ai-analysis template. Swap the cron slug to any other feature-* template without changing send/dedupe logic.",
        templateSlug: "feature-ai-analysis",
        bodySource: "template",
        featureFlag: "lifecycle_winback_email_enabled",
        cronId: "lifecycle-winback",
        transactional: false,
        logsToEmailSends: true,
      },
    ],
  },
  {
    id: "weekly-digest",
    name: "Weekly portfolio digest",
    description: "Monday AI portfolio summary for opted-in users with holdings.",
    gatingFlags: ["weekly_digest_enabled"],
    entryNodeId: "monday",
    nodes: [
      {
        id: "monday",
        kind: "trigger",
        label: "Monday 08:00 UTC",
        description: "weekly-digest cron. Requires AI Gateway.",
        cronId: "weekly-digest",
        children: ["digest-eligible"],
      },
      {
        id: "digest-eligible",
        kind: "condition",
        label: "Eligible for digest?",
        description:
          "Pro by default; free users only when weekly_digest_free_tier_enabled is on. Per-user weekly_digest_enabled and marketing opt-in still apply.",
        conditionSummary:
          "(plan = pro OR (free AND weekly_digest_free_tier_enabled)) AND users.weekly_digest_enabled = 1 AND email_verified AND marketing opt-in AND has holdings AND no digest row for this week AND weekly_digest_enabled flag for user",
        featureFlag: "weekly_digest_free_tier_enabled",
        cronId: "weekly-digest",
        children: ["digest-email"],
        edgeLabels: { "digest-email": "Eligible" },
      },
      {
        id: "digest-email",
        kind: "email",
        label: "Weekly portfolio digest",
        description:
          "HTML is built in weekly-digest-email.ts. Sends are logged to email_sends without a template_id, so slug stats stay empty.",
        hardcodedSender: "buildWeeklyDigestEmailHtml",
        bodySource: "code",
        featureFlag: "weekly_digest_enabled",
        cronId: "weekly-digest",
        transactional: false,
        logsToEmailSends: true,
      },
    ],
  },
  {
    id: "trial",
    name: "Trial invite / expire",
    description: "Invite eligible free users after one week, then email when the trial ends.",
    gatingFlags: ["commerce_enabled", "pro_trial_enabled"],
    entryNodeId: "week-old",
    nodes: [
      {
        id: "week-old",
        kind: "trigger",
        label: "Signup + 7 days",
        description: "Daily trial-invitations cron; 24-hour eligibility window (7–8 days after signup).",
        cronId: "trial-invitations",
        children: ["trial-eligible"],
      },
      {
        id: "trial-eligible",
        kind: "condition",
        label: "Free, active, not invited?",
        description: "Must have holdings or transactions. Commerce and Pro trial flags must both be on.",
        conditionSummary:
          "plan = free AND trial_invited_at empty AND trial_activated_at empty AND email_verified AND created_at 7–8 days ago AND (holdings OR transactions)",
        featureFlag: "pro_trial_enabled",
        cronId: "trial-invitations",
        children: ["trial-invite"],
        edgeLabels: { "trial-invite": "Eligible" },
      },
      {
        id: "trial-invite",
        kind: "email",
        label: "Trial invitation",
        description:
          "Live body is sendTrialInvitationEmail. Sends are attributed to the trial-invitation template for stats.",
        hardcodedSender: "sendTrialInvitationEmail",
        templateSlug: "trial-invitation",
        bodySource: "code",
        cronId: "trial-invitations",
        transactional: false,
        logsToEmailSends: true,
        children: ["trial-ends"],
      },
      {
        id: "trial-ends",
        kind: "wait",
        label: "Trial period ends",
        description: "Hourly trial-expiration cron finds plan_expires_at in the past.",
        cronId: "trial-expiration",
        children: ["trial-expired"],
      },
      {
        id: "trial-expired",
        kind: "email",
        label: "Trial expired",
        description:
          "Downgrades to free, then sendTrialExpiredEmail. Seeded trial-expired template is not the live body.",
        hardcodedSender: "sendTrialExpiredEmail",
        templateSlug: "trial-expired",
        bodySource: "code",
        featureFlag: "pro_trial_enabled",
        cronId: "trial-expiration",
        transactional: false,
        logsToEmailSends: false,
      },
    ],
  },
  {
    id: "alerts",
    name: "Price / percent alerts",
    description: "Transactional alert mail when a user-configured threshold is hit.",
    entryNodeId: "threshold",
    nodes: [
      {
        id: "threshold",
        kind: "trigger",
        label: "Alert threshold hit",
        description: "check-alerts evaluates active alerts every 15 minutes.",
        cronId: "check-alerts",
        children: ["alert-type"],
      },
      {
        id: "alert-type",
        kind: "condition",
        label: "Alert type",
        description: "Price target vs percent-move. Delivery also respects user alert_channels.",
        conditionSummary: "Active alert whose threshold is crossed; email channel enabled on user_settings.alert_channels",
        children: ["price-alert", "percent-alert"],
        edgeLabels: { "price-alert": "Price", "percent-alert": "Percent" },
      },
      {
        id: "price-alert",
        kind: "email",
        label: "Price alert",
        description: "Hardcoded transactional email from sendAlertEmail.",
        hardcodedSender: "sendAlertEmail",
        bodySource: "code",
        cronId: "check-alerts",
        transactional: true,
        logsToEmailSends: false,
      },
      {
        id: "percent-alert",
        kind: "email",
        label: "Percent alert",
        description: "Hardcoded transactional email from sendPercentAlertEmail.",
        hardcodedSender: "sendPercentAlertEmail",
        bodySource: "code",
        cronId: "check-alerts",
        transactional: true,
        logsToEmailSends: false,
      },
    ],
  },
  {
    id: "transactional",
    name: "Event-triggered emails",
    description: "Spot emails fired by product events rather than a multi-step journey.",
    entryNodeId: "product-event",
    nodes: [
      {
        id: "product-event",
        kind: "trigger",
        label: "Product event",
        description: "Each child is an independent send. Not a sequential campaign.",
        children: [
          "first-sync",
          "upgrade-bifolio",
          "upgrade-trefolio",
          "membership-grant",
          "feedback-ack",
          "feedback-done",
          "trustpilot",
          "account-delete",
          "broker-request",
          "refund-received",
        ],
      },
      {
        id: "first-sync",
        kind: "email",
        label: "First broker sync complete",
        description: "Transactional confirmation after the first SnapTrade/broker sync finishes.",
        hardcodedSender: "sendFirstSyncCompleteEmail",
        bodySource: "code",
        transactional: true,
        logsToEmailSends: false,
      },
      {
        id: "upgrade-bifolio",
        kind: "email",
        label: "Bifolio upgrade",
        description: "Hardcoded upgrade mail. Seeded upgrade-bifolio is available for admin send.",
        hardcodedSender: "sendBifolioUpgradeEmail",
        templateSlug: "upgrade-bifolio",
        bodySource: "code",
        transactional: false,
        logsToEmailSends: false,
      },
      {
        id: "upgrade-trefolio",
        kind: "email",
        label: "Trefolio upgrade",
        description: "Hardcoded upgrade mail. Seeded upgrade-trefolio is available for admin send.",
        hardcodedSender: "sendTrefolioUpgradeEmail",
        templateSlug: "upgrade-trefolio",
        bodySource: "code",
        transactional: false,
        logsToEmailSends: false,
      },
      {
        id: "membership-grant",
        kind: "email",
        label: "Membership grant invite",
        description: "Admin-granted Pro access invitation.",
        hardcodedSender: "sendMembershipGrantInvitationEmail",
        bodySource: "code",
        transactional: true,
        logsToEmailSends: false,
      },
      {
        id: "feedback-ack",
        kind: "email",
        label: "Feedback auto-ack",
        description: "Automated acknowledgement when feedback is submitted.",
        hardcodedSender: "sendFeedbackAutoAckEmail",
        bodySource: "code",
        transactional: true,
        logsToEmailSends: false,
      },
      {
        id: "feedback-done",
        kind: "email",
        label: "Feedback completion",
        description: "Admin-approved completion email after a feedback ticket is resolved.",
        hardcodedSender: "sendFeedbackCompletionEmail",
        bodySource: "code",
        transactional: true,
        logsToEmailSends: false,
      },
      {
        id: "trustpilot",
        kind: "email",
        label: "Trustpilot follow-up",
        description: "Sent after a high satisfaction-survey rating.",
        hardcodedSender: "sendSatisfactionTrustpilotEmail",
        bodySource: "code",
        transactional: false,
        logsToEmailSends: false,
      },
      {
        id: "account-delete",
        kind: "email",
        label: "Confirm account deletion",
        description: "Transactional confirmation link before permanent delete.",
        hardcodedSender: "sendAccountDeletionEmail",
        bodySource: "code",
        transactional: true,
        logsToEmailSends: false,
      },
      {
        id: "broker-request",
        kind: "email",
        label: "Broker integration request received",
        description: "Confirms a user-submitted broker request.",
        templateSlug: "broker-integration-request-received",
        bodySource: "template",
        transactional: true,
        logsToEmailSends: true,
      },
      {
        id: "refund-received",
        kind: "email",
        label: "Refund request received",
        description: "Ack for a refund request. Approved/rejected variants use refund-request-approved and refund-request-rejected.",
        templateSlug: "refund-request-received",
        bodySource: "template",
        transactional: true,
        logsToEmailSends: true,
      },
    ],
  },
];

export function listFlowTemplateSlugs(): string[] {
  const slugs = new Set<string>();
  for (const flow of EMAIL_FLOWS) {
    for (const node of flow.nodes) {
      if (node.templateSlug) slugs.add(node.templateSlug);
    }
  }
  return [...slugs];
}

export function listFlowFeatureFlags(): PlatformFeature[] {
  const flags = new Set<PlatformFeature>();
  for (const flow of EMAIL_FLOWS) {
    for (const flag of flow.gatingFlags ?? []) flags.add(flag);
    for (const node of flow.nodes) {
      if (node.featureFlag) flags.add(node.featureFlag);
    }
  }
  return [...flags];
}

export function listFlowCronIds(): string[] {
  const ids = new Set<string>();
  for (const flow of EMAIL_FLOWS) {
    for (const node of flow.nodes) {
      if (node.cronId) ids.add(node.cronId);
    }
  }
  return [...ids];
}

export interface TemplateSendWindowStatsView {
  sent7d: number;
  sent30d: number;
  delivered7d: number;
  delivered30d: number;
  bounced7d: number;
  bounced30d: number;
  failed7d: number;
  failed30d: number;
}

export interface EnrichedTemplatePreview {
  id: string;
  slug: string;
  name: string;
  subject: string;
  subjectEs: string;
  bodyHtml: string;
  bodyHtmlEs: string;
  bodyText: string;
  bodyTextEs: string;
  category: string;
  stats: TemplateSendWindowStatsView | null;
}

export interface EnrichedEmailFlow extends EmailFlow {
  status: FlowStatus;
}

export interface EnrichedCronMeta {
  name: string;
  path: string;
  schedule: string;
  description: string;
  paused?: boolean;
}

export interface EnrichedEmailFlowsResponse {
  flows: EnrichedEmailFlow[];
  flags: Record<string, boolean>;
  crons: Record<string, EnrichedCronMeta>;
  templates: Record<string, EnrichedTemplatePreview>;
}

export function computeFlowStatus(opts: {
  gatingFlags: { enabled: boolean }[];
  crons: { paused?: boolean }[];
}): FlowStatus {
  if (opts.crons.some((cron) => cron.paused)) return "paused";
  if (opts.gatingFlags.length > 0 && opts.gatingFlags.some((flag) => !flag.enabled)) {
    return "flag_off";
  }
  if (opts.gatingFlags.length > 0) return "enabled";
  return "always_on";
}
