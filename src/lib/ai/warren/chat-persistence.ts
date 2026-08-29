import { z } from "zod";

/** Serializable Warren chat bubble stored in localStorage. */
export type PersistedWarrenBubble =
  | { id: string; kind: "text-user"; content: string }
  | { id: string; kind: "text-assistant"; content: string }
  | { id: string; kind: "tool-step"; label: string }
  | { id: string; kind: "part"; part: { kind: string; data: Record<string, unknown> } }
  | {
      id: string;
      kind: "proposal";
      proposal: {
        id: string;
        kind: string;
        title: string;
        summary: string;
        destructive?: boolean;
        rows: { label: string; value: string }[];
        data: Record<string, unknown>;
      };
    };

const STORAGE_PREFIX = "trefolio:warren-chat:v1";
export const WARREN_CHAT_MAX_BUBBLES = 80;
const MAX_BYTES = 512_000;

const bubbleSchema = z.discriminatedUnion("kind", [
  z.object({ id: z.string(), kind: z.literal("text-user"), content: z.string() }),
  z.object({ id: z.string(), kind: z.literal("text-assistant"), content: z.string() }),
  z.object({ id: z.string(), kind: z.literal("tool-step"), label: z.string() }),
  z.object({
    id: z.string(),
    kind: z.literal("part"),
    part: z.object({ kind: z.string(), data: z.record(z.string(), z.unknown()) }),
  }),
  z.object({
    id: z.string(),
    kind: z.literal("proposal"),
    proposal: z
      .object({
        id: z.string(),
        kind: z.enum([
          "addHolding",
          "removeHolding",
          "recordTransaction",
          "addCash",
          "createAlert",
          "addWatchlist",
          "importTransactions",
        ]),
        title: z.string(),
        summary: z.string(),
        destructive: z.boolean().optional(),
        rows: z.array(z.object({ label: z.string(), value: z.string() })),
        data: z.record(z.string(), z.unknown()),
      })
      .passthrough(),
  }),
]);

const payloadSchema = z.object({
  bubbles: z.array(bubbleSchema),
  savedAt: z.string().optional(),
});

export function warrenChatStorageKey(
  userId: string | null | undefined,
  portfolioId: string | null | undefined,
): string | null {
  if (!userId) return null;
  const portfolio = portfolioId?.trim() || "default";
  return `${STORAGE_PREFIX}:${userId}:${portfolio}`;
}

export function loadWarrenChatBubbles(key: string | null): PersistedWarrenBubble[] {
  if (!key || typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = payloadSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return [];
    return parsed.data.bubbles.filter(
      (b) => !(b.kind === "text-assistant" && !b.content.trim()),
    ) as PersistedWarrenBubble[];
  } catch {
    return [];
  }
}

export function saveWarrenChatBubbles(
  key: string | null,
  bubbles: PersistedWarrenBubble[],
): void {
  if (!key || typeof localStorage === "undefined") return;
  try {
    const trimmed = bubbles
      .filter((b) => !(b.kind === "text-assistant" && !b.content.trim()))
      .slice(-WARREN_CHAT_MAX_BUBBLES);
    let payload = JSON.stringify({ bubbles: trimmed, savedAt: new Date().toISOString() });
    while (payload.length > MAX_BYTES && trimmed.length > 1) {
      trimmed.shift();
      payload = JSON.stringify({ bubbles: trimmed, savedAt: new Date().toISOString() });
    }
    if (payload.length > MAX_BYTES) return;
    localStorage.setItem(key, payload);
  } catch {
    // Quota exceeded or private mode — ignore.
  }
}

export function clearWarrenChatBubbles(key: string | null): void {
  if (!key || typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
