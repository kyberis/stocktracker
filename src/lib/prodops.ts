import { createHmac, randomUUID, timingSafeEqual } from "crypto";

import type {
  ProdOpsConfig,
  ProdOpsEventType,
  ProdOpsOutboxEvent,
  ProdOpsSourceApp,
} from "@/lib/types";

import { findUserById } from "@/lib/db/users";
import {
  createProdOpsEvent,
  getProdOpsEventByDedupeKey,
  listProdOpsEventsReady,
  markProdOpsEventDropped,
  markProdOpsEventSent,
  scheduleProdOpsEventRetry,
} from "@/lib/db/ops-events";
import { getProdOpsConfig, getProdOpsSharedSecret } from "@/lib/db/settings";
import { str } from "@/lib/db/helpers";

const PRODOPS_SOURCE_APP = "trefolio" as const;
const PRODOPS_MAX_ATTEMPTS = 8;
const RETRY_DELAYS_MINUTES = [1, 5, 15, 30, 60, 180, 720, 1440] as const;

export interface ProdOpsDispatchDestination {
  label: string;
  chatId: string;
  messageThreadId?: number;
}

export interface ProdOpsEnvelope {
  eventId: string;
  eventType: ProdOpsEventType;
  occurredAt: string;
  sourceApp: ProdOpsSourceApp;
  summary: string;
  adminUrl: string;
  actor: {
    userId: string;
    email?: string;
    displayName?: string;
    username?: string;
  };
  metadata: Record<string, unknown>;
  destinations: ProdOpsDispatchDestination[];
  /** Optional inline Telegram actions (portfolio_anomaly). */
  actions?: Array<{ id: string; label: string }>;
}

function getAppBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`.replace(/\/+$/, "");
  return "https://trefolio.com";
}

export function buildProdOpsAdminUrl(path: string): string {
  const base = getAppBaseUrl();
  const nextPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${nextPath}`;
}

function nextRetryAtForAttempt(attempts: number): string {
  const delay = RETRY_DELAYS_MINUTES[Math.min(attempts, RETRY_DELAYS_MINUTES.length - 1)];
  return new Date(Date.now() + delay * 60 * 1000).toISOString();
}

function parseMetadata(event: ProdOpsOutboxEvent): Record<string, unknown> {
  try {
    const parsed = JSON.parse(event.payloadJson) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Drop malformed payloads later during dispatch.
  }
  return {};
}

function isAlwaysEnabledProdOpsEvent(eventType: ProdOpsEventType): boolean {
  return (
    eventType === "test_notification" ||
    eventType === "ops_digest" ||
    eventType === "screening_provider_quota" ||
    eventType === "support_user_returned"
  );
}

function resolveDestinations(config: ProdOpsConfig, eventType: ProdOpsEventType): ProdOpsDispatchDestination[] {
  const allowByGlobal =
    isAlwaysEnabledProdOpsEvent(eventType) || config.enabledEventTypes.includes(eventType);
  if (!allowByGlobal) return [];

  const recipient = config.recipient;
  if (!recipient?.chatId || !recipient.enabled) return [];
  if (
    !isAlwaysEnabledProdOpsEvent(eventType) &&
    !recipient.enabledEventTypes.includes(eventType)
  ) {
    return [];
  }

  return [
    {
      label: recipient.label,
      chatId: recipient.chatId,
      messageThreadId: recipient.messageThreadId,
    },
  ];
}

export function signProdOpsBody(body: string, secret: string, timestamp: string): string {
  const mac = createHmac("sha256", secret);
  mac.update(`${timestamp}.${body}`);
  return `sha256=${mac.digest("hex")}`;
}

export function verifyProdOpsBodySignature(input: {
  body: string;
  secret: string;
  timestamp: string;
  signature: string;
  maxAgeSeconds?: number;
}): boolean {
  const issuedAt = Number.parseInt(input.timestamp, 10);
  if (!Number.isFinite(issuedAt)) return false;
  const maxAge = input.maxAgeSeconds ?? 300;
  const age = Math.abs(Math.floor(Date.now() / 1000) - issuedAt);
  if (age > maxAge) return false;

  const expected = signProdOpsBody(input.body, input.secret, input.timestamp);
  const a = Buffer.from(expected);
  const b = Buffer.from(input.signature);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

async function postProdOpsEnvelope(baseUrl: string, secret: string, envelope: ProdOpsEnvelope): Promise<Response> {
  const body = JSON.stringify(envelope);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = signProdOpsBody(body, secret, timestamp);
  return fetch(`${baseUrl.replace(/\/+$/, "")}/api/intake`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-ProdOps-Timestamp": timestamp,
      "X-ProdOps-Signature": signature,
    },
    body,
  });
}

