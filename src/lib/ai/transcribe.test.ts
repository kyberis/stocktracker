import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  getGlobalOpenAIApiKey: vi.fn(() => "sk-test"),
}));

vi.mock("@/lib/metrics", () => ({
  aiCallsTotal: { inc: vi.fn() },
  aiRequestDuration: { startTimer: vi.fn(() => () => {}) },
}));

import { transcribeVoice, guessAudioFilename } from "./transcribe";

const originalFetch = global.fetch;

describe("transcribe · guessAudioFilename", () => {
  it("maps common MIME types to extensions", () => {
    expect(guessAudioFilename("audio/ogg; codecs=opus")).toBe("voice.ogg");
    expect(guessAudioFilename("audio/mpeg")).toBe("voice.mp3");
    expect(guessAudioFilename("audio/m4a")).toBe("voice.m4a");
    expect(guessAudioFilename("audio/wav")).toBe("voice.wav");
    expect(guessAudioFilename("application/octet-stream")).toBe("voice.ogg");
  });
});

describe("transcribe · transcribeVoice", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the transcribed text on a 200 response", async () => {
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ text: "Hello Warren" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as unknown as typeof fetch;

    const result = await transcribeVoice({
      buffer: Buffer.from("fake-bytes"),
      mimeType: "audio/ogg",
      language: "en",
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.text).toBe("Hello Warren");
  });

  it("returns request_failed on a 4xx response", async () => {
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: { message: "bad audio" } }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    ) as unknown as typeof fetch;

    const result = await transcribeVoice({
      buffer: Buffer.from("fake-bytes"),
      mimeType: "audio/ogg",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("request_failed");
  });

  it("returns empty when the API responds with whitespace-only text", async () => {
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ text: "   " }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as unknown as typeof fetch;

    const result = await transcribeVoice({
      buffer: Buffer.from("fake-bytes"),
      mimeType: "audio/ogg",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("empty");
  });

  it("returns missing_key when no OpenAI key is configured", async () => {
    const dbModule = await import("@/lib/db");
    (dbModule.getGlobalOpenAIApiKey as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce("");

    const result = await transcribeVoice({
      buffer: Buffer.from("fake-bytes"),
      mimeType: "audio/ogg",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("missing_key");
  });

  it("returns request_failed on a network error", async () => {
    global.fetch = vi.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;

    const result = await transcribeVoice({
      buffer: Buffer.from("fake-bytes"),
      mimeType: "audio/ogg",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("request_failed");

    global.fetch = originalFetch;
  });
});
