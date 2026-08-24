import type { ModelMessage } from "ai";

import { requireFeatureQuotaByUserId } from "@/lib/auth/guards";
import { refundFeatureQuota } from "@/lib/feature-quotas";
import { checkWarrenEmptyAddRateLimit } from "@/lib/rate-limit";
import { WARREN_EMPTY_ADD_MAX_CONSULTS } from "@/lib/ai/warren/empty-add-stock";
import { buildPortfolioSnapshot } from "@/lib/ai/warren/build-snapshot";
import { buildWarrenPrefetchAppendix } from "@/lib/ai/warren/warren-prefetch-appendix";
import { warrenThreadFromModelMessages } from "@/lib/ai/warren/conversation-progress-intent";
import { runWarrenTurn } from "@/lib/ai/warren/run-turn";
import type { SubscriptionPlan } from "@/lib/types";
import { listOfficeMessages, appendOfficeMessage, type OfficeMessageRow } from "@/lib/db/agent-office";
import type { OfficeCoordinationLine, OfficeStreamFrame } from "./types";
import type { RunOfficeOrchestrationInput } from "./orchestrator";

type PersistFn = (
  input: RunOfficeOrchestrationInput,
  role: "warren" | "clara" | "will",
  content: string,
  createdAt: string,
) => Promise<void>;

type EmitFn = (frame: OfficeStreamFrame) => void;

function officeHistoryToModelMessages(rows: OfficeMessageRow[]): ModelMessage[] {
  const out: ModelMessage[] = [];
  for (const row of rows) {
    if (row.role === "user") {
      out.push({ role: "user", content: row.content });
    } else if (row.role === "warren") {
      out.push({ role: "assistant", content: row.content });
    }
  }
  return out;
}

/**
 * Unified Warren AI turn for Agent Office — same motor as the dashboard drawer,
 * plus Clara/Will coordination bubbles when sister tools run.
 */
export async function handleGeneralOfficeQuery(
  input: RunOfficeOrchestrationInput,
  locale: "es" | "en",
  nextTs: () => string,
  persist: PersistFn,
  emitFrame: EmitFn,
): Promise<{ mission: null }> {
  const quota = await requireFeatureQuotaByUserId(input.userId, "ai_consult");
  if (!quota.allowed) {
    const msg =
      locale === "es"
        ? "Alcanzaste el límite mensual de consultas AI. Probá mañana o revisá tu plan."
        : "You've reached the monthly AI consult limit. Try again tomorrow or check your plan.";
    await persist(input, "warren", msg, nextTs());
    return { mission: null };
  }

  const coordinationLines: OfficeCoordinationLine[] = [];

  const [history, snapshot] = await Promise.all([
    listOfficeMessages(input.userId, 24),
    buildPortfolioSnapshot({
      userId: input.userId,
      portfolioId: input.portfolioId,
      baseCurrency: input.baseCurrency || "EUR",
      enrichForPortfolioAi: true,
    }),
  ]);

  const emptyAddStockOnly = (snapshot?.holdingsCount ?? 0) === 0;
  if (emptyAddStockOnly) {
    const burst = await checkWarrenEmptyAddRateLimit(input.userId);
    if (!burst.allowed) {
      await refundFeatureQuota(input.userId, "ai_consult");
      const minutes = Math.max(1, Math.ceil(burst.retryAfterSec / 60));
      const msg =
        locale === "es"
          ? `Usaste ${WARREN_EMPTY_ADD_MAX_CONSULTS} chats para añadir acciones con Warren. Descansa ${minutes} minutos e inténtalo de nuevo.`
          : `You've used ${WARREN_EMPTY_ADD_MAX_CONSULTS} add-stock chats with Warren. Take a ${minutes}-minute break and try again.`;
      await persist(input, "warren", msg, nextTs());
      return { mission: null };
    }
  }

  const messages = officeHistoryToModelMessages(history);
  if (messages.length === 0) {
    messages.push({ role: "user", content: input.userMessage });
  }

  const streamId = `warren-stream-${Date.now()}`;
  let streamed = "";

  const systemAppendix = emptyAddStockOnly
    ? null
    : await buildWarrenPrefetchAppendix(input.userMessage, {
        userId: input.userId,
        portfolioId: input.portfolioId,
        snapshot,
        recentMessages: warrenThreadFromModelMessages(messages),
      });

  try {
    const result = await runWarrenTurn({
      userId: input.userId,
      channel: "office",
      language: input.language,
      baseCurrency: input.baseCurrency || "EUR",
      activePortfolioId: input.portfolioId,
      activePortfolioName: input.activePortfolioName,
      snapshot,
      officeIdentity: emptyAddStockOnly ? null : input.identity,
      messages,
      gatewayHeaders: input.gatewayHeaders,
      subscriptionPlan: (input.subscriptionPlan || "pro") as SubscriptionPlan,
      systemAppendix: systemAppendix ?? undefined,
      emptyAddStockOnly,
      onSisterCoordination: emptyAddStockOnly
        ? undefined
        : (line) => {
            coordinationLines.push(line);
            emitFrame({ kind: "coordination", lines: [...coordinationLines] });
          },
      onSisterAgentMessage: emptyAddStockOnly
        ? undefined
        : async (role, content) => {
            await persist(input, role, content, nextTs());
          },
      onFrame: (frame) => {
        if (frame.kind === "text") {
          streamed += frame.delta;
          emitFrame({ kind: "message_delta", role: "warren", delta: frame.delta, streamId });
        } else if (frame.kind === "part") {
          emitFrame({ kind: "warren_part", part: frame.part });
        } else if (frame.kind === "proposal") {
          emitFrame({ kind: "warren_proposal", proposal: frame.proposal });
        } else if (frame.kind === "tool_step") {
          emitFrame({ kind: "warren_tool_step", label: frame.label });
        } else if (frame.kind === "client_action") {
          emitFrame({ kind: "client_action", action: frame.action, url: frame.url });
        }
      },
    });

    const text = (result.text || streamed).trim();
    if (!text) {
      const fallback =
        locale === "es" ? "No pude generar una respuesta." : "I couldn't generate a response.";
      await persist(input, "warren", fallback, nextTs());
      emitFrame({
        kind: "message",
        role: "warren",
        content: fallback,
        createdAt: nextTs(),
        streamId,
      });
      return { mission: null };
    }

    const createdAt = nextTs();
    await appendOfficeMessage(input.userId, "warren", text, createdAt);
    emitFrame({ kind: "message", role: "warren", content: text, createdAt, streamId });
    return { mission: null };
  } catch {
    await refundFeatureQuota(input.userId, "ai_consult");
    const err =
      locale === "es"
        ? "No pude contactar el servicio de AI ahora. Probá de nuevo en un momento."
        : "Couldn't reach the AI service right now. Try again in a moment.";
    await persist(input, "warren", err, nextTs());
    emitFrame({ kind: "message", role: "warren", content: err, createdAt: nextTs() });
    return { mission: null };
  }
}