function actionsFromMetadata(
  eventType: ProdOpsEventType,
  metadata: Record<string, unknown>,
): Array<{ id: string; label: string }> | undefined {
  if (eventType !== "portfolio_anomaly") return undefined;
  const raw = metadata.actions;
  if (!Array.isArray(raw)) return undefined;
  const actions: Array<{ id: string; label: string }> = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const id = String((item as { id?: unknown }).id || "").trim();
    const label = String((item as { label?: unknown }).label || "").trim();
    if (!id || !label) continue;
    actions.push({ id, label });
  }
  return actions.length > 0 ? actions : undefined;
}

function actorFromMetadata(
  userId: string,
  metadata: Record<string, unknown>,
): ProdOpsEnvelope["actor"] {
  return {
    userId,
    email: typeof metadata.email === "string" ? metadata.email : undefined,
    displayName: typeof metadata.displayName === "string" ? metadata.displayName : undefined,
    username: typeof metadata.username === "string" ? metadata.username : undefined,
  };
}

async function buildEnvelope(
  event: ProdOpsOutboxEvent,
  destinations: ProdOpsDispatchDestination[],
): Promise<ProdOpsEnvelope | null> {
  const metadata = parseMetadata(event);
  const actions = actionsFromMetadata(event.eventType, metadata);
  const sourceApp: ProdOpsSourceApp = event.sourceApp === "accounts" ? "accounts" : "trefolio";

  if (sourceApp === "accounts") {
    return {
      eventId: event.id,
      eventType: event.eventType,
      occurredAt: event.createdAt,
      sourceApp,
      summary: event.summary,
      adminUrl: event.adminUrl,
      actor: actorFromMetadata(event.userId, metadata),
      metadata,
      destinations,
      ...(actions ? { actions } : {}),
    };
  }

  const user = await findUserById(event.userId);
  if (!user) {
    if (event.eventType !== "screening_provider_quota") return null;
    return {
      eventId: event.id,
      eventType: event.eventType,
      occurredAt: event.createdAt,
      sourceApp,
      summary: event.summary,
      adminUrl: event.adminUrl,
      actor: actorFromMetadata(event.userId || "system", metadata),
      metadata,
      destinations,
    };
  }

  return {
    eventId: event.id,
    eventType: event.eventType,
    occurredAt: event.createdAt,
    sourceApp,
    summary: event.summary,
    adminUrl: event.adminUrl,
    actor: {
      userId: user.id,
      email: user.email || undefined,
      displayName: user.display_name || undefined,
      username: user.username || undefined,
    },
    metadata,
    destinations,
    ...(actions ? { actions } : {}),
  };
}

export async function dispatchPendingProdOpsEvents(limit = 25): Promise<{
  pending: number;
  sent: number;
  dropped: number;
  failed: number;
  skipped: number;
}> {
  const config = await getProdOpsConfig();
  const secret = await getProdOpsSharedSecret();

  if (!config.enabled || !config.baseUrl || !secret) {
    return { pending: 0, sent: 0, dropped: 0, failed: 0, skipped: 0 };
  }

  const events = await listProdOpsEventsReady(limit);
  let sent = 0;
  let dropped = 0;
  let failed = 0;

  for (const event of events) {
    const destinations = resolveDestinations(config, event.eventType);
    if (destinations.length === 0) {
      await markProdOpsEventDropped(event.id, "no_matching_destinations");
      dropped += 1;
      continue;
    }

    const envelope = await buildEnvelope(event, destinations);
    if (!envelope) {
      await markProdOpsEventDropped(event.id, "user_not_found");
      dropped += 1;
      continue;
    }

    try {
      const response = await postProdOpsEnvelope(config.baseUrl, secret, envelope);
      if (!response.ok) {
        const text = (await response.text().catch(() => "")).slice(0, 500);
        const dead = event.attempts + 1 >= PRODOPS_MAX_ATTEMPTS;
        await scheduleProdOpsEventRetry(
          event.id,
          `prodops_http_${response.status}${text ? `:${text}` : ""}`,
          nextRetryAtForAttempt(event.attempts),
          dead,
        );
        failed += 1;
        continue;
      }
      await markProdOpsEventSent(event.id);
      sent += 1;
    } catch (error) {
      const dead = event.attempts + 1 >= PRODOPS_MAX_ATTEMPTS;
      await scheduleProdOpsEventRetry(
        event.id,
        error instanceof Error ? error.message : String(error),
        nextRetryAtForAttempt(event.attempts),
        dead,
      );
      failed += 1;
    }
  }

  return {
    pending: events.length,
    sent,
    dropped,
    failed,
    skipped: 0,
  };
}

