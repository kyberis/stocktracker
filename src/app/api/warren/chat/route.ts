export const dynamic = "force-dynamic";
export const maxDuration = 60;

import type { ModelMessage } from "ai";
import { NextRequest } from "next/server";
import { z } from "zod";

import { requireFeatureQuota } from "@/lib/auth/guards";
import { withMetrics } from "@/lib/with-metrics";
import { runWarrenTurn, serializeWarrenPromptUserLog } from "@/lib/ai/warren/run-turn";
import { buildWarrenPrefetchAppendix } from "@/lib/ai/warren/warren-prefetch-appendix";
import { resolveOfficeIdentity } from "@/lib/ai/office/office-identity";
import {
  buildWarrenMultimodalUserContent,
  WarrenAttachmentError,
  type RawAttachment,
} from "@/lib/ai/warren/preprocess-attachments";
import type { WarrenStreamFrame } from "@/lib/ai/warren/types";
import { listPortfolios, findUserById, countHoldings } from "@/lib/db";
import { refundFeatureQuota } from "@/lib/feature-quotas";
import { checkWarrenEmptyAddRateLimit } from "@/lib/rate-limit";
import { warrenPortfolioSnapshotSchema } from "@/lib/ai/warren/portfolio-snapshot-zod";
import {
  buildHoldingsExplorerSelectionAppendix,
  holdingsExplorerSelectionSchema,
} from "@/lib/ai/warren/holdings-explorer-selection";
import { sanitizeWarrenPortfolioLabel } from "@/lib/ai/prompt-safety";
import type { SubscriptionPlan } from "@/lib/types";
import {
  normalizeWarrenTextMessages,
  normalizeWarrenTextMessagesWithFinalUser,
  type WarrenTextRow,
} from "@/lib/ai/warren/normalize-chat-messages";
import { json401 } from "@/lib/log-unauthorized";
import {
  WARREN_EMPTY_ADD_MAX_CONSULTS,
} from "@/lib/ai/warren/empty-add-stock";

const textMessageSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(12_000),
  })
  .strict();

const sharedPayload = {
  language: z.string().optional(),
  activePortfolioId: z.string().optional(),
  activePortfolioName: z.string().optional(),
  baseCurrency: z.string().default("EUR"),
  isDemo: z.boolean().optional(),
  portfolioContext: warrenPortfolioSnapshotSchema.optional(),
  selectionContext: holdingsExplorerSelectionSchema.optional(),
};

const requestSchema = z
  .object({
    messages: z.array(textMessageSchema).min(1).max(40),
    ...sharedPayload,
  })
  .strict();

const multipartMetaSchema = z
  .object({
    messages: z.array(textMessageSchema).max(40).default([]),
    ...sharedPayload,
  })
  .strict();

function toModelMessages(rows: WarrenTextRow[]): ModelMessage[] {
  return rows.map((m) =>
    m.role === "assistant"
      ? { role: "assistant" as const, content: m.content }
      : { role: "user" as const, content: m.content },
  );
}

