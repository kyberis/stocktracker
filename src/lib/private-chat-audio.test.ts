import { afterEach, describe, expect, it, vi } from "vitest";
import {
  extForAudioMime,
  isAllowedAudioMessageUrl,
  isAllowedPrivateChatBlobUrl,
  parseAndValidateAudioMessageContent,
} from "./private-chat-audio";

describe("private-chat-audio", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("isAllowedPrivateChatBlobUrl accepts vercel blob hosts", () => {
    expect(isAllowedPrivateChatBlobUrl("https://x.public.blob.vercel-storage.com/f")).toBe(true);
    expect(isAllowedPrivateChatBlobUrl("http://x.public.blob.vercel-storage.com/f")).toBe(false);
    expect(isAllowedPrivateChatBlobUrl("https://evil.com/x")).toBe(false);
  });

  describe("isAllowedAudioMessageUrl", () => {
    it("accepts Vercel Blob HTTPS URLs in any NODE_ENV", () => {
      vi.stubEnv("NODE_ENV", "production");
      expect(isAllowedAudioMessageUrl("https://x.public.blob.vercel-storage.com/voice.webm")).toBe(true);
    });

    it("rejects data:audio URLs outside development", () => {
      vi.stubEnv("NODE_ENV", "test");
      expect(isAllowedAudioMessageUrl("data:audio/webm;base64,AAAA")).toBe(false);
    });

    it("accepts data:audio URLs in development under the size cap", () => {
      vi.stubEnv("NODE_ENV", "development");
      expect(isAllowedAudioMessageUrl("data:audio/webm;base64,AAAA")).toBe(true);
    });

    it("rejects oversized data:audio URLs in development", () => {
      vi.stubEnv("NODE_ENV", "development");
      const huge = `data:audio/webm;base64,${"A".repeat(3_500_001)}`;
      expect(isAllowedAudioMessageUrl(huge)).toBe(false);
    });
  });

  it("extForAudioMime maps common MIME types", () => {
    expect(extForAudioMime("audio/webm")).toBe("webm");
    expect(extForAudioMime("audio/mp4")).toBe("m4a");
    expect(extForAudioMime("audio/mpeg")).toBe("mp3");
    expect(extForAudioMime("audio/ogg")).toBe("ogg");
    expect(extForAudioMime("audio/wav")).toBe("wav");
    expect(extForAudioMime("audio/unknown")).toBe("bin");
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
    const r = parseAndValidateAudioMessageContent(JSON.stringify({ url, durationSec: 121 }));
    expect(r.ok).toBe(false);
  });

  it("parseAndValidateAudioMessageContent accepts dev inline data:audio URL when NODE_ENV is development", () => {
    vi.stubEnv("NODE_ENV", "development");
    const url = "data:audio/webm;base64,AAAA";
    const r = parseAndValidateAudioMessageContent(JSON.stringify({ url, durationSec: 5 }));
    expect(r.ok).toBe(true);
  });

  it("parseAndValidateAudioMessageContent rejects data:audio URL when not development", () => {
    vi.stubEnv("NODE_ENV", "production");
    const url = "data:audio/webm;base64,AAAA";
    const r = parseAndValidateAudioMessageContent(JSON.stringify({ url, durationSec: 5 }));
    expect(r.ok).toBe(false);
  });
});