export async function enqueueProdOpsIngestEvent(input: {
  eventType: ProdOpsEventType;
  userId: string;
  dedupeKey: string;
  summary: string;
  adminUrl: string;
  metadata: Record<string, unknown>;
  sourceApp: "accounts";
}): Promise<{ id: string; deduped: boolean }> {
  const existing = await getProdOpsEventByDedupeKey(input.dedupeKey);
  if (existing) return { id: existing.id, deduped: true };
  const created = await createProdOpsEvent({
    eventType: input.eventType,
    userId: input.userId,
    dedupeKey: input.dedupeKey,
    summary: input.summary,
    adminUrl: input.adminUrl,
    payload: input.metadata,
    sourceApp: input.sourceApp,
  });
  return { id: created.id, deduped: false };
}

async function createNamedProdOpsEvent(input: {
  eventType: ProdOpsEventType;
  userId: string;
  dedupeKey: string;
  summary: string;
  adminPath: string;
  metadata: Record<string, unknown>;
}): Promise<void> {
  await createProdOpsEvent({
    eventType: input.eventType,
    userId: input.userId,
    dedupeKey: input.dedupeKey,
    summary: input.summary,
    adminUrl: buildProdOpsAdminUrl(input.adminPath),
    payload: input.metadata,
    sourceApp: PRODOPS_SOURCE_APP,
  });
}

function chooseUserLabel(user: Awaited<ReturnType<typeof findUserById>>): string {
  if (!user) return "unknown user";
  return user.display_name || user.username || user.email || user.id;
}

export async function enqueueProdOpsUserRegisteredEvent(params: {
  userId: string;
  method: string;
}): Promise<void> {
  const user = await findUserById(params.userId);
  await createNamedProdOpsEvent({
    eventType: "user_registered",
    userId: params.userId,
    dedupeKey: `user_registered:${params.userId}`,
    summary: `New user registered via ${params.method}: ${chooseUserLabel(user)}`,
    adminPath: `/admin/users/${params.userId}`,
    metadata: {
      method: params.method,
      email: user?.email || "",
      displayName: user?.display_name || "",
      username: user?.username || "",
    },
  });
}

export async function enqueueProdOpsMembershipPaidEvent(params: {
  userId: string;
  plan: string;
  source: string;
  externalId: string;
  mode?: string;
}): Promise<void> {
  const user = await findUserById(params.userId);
  await createNamedProdOpsEvent({
    eventType: "membership_paid",
    userId: params.userId,
    dedupeKey: `membership_paid:${params.externalId}`,
    summary: `Membership paid (${params.plan}): ${chooseUserLabel(user)}`,
    adminPath: `/admin/users/${params.userId}`,
    metadata: {
      plan: params.plan,
      source: params.source,
      externalId: params.externalId,
      mode: params.mode || "",
      email: user?.email || "",
    },
  });
}

export async function enqueueProdOpsFeedbackReceivedEvent(params: {
  feedbackId: string;
  userId: string;
  subject: string;
  type: string;
}): Promise<void> {
  const user = await findUserById(params.userId);
  await createNamedProdOpsEvent({
    eventType: "feedback_received",
    userId: params.userId,
    dedupeKey: `feedback_received:${params.feedbackId}`,
    summary: `New ${params.type} feedback from ${chooseUserLabel(user)}: ${params.subject}`,
    adminPath: "/admin/feedback",
    metadata: {
      feedbackId: params.feedbackId,
      subject: params.subject,
      type: params.type,
      username: user?.username || "",
      email: user?.email || "",
    },
  });
}

