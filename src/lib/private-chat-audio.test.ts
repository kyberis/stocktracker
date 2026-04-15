import { describe, expect, it } from "vitest";
import { isAllowedPrivateChatBlobUrl, parseAndValidateAudioMessageContent } from "./private-chat-audio";

describe("private-chat-audio", () => {
  it("isAllowedPrivateChatBlobUrl accepts vercel blob hosts", () => {
    expect(isAllowedPrivateChatBlobUrl("https://x.public.blob.vercel-storage.com/f")).toBe(true);
    expect(isAllowedPrivateChatBlobUrl("http://x.public.blob.vercel-storage.com/f")).toBe(false);
    expect(isAllowedPrivateChatBlobUrl("https://evil.com/x")).toBe(false);
  });

  it("parseAndValidateAudioMessageContent accepts valid JSON", () => {
    const url = "https://abc.public.blob.vercel-storage.com/voice.webm";
    const r = parseAndValidateAudioMessageContent(JSON.stringify({ url, durationSec: 12.4, mime: "audio/webm" }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      const p = JSON.parse(r.content) as { url: string; durationSec: number; mime?: string };
      expect(p.url).toBe(url);
      expect(p.durationSec).toBe(12.4);
      expect(p.mime).toBe("audio/webm");
    }
  });

  it("rejects duration out of range", () => {
    const url = "https://abc.public.blob.vercel-storage.com/voice.webm";
    const r = parseAndValidateAudioMessageContent(JSON.stringify({ url, durationSec: 61 }));
    expect(r.ok).toBe(false);
  });
});
