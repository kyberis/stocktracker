export type WarrenThreadMessage = { role: "user" | "assistant"; content: string };

/** Short acceptances of a prior offer — not wrap-ups like "ok" / "done". */
const AFFIRMATION =
  /^(sí|si|yes|yeah|yep|dale|claro|por favor|please|hazlo|adelante|go ahead|sure)(?:\s|[.,!?…]|$)/i;

const DECISION_RANKING =
  /(?:vender|sell|cu[aá]l\s+primero|menor\s+margen|menos\s+margen|margen\s+de\s+subida|upside|decidir|comparar|comparaci[oó]n|rank(?:ing)?)/i;

const PRIOR_OFFER =
  /(?:\u00bf?quieres que|want me to|should i |te ayude a (?:decidir|comparar|ordenar)|te ayudo a|puedo (?:ordenar|comparar|analizar|ayudar)|want to (?:compare|rank|decide))/i;

function lastUserText(messages: WarrenThreadMessage[]): string {
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user") return "";
  return last.content.trim();
}

function lastAssistantText(messages: WarrenThreadMessage[]): string {
  for (let i = messages.length - 2; i >= 0; i--) {
    const row = messages[i];
    if (row?.role === "assistant") return row.content;
  }
  return "";
}

/** True when the user is accepting a prior offer or asking to proceed past a recap. */
export function wantsConversationProgress(messages: WarrenThreadMessage[]): boolean {
  if (messages.length < 2) return false;

  const lastText = lastUserText(messages);
  if (!lastText) return false;

  const assistantText = lastAssistantText(messages);
  if (!assistantText) return false;

  const offered = PRIOR_OFFER.test(assistantText);
  const affirms = AFFIRMATION.test(lastText);
  const decision = DECISION_RANKING.test(lastText);

  if (offered && (affirms || decision)) return true;
  if (decision) return true;
  if (affirms && lastText.length < 80) return true;
  return false;
}

export function buildConversationProgressAppendix(
  messages: WarrenThreadMessage[],
): string | null {
  if (!wantsConversationProgress(messages)) return null;

  return [
    "TASK OVERRIDE — User accepted a prior offer / asked to proceed:",
    "- Do NOT call `analyzeValuation` again unless they asked for fresh data or new tickers.",
    "- Use valuation numbers already stated in this thread.",
    "- Deliver the requested next step NOW (rank by upside, compare candidates, decision framework, or trade guidance card).",
    "- Call `getQuote` for current prices if `currentPrice` / `upsideToTargetPct` are missing; compute upside vs analystTargetPrice when available.",
    "- For buy/sell/trim *analysis*: call `listHoldings` for position size, then `renderTradeGuidanceCard` with real suggestedShares/suggestedAmount — NEVER `proposeAddCash` for sale proceeds.",
    "- For recording a sale/purchase the user already made: call `proposeRecordTransaction` (after `listHoldings` for sells) — NEVER `proposeRemoveHolding`.",
    "- Do NOT repeat the expensive/fair/cheap grouping from the previous turn.",
    "- Do NOT repeat the same follow-up question you already asked.",
  ].join("\n");
}

/** Extract user/assistant text rows from model or office/telegram history. */
export function warrenThreadFromModelMessages(
  messages: ReadonlyArray<{ role?: string; content?: unknown }>,
): WarrenThreadMessage[] {
  const out: WarrenThreadMessage[] = [];
  for (const m of messages) {
    if (m.role !== "user" && m.role !== "assistant") continue;
    let text = "";
    if (typeof m.content === "string") {
      text = m.content;
    } else if (Array.isArray(m.content)) {
      text = m.content
        .map((part) => {
          if (
            part &&
            typeof part === "object" &&
            "type" in part &&
            (part as { type?: string }).type === "text" &&
            "text" in part
          ) {
            return String((part as { text: unknown }).text ?? "");
          }
          return "";
        })
        .join("\n");
    }
    const trimmed = text.trim();
    if (trimmed) out.push({ role: m.role, content: trimmed });
  }
  return out;
}
