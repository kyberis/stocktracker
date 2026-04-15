/** Vercel Blob public URLs for this app. */
export function isAllowedPrivateChatBlobUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    const h = u.hostname.toLowerCase();
    return h.endsWith(".public.blob.vercel-storage.com") || h.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

const MAX_DEV_INLINE_DATA_URL_CHARS = 3_500_000;

/** Blob HTTPS URL, or in development only an inline data:audio URL from the local no-Blob fallback. */
export function isAllowedAudioMessageUrl(url: string): boolean {
  if (isAllowedPrivateChatBlobUrl(url)) return true;
  if (
    process.env.NODE_ENV === "development" &&
    url.startsWith("data:audio/") &&
    url.length <= MAX_DEV_INLINE_DATA_URL_CHARS
  ) {
    return true;
  }
  return false;
}

const MAX_AUDIO_DURATION_SEC = 60;

export interface PrivateChatAudioPayload {
  url: string;
  durationSec: number;
  mime?: string;
}

/** Validate and normalize JSON stored in `private_chat_messages.content` for type `audio`. */
export function parseAndValidateAudioMessageContent(
  raw: string
): { ok: true; content: string } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Invalid audio message payload" };
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "Invalid audio message payload" };
  }
  const o = parsed as Record<string, unknown>;
  const url = typeof o.url === "string" ? o.url.trim() : "";
  const durationSec = typeof o.durationSec === "number" ? o.durationSec : NaN;
  const mime = typeof o.mime === "string" ? o.mime : undefined;

  if (!url || !isAllowedAudioMessageUrl(url)) {
    return { ok: false, error: "Invalid audio URL" };
  }
  if (!Number.isFinite(durationSec) || durationSec <= 0 || durationSec > MAX_AUDIO_DURATION_SEC) {
    return { ok: false, error: `Voice messages must be between 1 and ${MAX_AUDIO_DURATION_SEC} seconds.` };
  }

  const payload: PrivateChatAudioPayload = { url, durationSec, ...(mime ? { mime } : {}) };
  return { ok: true, content: JSON.stringify(payload) };
}

export function extForAudioMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m === "audio/webm") return "webm";
  if (m === "audio/mp4" || m === "audio/x-m4a") return "m4a";
  if (m === "audio/mpeg") return "mp3";
  if (m === "audio/ogg") return "ogg";
  if (m === "audio/wav" || m === "audio/x-wav") return "wav";
  return "bin";
}
