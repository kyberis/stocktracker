import { describe, expect, it, beforeEach } from "vitest";
import {
  loadWarrenChatBubbles,
  saveWarrenChatBubbles,
  warrenChatStorageKey,
  WARREN_CHAT_MAX_BUBBLES,
} from "./chat-persistence";

function mockLocalStorage() {
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
  });
  return store;
}

describe("warrenChatStorageKey", () => {
  it("returns null without user id", () => {
    expect(warrenChatStorageKey(null, "p1")).toBeNull();
  });

  it("scopes by user and portfolio", () => {
    expect(warrenChatStorageKey("u1", "p1")).toBe("trefolio:warren-chat:v1:u1:p1");
    expect(warrenChatStorageKey("u1", null)).toBe("trefolio:warren-chat:v1:u1:default");
  });
});

describe("warren chat persistence", () => {
  const key = "trefolio:warren-chat:v1:test-user:default";

  beforeEach(() => {
    mockLocalStorage().clear();
  });

  it("round-trips bubbles", () => {
    const bubbles = [
      { id: "1", kind: "text-user" as const, content: "hola" },
      { id: "2", kind: "text-assistant" as const, content: "listo" },
    ];
    saveWarrenChatBubbles(key, bubbles);
    expect(loadWarrenChatBubbles(key)).toEqual(bubbles);
  });

  it("drops empty assistant bubbles", () => {
    saveWarrenChatBubbles(key, [
      { id: "1", kind: "text-user", content: "hi" },
      { id: "2", kind: "text-assistant", content: "" },
    ]);
    expect(loadWarrenChatBubbles(key)).toEqual([
      { id: "1", kind: "text-user", content: "hi" },
    ]);
  });

  it("keeps only the most recent bubbles when over limit", () => {
    const bubbles = Array.from({ length: WARREN_CHAT_MAX_BUBBLES + 5 }, (_, i) => ({
      id: String(i),
      kind: "text-user" as const,
      content: `msg-${i}`,
    }));
    saveWarrenChatBubbles(key, bubbles);
    const loaded = loadWarrenChatBubbles(key);
    expect(loaded).toHaveLength(WARREN_CHAT_MAX_BUBBLES);
    expect(loaded[0]?.content).toBe("msg-5");
  });
});