export async function enqueueProdOpsBrokerRequestCreatedEvent(params: {
  requestId: string;
  userId: string;
  brokerName: string;
}): Promise<void> {
  const user = await findUserById(params.userId);
  await createNamedProdOpsEvent({
    eventType: "broker_request_created",
    userId: params.userId,
    dedupeKey: `broker_request_created:${params.requestId}`,
    summary: `Broker request for ${params.brokerName} from ${chooseUserLabel(user)}`,
    adminPath: "/admin/integration-requests",
    metadata: {
      requestId: params.requestId,
      brokerName: params.brokerName,
      email: user?.email || "",
      username: user?.username || "",
    },
  });
}

export async function enqueueProdOpsTrialActivatedEvent(params: {
  userId: string;
  source: string;
  planExpiresAt: string;
}): Promise<void> {
  const user = await findUserById(params.userId);
  await createNamedProdOpsEvent({
    eventType: "trial_activated",
    userId: params.userId,
    dedupeKey: `trial_activated:${params.source}:${params.userId}`,
    summary: `7-day trial activated via ${params.source}: ${chooseUserLabel(user)}`,
    adminPath: `/admin/users/${params.userId}`,
    metadata: {
      source: params.source,
      planExpiresAt: params.planExpiresAt,
      email: user?.email || "",
    },
  });
}

export async function enqueueProdOpsTestEvent(adminUserId: string): Promise<void> {
  const user = await findUserById(adminUserId);
  await createNamedProdOpsEvent({
    eventType: "test_notification",
    userId: adminUserId,
    dedupeKey: `test_notification:${randomUUID()}`,
    summary: `Test notification triggered from admin settings by ${chooseUserLabel(user)}`,
    adminPath: "/admin/settings",
    metadata: {
      triggeredBy: adminUserId,
      email: user?.email || "",
    },
  });
}

export async function enqueueProdOpsScreeningProviderQuotaEvent(params: {
  provider: string;
  statusCode?: number;
  detail: string;
  trippedAt: string;
  generation: number;
}): Promise<void> {
  const status = params.statusCode != null ? ` (${params.statusCode})` : "";
  await createNamedProdOpsEvent({
    eventType: "screening_provider_quota",
    userId: "system",
    dedupeKey: `screening_provider_quota:${params.generation}`,
    summary: `Screening paused: ${params.provider} quota/rate-limit${status}. New screens hidden; existing reports stay available.`,
    adminPath: "/admin/screening-costs?circuit=1",
    metadata: {
      provider: params.provider,
      statusCode: params.statusCode ?? "",
      detail: params.detail.slice(0, 300),
      trippedAt: params.trippedAt,
      generation: params.generation,
    },
  });
}

export async function enqueueProdOpsPortfolioAnomalyEvent(params: {
  anomalyId: string;
  userId: string;
  severity: string;
  codes: string[];
  summary: string;
}): Promise<void> {
  const user = await findUserById(params.userId);
  const day = new Date().toISOString().slice(0, 10);
  await createNamedProdOpsEvent({
    eventType: "portfolio_anomaly",
    userId: params.userId,
    dedupeKey: `anomaly:${params.userId}:${params.anomalyId}:${day}`,
    summary: params.summary.slice(0, 480),
    adminPath: `/admin/anomalies?id=${encodeURIComponent(params.anomalyId)}`,
    metadata: {
      anomalyId: params.anomalyId,
      severity: params.severity,
      codes: params.codes.join(", "),
      username: user?.username || "",
      email: user?.email || "",
      actions: [
        { id: `pa|${params.anomalyId}|ack`, label: "Ack" },
        { id: `pa|${params.anomalyId}|apply_safe_fix`, label: "Apply safe fix" },
        { id: `pa|${params.anomalyId}|dismiss`, label: "Dismiss" },
      ],
    },
  });
}

export async function enqueueProdOpsSupportUserReturnedEvent(params: {
  userId: string;
  reason: string;
  emailSentAt: string;
}): Promise<void> {
  const user = await findUserById(params.userId);
  const label = chooseUserLabel(user);
  await createNamedProdOpsEvent({
    eventType: "support_user_returned",
    userId: params.userId,
    dedupeKey: `support_return:${params.userId}:${params.reason}`,
    summary: `${label} returned after holdings restore email (${params.emailSentAt} UTC).`,
    adminPath: `/admin/users/${encodeURIComponent(params.userId)}`,
    metadata: {
      reason: params.reason,
      emailSentAt: params.emailSentAt,
      username: user?.username || "",
      email: user?.email || "",
    },
  });
}

export function getProdOpsDestinationLabels(config: ProdOpsConfig): string[] {
  return config.recipient?.label ? [str(config.recipient.label)] : [];
}
