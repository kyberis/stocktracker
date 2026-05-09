import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/ai/gateway", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/gateway")>();
  return {
    ...actual,
    resolveGatewayApiKey: vi.fn(() => Promise.resolve("ag-test")),
  };
});

vi.mock("@/lib/metrics", () => ({
  aiCallsTotal: { inc: vi.fn() },
  aiRequestDuration: { startTimer: vi.fn(() => () => {}) },
}));

import {
  synthesizeSpeech,
  prepareTtsInput,
  TTS_MAX_INPUT_CHARS,
  getTtsVoice,
} from "./tts";

const originalFetch = global.fetch;

describe("tts · prepareTtsInput", () => {
  it("trims whitespace and caps to TTS_MAX_INPUT_CHARS", () => {
    const long = "x".repeat(TTS_MAX_INPUT_CHARS + 100);
    expect(prepareTtsInput("  hi  ")).toBe("hi");
    expect(prepareTtsInput(long).length).toBe(TTS_MAX_INPUT_CHARS);
  });
});

describe("tts · getTtsVoice", () => {
  it("prefers an explicit override", () => {
    expect(getTtsVoice("nova")).toBe("nova");
  });
});

describe("tts · synthesizeSpeech", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns an Opus buffer on a 200 response", async () => {
    const fakeAudio = new Uint8Array([1, 2, 3, 4]);
    global.fetch = vi.fn(async () =>
      new Response(fakeAudio, { status: 200, headers: { "Content-Type": "audio/ogg" } }),
    ) as unknown as typeof fetch;

    const result = await synthesizeSpeech({ text: "Hello" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.mime).toBe("audio/ogg");
      expect(result.buffer.length).toBe(4);
    }
  });

  it("returns request_failed on a 4xx response", async () => {
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: { message: "rate limit" } }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      }),
    ) as unknown as typeof fetch;

    const result = await synthesizeSpeech({ text: "Hello" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("request_failed");
  });

  it("returns missing_key when no gateway key is configured", async () => {
    const gw = await import("@/lib/ai/gateway");
    vi.mocked(gw.resolveGatewayApiKey).mockResolvedValueOnce(null);

    const result = await synthesizeSpeech({ text: "Hello" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("missing_key");
  });

  it("rejects empty input without calling the API", async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await synthesizeSpeech({ text: "   " });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("empty_input");
    expect(fetchSpy).not.toHaveBeenCalled();

    global.fetch = originalFetch;
  });
});