export const POST = withMetrics("/api/warren/chat", async (req: NextRequest) => {
  const { session, error } = await requireFeatureQuota(req, "ai_consult");
  if (error) return error;
  if (!session) return json401(req, { source: "api/warren/chat", reason: "no_session" });

  const contentType = req.headers.get("content-type") || "";
  let modelMessages: ModelMessage[];
  let body: z.infer<typeof requestSchema> | z.infer<typeof multipartMetaSchema>;

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const payloadStr = form.get("payload");
      if (typeof payloadStr !== "string") {
        return Response.json({ error: "Invalid multipart: missing payload" }, { status: 400 });
      }
      body = multipartMetaSchema.parse(JSON.parse(payloadStr));

      const userText =
        typeof form.get("userText") === "string" ? (form.get("userText") as string) : "";
      const fileParts = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);

      const raw: RawAttachment[] = [];
      for (const f of fileParts) {
        raw.push({
          buffer: Buffer.from(await f.arrayBuffer()),
          mimeType: f.type || "application/octet-stream",
          filename: f.name || "attachment",
        });
      }

      if (raw.length === 0 && !userText.trim()) {
        return Response.json({ error: "No message or attachments" }, { status: 400 });
      }

      const priorNorm = normalizeWarrenTextMessages(body.messages);

      if (raw.length > 0) {
        try {
          const built = await buildWarrenMultimodalUserContent({
            caption: userText,
            files: raw,
            transcribeLanguageHint: body.language?.slice(0, 5),
          });
          if (typeof built.content === "string") {
            const merged = normalizeWarrenTextMessagesWithFinalUser(priorNorm, built.content);
            if (merged.length === 0) {
              return Response.json({ error: "No message content" }, { status: 400 });
            }
            modelMessages = toModelMessages(merged);
          } else {
            const lastUser: ModelMessage = { role: "user", content: built.content };
            if (priorNorm.length === 0) {
              modelMessages = [lastUser];
            } else {
              modelMessages = [...toModelMessages(priorNorm), lastUser];
            }
          }
        } catch (e) {
          if (e instanceof WarrenAttachmentError) {
            return Response.json({ error: e.message, reason: e.reason }, { status: 400 });
          }
          throw e;
        }
      } else {
        const merged = normalizeWarrenTextMessagesWithFinalUser(priorNorm, userText.trim());
        if (merged.length === 0) {
          return Response.json({ error: "No message content" }, { status: 400 });
        }
        modelMessages = toModelMessages(merged);
      }
    } else {
      body = requestSchema.parse(await req.json());
      const normalized = normalizeWarrenTextMessages(body.messages);
      if (normalized.length === 0) {
        return Response.json({ error: "No message content" }, { status: 400 });
      }
      modelMessages = toModelMessages(normalized);
    }
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const portfolios = await listPortfolios(session.userId);
  let resolvedPortfolioId = body.activePortfolioId;
  if (resolvedPortfolioId && !portfolios.some((p) => p.id === resolvedPortfolioId)) {
    resolvedPortfolioId = undefined;
  }
  const active =
    portfolios.find((p) => p.id === resolvedPortfolioId) ||
    portfolios.find((p) => p.isDefault) ||
    portfolios[0];
  const serverPortfolioId = active?.id;
  const serverPortfolioName = sanitizeWarrenPortfolioLabel(active?.name ?? "");

  const dbUser = await findUserById(session.userId);
  const subscriptionPlan = (dbUser?.plan || session.plan || "free") as SubscriptionPlan;
  const holdingsCount = await countHoldings(session.userId, serverPortfolioId);
  const emptyAddStockOnly = holdingsCount === 0 && !body.isDemo;

  if (emptyAddStockOnly) {
    const burst = await checkWarrenEmptyAddRateLimit(session.userId, session.role);
    if (!burst.allowed) {
      await refundFeatureQuota(session.userId, "ai_consult");
      const minutes = Math.max(1, Math.ceil(burst.retryAfterSec / 60));
      return Response.json(
        {
          error: `You've used ${WARREN_EMPTY_ADD_MAX_CONSULTS} add-stock chats with Warren. Take a ${minutes}-minute break and try again.`,
          reason: "warren_empty_add_cooldown",
          limit: burst.limit,
          remaining: 0,
          retryAfter: burst.retryAfterSec,
          resetAt: burst.resetAt,
        },
        {
          status: 429,
          headers: { "Retry-After": String(burst.retryAfterSec) },
        },
      );
    }
  }

  const officeIdentity = emptyAddStockOnly
    ? null
    : await resolveOfficeIdentity(session.userId);
  const prefetchAppendix = emptyAddStockOnly
    ? null
    : await buildWarrenPrefetchAppendix(serializeWarrenPromptUserLog(modelMessages), {
        userId: session.userId,
        portfolioId: serverPortfolioId,
        snapshot: body.portfolioContext,
      });
  const selectionAppendix =
    !emptyAddStockOnly && body.selectionContext
      ? await buildHoldingsExplorerSelectionAppendix(body.selectionContext, {
          userId: session.userId,
          portfolioId: serverPortfolioId,
        })
      : null;
  const systemAppendix = [selectionAppendix, prefetchAppendix].filter(Boolean).join("\n\n") || null;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (frame: WarrenStreamFrame) => {
        controller.enqueue(encoder.encode(JSON.stringify(frame) + "\n"));
      };

      try {
        await runWarrenTurn({
          userId: session.userId,
          isDemo: !!body.isDemo,
          channel: "web",
          language: body.language,
          baseCurrency: body.baseCurrency,
          activePortfolioId: serverPortfolioId,
          activePortfolioName: serverPortfolioName,
          snapshot: body.portfolioContext,
          officeIdentity,
          messages: modelMessages,
          gatewayHeaders: req.headers,
          systemAppendix: systemAppendix ?? undefined,
          emptyAddStockOnly,
          onFrame: send,
          subscriptionPlan,
        });
      } catch {
        // runWarrenTurn already emitted an "error" frame and logged.
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
});
