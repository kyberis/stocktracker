import { fetchGatewayChatCompletions, resolveGatewayApiKey } from "@/lib/ai/gateway";
import { getAiModelForFlow, insertAiLog } from "@/lib/db";
import { insertAgentBoardMessage } from "@/lib/db/agent-board";
import type { AgentBoardComposeResult, AgentBoardMessage, AgentBoardSignal } from "@/lib/agent-board/types";
import { languageCodeToName } from "@/lib/languages";

const MAX_MESSAGES_PER_COMPOSE = 3;
const MAX_BODY_LEN = 400;

interface ComposeOutput {
  messages: Array<{
    agent: "warren" | "clara";
    kind: string;
    contextKey: string;
    body: string;
    priority: number;
  }>;
}

function parseComposeJson(raw: string): ComposeOutput | null {
  try {
    const parsed = JSON.parse(raw) as ComposeOutput;
    if (!Array.isArray(parsed.messages)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Deterministic fallback when the AI gateway is unavailable. */
export function fallbackCompose(
  signals: AgentBoardSignal[],
  language: string,
): AgentBoardComposeResult[] {
  const es = language.startsWith("es");
  return signals.slice(0, MAX_MESSAGES_PER_COMPOSE).map((s) => {
    const ticker = String(s.payload.ticker ?? "");
    const movePct = s.payload.movePct;
    let body: string;
    switch (s.kind) {
      case "market_open":
        body = es
          ? `${s.payload.label} abrió. Revisa tus posiciones locales.`
          : `${s.payload.label} is open. Review your local holdings.`;
        break;
      case "mover":
        body = es
          ? `${ticker} se movió ${movePct}% hoy.`
          : `${ticker} moved ${movePct}% today.`;
        break;
      case "news":
      case "earnings":
        body = String(s.payload.headline ?? ticker);
        break;
      case "alert":
        body = es
          ? `Alerta activada en ${ticker}.`
          : `Alert triggered on ${ticker}.`;
        break;
      case "clara_surplus":
        body = es
          ? "Tienes superávit este mes en Clara."
          : "You have monthly surplus in Clara.";
        break;
      default:
        body = es
          ? "Hay novedades en tu cartera."
          : "There are updates for your portfolio.";
    }
    return {
      agent: s.agent,
      kind: s.kind,
      contextKey: s.contextKey,
      body: body.slice(0, MAX_BODY_LEN),
      priority: s.priority,
      signalsJson: JSON.stringify(s.payload),
    };
  });
}

function historyBlock(history: AgentBoardMessage[]): string {
  if (history.length === 0) return "(none)";
  return history
    .slice(0, 12)
    .map((m) => `- [${m.createdAt.slice(0, 10)}] ${m.agent}/${m.kind}: ${m.body.slice(0, 120)}`)
    .join("\n");
}

function signalsBlock(signals: AgentBoardSignal[]): string {
  return signals
    .slice(0, 12)
    .map(
      (s, i) =>
        `${i + 1}. agent=${s.agent} kind=${s.kind} priority=${s.priority} key=${s.contextKey} data=${JSON.stringify(s.payload).slice(0, 280)}`,
    )
    .join("\n");
}

export async function composeAgentBoardMessages(args: {
  userId: string;
  language: string;
  signals: AgentBoardSignal[];
  history: AgentBoardMessage[];
}): Promise<AgentBoardComposeResult[]> {
  if (args.signals.length === 0) return [];

  const lang = languageCodeToName(args.language);
  const gatewayConfigured = await resolveGatewayApiKey();
  if (!gatewayConfigured) {
    return fallbackCompose(args.signals, args.language);
  }

  const model = await getAiModelForFlow("agent_board");
  const system = `You write short proactive messages for Warren (portfolio/markets) and Clara (personal finance) on a Scriptable "Pizarra" widget.
Write in ${lang}.
Return ONLY valid JSON: { "messages": [ { "agent": "warren"|"clara", "kind": string, "contextKey": string, "body": string, "priority": number } ] }
Rules:
- Pick up to ${MAX_MESSAGES_PER_COMPOSE} most important signals; skip redundant or low-value items.
- Do NOT repeat themes from recent history (same ticker + same kind within 7 days unless materially new).
- Neutral tone; no buy/sell advice; no invented numbers — use only provided signal data.
- body: 1-2 sentences, max 280 chars, conversational first person addressing the user.
- Warren covers markets, news, movers, catalysts, recommendations, alerts.
- Clara covers savings, budget, surplus, emergency fund.`;

  const user = `Recent messages (avoid repeating):
${historyBlock(args.history)}

Candidate signals (pick best, use exact contextKey from signal):
${signalsBlock(args.signals)}`;

  const started = Date.now();
  try {
    const res = await fetchGatewayChatCompletions({
      model,
      stream: false,
      max_tokens: 500,
      temperature: 0.35,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    });

    let content = "";
    if (res.ok) {
      const result = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      content = result.choices?.[0]?.message?.content ?? "";
    }

    await insertAiLog({
      userId: args.userId,
      source: "agent_board",
      model,
      promptSystem: system,
      promptUser: user,
      response: content,
      tokensUsed: 0,
      tokensInput: 0,
      tokensOutput: 0,
      durationMs: Date.now() - started,
      status: content ? "success" : "error",
      errorMessage: content ? "" : "empty compose response",
    });

    const composed = content ? parseComposeJson(content) : null;
    if (!composed?.messages?.length) {
      return fallbackCompose(args.signals, args.language);
    }

    const allowedKeys = new Set(args.signals.map((s) => s.contextKey));
    const signalByKey = new Map(args.signals.map((s) => [s.contextKey, s]));

    return composed.messages
      .filter((m) => allowedKeys.has(m.contextKey))
      .slice(0, MAX_MESSAGES_PER_COMPOSE)
      .map((m) => {
        const src = signalByKey.get(m.contextKey)!;
        return {
          agent: m.agent === "clara" ? "clara" : "warren",
          kind: src.kind,
          contextKey: m.contextKey,
          body: String(m.body).slice(0, MAX_BODY_LEN),
          priority: Number(m.priority) || src.priority,
          signalsJson: JSON.stringify(src.payload),
        };
      });
  } catch (err) {
    await insertAiLog({
      userId: args.userId,
      source: "agent_board",
      model,
      promptSystem: system,
      promptUser: user,
      response: "",
      tokensUsed: 0,
      tokensInput: 0,
      tokensOutput: 0,
      durationMs: Date.now() - started,
      status: "error",
      errorMessage: err instanceof Error ? err.message : "compose failed",
    });
    return fallbackCompose(args.signals, args.language);
  }
}

export async function persistComposedMessages(
  userId: string,
  composed: AgentBoardComposeResult[],
  expiresInHours = 48,
): Promise<number> {
  const expiresAt = new Date(Date.now() + expiresInHours * 3600 * 1000).toISOString();
  let inserted = 0;
  for (const msg of composed) {
    const row = await insertAgentBoardMessage({
      userId,
      agent: msg.agent,
      kind: msg.kind,
      contextKey: msg.contextKey,
      body: msg.body,
      priority: msg.priority,
      expiresAt,
      signalsJson: msg.signalsJson,
    });
    if (row) inserted += 1;
  }
  return inserted;
}
