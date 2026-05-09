export const dynamic = "force-dynamic";
export const maxDuration = 60;

import type { ModelMessage } from "ai";
import { NextRequest } from "next/server";
import { z } from "zod";

import { requireFeatureQuota } from "@/lib/auth/guards";
import { withMetrics } from "@/lib/with-metrics";
import { runWarrenTurn } from "@/lib/ai/warren/run-turn";
import {
  buildWarrenMultimodalUserContent,
  WarrenAttachmentError,
  type RawAttachment,
} from "@/lib/ai/warren/preprocess-attachments";
import type { WarrenStreamFrame } from "@/lib/ai/warren/types";
import { listPortfolios } from "@/lib/db";
import { warrenPortfolioSnapshotSchema } from "@/lib/ai/warren/portfolio-snapshot-zod";
import { sanitizeWarrenPortfolioLabel } from "@/lib/ai/prompt-safety";
import { json401 } from "@/lib/log-unauthorized";

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

function toModelMessages(
  rows: z.infer<typeof textMessageSchema>[],
): ModelMessage[] {
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

      let lastUser: ModelMessage;
      if (raw.length > 0) {
        try {
          const built = await buildWarrenMultimodalUserContent({
            caption: userText,
            files: raw,
            transcribeLanguageHint: body.language?.slice(0, 5),
          });
          lastUser = { role: "user", content: built.content };
        } catch (e) {
          if (e instanceof WarrenAttachmentError) {
            return Response.json({ error: e.message, reason: e.reason }, { status: 400 });
          }
          throw e;
        }
      } else {
        lastUser = { role: "user", content: userText.trim() };
      }

      modelMessages = [...toModelMessages(body.messages), lastUser];
    } else {
      body = requestSchema.parse(await req.json());
      modelMessages = toModelMessages(body.messages);
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
          messages: modelMessages,
          gatewayHeaders: req.headers,
          onFrame: send,
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
