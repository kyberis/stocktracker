export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { requireFeatureQuota } from "@/lib/auth/guards";
import { refundFeatureQuota } from "@/lib/feature-quotas";
import {
  isFeatureEnabledForUser,
  getPlatformSetting,
  createSupportChatConversation,
  appendSupportChatMessages,
  incrementAiTokenUsage,
  incrementDailyAiTokenUsage,
  insertAiLog,
  getAiModelForFlow,
} from "@/lib/db";
import { supportChatTotal, supportChatDuration } from "@/lib/metrics";
import { checkGlobalAiCap, incrementGlobalAiCalls, incrementGlobalAiTokens } from "@/lib/rate-limit";
import { createAiStream } from "@/lib/ai-stream";
import { languageCodeToName } from "@/lib/languages";
import { withMetrics } from "@/lib/with-metrics";
import { parseBody } from "@/lib/api-response";
import { supportChatMessageSchema } from "@/lib/schemas";
import { buildSupportSystemPrompt } from "@/lib/support-knowledge";
import { json401 } from "@/lib/log-unauthorized";
import { fetchGatewayChatCompletions, resolveGatewayApiKey } from "@/lib/ai/gateway";
import type { ChatMessage } from "@/lib/db";

export const POST = withMetrics("/api/support-chat", async (request: NextRequest) => {
  const { session, error } = await requireFeatureQuota(request, "support_chat");
  if (error) return error;
  if (!session) return json401(request, { source: "api/support-chat", reason: "no_session" });

  const enabled = await isFeatureEnabledForUser("support_chat_enabled", session.userId);
  if (!enabled) {
    await refundFeatureQuota(session.userId, "support_chat");
    return Response.json({ error: "Support chat is not available" }, { status: 404 });
  }

  const parsed = await parseBody(request, supportChatMessageSchema);
  if (!parsed.success) {
    await refundFeatureQuota(session.userId, "support_chat");
    return parsed.error;
  }
  const { conversationId, messages, language, portfolioContext } = parsed.data;

  const globalCap = await checkGlobalAiCap(session.role);
  if (!globalCap.allowed) {
    await refundFeatureQuota(session.userId, "support_chat");
    return Response.json(
      { error: "Platform AI usage limit reached. Please try again next month.", used: globalCap.used, cap: globalCap.cap },
      { status: 429, headers: { "Retry-After": "86400" } },
    );
  }

  const gatewayConfigured = await resolveGatewayApiKey(request.headers);
  if (!gatewayConfigured) {
    await refundFeatureQuota(session.userId, "support_chat");
    return Response.json(
      { error: "AI service not configured." },
      { status: 501 }
    );
  }

  const lang = languageCodeToName(language || "en");
  const customInstructions = await getPlatformSetting("support_chat_instructions");
  const systemPrompt = buildSupportSystemPrompt(lang, customInstructions || "", portfolioContext);

  const lastUserMsg = messages.filter(m => m.role === "user").pop();
  const now = new Date().toISOString();
  const userChatMsg: ChatMessage = {
    role: "user",
    content: lastUserMsg?.content || "",
    timestamp: now,
  };

  const isNewConversation = messages.filter(m => m.role === "user").length === 1;
  if (isNewConversation) {
    await createSupportChatConversation(conversationId, session.userId, [userChatMsg]).catch(() => {});
  } else {
    await appendSupportChatMessages(conversationId, [userChatMsg]).catch(() => {});
  }

  const openaiMessages = [
    { role: "system" as const, content: systemPrompt },
    ...messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];

  const model = await getAiModelForFlow("support_chat");
  const endTimer = supportChatDuration.startTimer();
  const aiLogStart = Date.now();
  const lastUserContent = lastUserMsg?.content || "";

  try {
    const openaiRes = await fetchGatewayChatCompletions(
      {
        model,
        stream: true,
        stream_options: { include_usage: true },
        max_tokens: 800,
        temperature: 0.4,
        messages: openaiMessages,
      },
      { headers: request.headers },
    );

    endTimer();
    const durationMs = Date.now() - aiLogStart;

    if (!openaiRes.ok) {
      supportChatTotal.inc({ status: "error" });
      const errText = await openaiRes.text();
      console.error("Support chat OpenAI error:", openaiRes.status, errText);
      insertAiLog({ userId: session.userId, source: "support_chat", model, promptSystem: systemPrompt, promptUser: lastUserContent, durationMs, status: "error", errorMessage: errText.slice(0, 2000) }).catch(() => {});
      await refundFeatureQuota(session.userId, "support_chat");
      return Response.json(
        { error: "AI service returned an error." },
        { status: 502 }
      );
    }

    supportChatTotal.inc({ status: "success" });
    await incrementGlobalAiCalls();
    const logId = await insertAiLog({ userId: session.userId, source: "support_chat", model, promptSystem: systemPrompt, promptUser: lastUserContent, durationMs }).catch(() => "");

    let fullResponse = "";

    const stream = createAiStream(openaiRes.body, {
      aiLogId: logId || undefined,
      aiLogModel: model,
      onContent: (text) => { fullResponse += text; },
      onComplete: async (tokens) => {
        if (fullResponse) {
          const assistantMsg: ChatMessage = {
            role: "assistant",
            content: fullResponse,
            timestamp: new Date().toISOString(),
          };
          appendSupportChatMessages(conversationId, [assistantMsg]).catch(() => {});
        }
        await Promise.all([
          incrementAiTokenUsage(session.userId, tokens),
          incrementDailyAiTokenUsage(session.userId, tokens),
          incrementGlobalAiTokens(tokens),
        ]);
      },
      fallbackTokenEstimate: 800 + 1500,
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (err) {
    console.error("Support chat error:", err instanceof Error ? err.message : err);
    await refundFeatureQuota(session.userId, "support_chat");
    return Response.json({ error: "Failed to contact AI service" }, { status: 500 });
  }
});
