export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/guards";
import { getThread, listMessages, addMessage } from "@/lib/db";
import { runWarrenTurn } from "@/lib/ai/warren/run-turn";
import type { WarrenStreamFrame } from "@/lib/ai/warren/types";
import type { ModelMessage } from "ai";
import { json401 } from "@/lib/log-unauthorized";
import { findUserById } from "@/lib/db";
import type { SubscriptionPlan } from "@/lib/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireSession(req);
  if (error) return error;
  if (!session) return json401(req, { source: "api/dream-team/messages", reason: "no_session" });

  const { id } = await params;
  const thread = await getThread(id, session.userId);
  if (!thread) return NextResponse.json({ error: "Thread not found" }, { status: 404 });

  const limit = Number(req.nextUrl.searchParams.get("limit")) || 50;
  const messages = await listMessages(id, limit);
  return NextResponse.json({ messages });
}

const sendSchema = z.object({
  content: z.string().min(1).max(12000),
  language: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireSession(req);
  if (error) return error;
  if (!session) return json401(req, { source: "api/dream-team/messages", reason: "no_session" });

  const { id: threadId } = await params;
  const thread = await getThread(threadId, session.userId);
  if (!thread) return NextResponse.json({ error: "Thread not found" }, { status: 404 });

  const body = await req.json();
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { content, language } = parsed.data;

  await addMessage(threadId, "user", content);

  const history = await listMessages(threadId, 40);
  const modelMessages: ModelMessage[] = history.map((m) =>
    m.role === "assistant"
      ? { role: "assistant" as const, content: m.content }
      : { role: "user" as const, content: m.content }
  );

  if (thread.agent !== "warren") {
    const placeholderText = thread.agent === "clara"
      ? "Clara is not yet connected. The Dream Team integration with Clara is coming soon."
      : "Will is not yet connected. The Dream Team integration with Will is coming soon.";

    await addMessage(threadId, "assistant", placeholderText, thread.agent);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(JSON.stringify({ kind: "text", delta: placeholderText }) + "\n"));
        controller.enqueue(encoder.encode(JSON.stringify({ kind: "done" }) + "\n"));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "X-Accel-Buffering": "no",
        "Cache-Control": "no-cache",
      },
    });
  }

  const user = await findUserById(session.userId);
  const plan: SubscriptionPlan = (user?.plan as SubscriptionPlan) || "free";

  const encoder = new TextEncoder();
  let collectedText = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = await runWarrenTurn({
          userId: session.userId,
          language: language || "en",
          baseCurrency: "EUR",
          messages: modelMessages,
          subscriptionPlan: plan,
          gatewayHeaders: req.headers,
          onFrame: (frame: WarrenStreamFrame) => {
            controller.enqueue(encoder.encode(JSON.stringify(frame) + "\n"));
            if (frame.kind === "text") {
              collectedText += frame.delta;
            }
          },
        });

        await addMessage(threadId, "assistant", result.text || collectedText, "warren");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Agent error";
        controller.enqueue(encoder.encode(JSON.stringify({ kind: "error", message }) + "\n"));
      } finally {
        controller.enqueue(encoder.encode(JSON.stringify({ kind: "done" }) + "\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "X-Accel-Buffering": "no",
      "Cache-Control": "no-cache",
    },
  });
}
