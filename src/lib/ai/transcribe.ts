/**
 * OpenAI speech-to-text wrapper used by the Telegram voice-note pipeline.
 *
 * Uses the same `STOCKTRACKER_OPENAI_API_KEY` as Warren chat. Honors
 * `OPENAI_TRANSCRIPTION_MODEL` (default `whisper-1`). Accepts an optional
 * ISO language hint to improve accuracy for non-English inputs.
 *
 * Returns a tagged result so callers can show a localized error without
 * leaking provider details to end users.
 */

import { getGlobalOpenAIApiKey } from "@/lib/db";
import { aiCallsTotal, aiRequestDuration } from "@/lib/metrics";

const TRANSCRIPTION_ENDPOINT = "https://api.openai.com/v1/audio/transcriptions";

export type TranscribeResult =
  | { ok: true; text: string; durationMs: number; model: string }
  | { ok: false; reason: "missing_key" | "empty" | "request_failed"; durationMs: number };

export interface TranscribeOptions {
  buffer: Buffer;
  /** MIME type from the source (Telegram sends `audio/ogg`). */
  mimeType: string;
  /** ISO 639-1 hint (e.g. `"es"`). Whisper auto-detects when omitted. */
  language?: string;
}

const ANALYSIS_TYPE = "warren_transcribe";

export function getTranscriptionModel(): string {
  const env = process.env.OPENAI_TRANSCRIPTION_MODEL?.trim();
  return env || "whisper-1";
}

/** Best-effort filename hint so OpenAI receives the right extension. */
export function guessAudioFilename(mimeType: string): string {
  const mt = mimeType.toLowerCase().split(";")[0]?.trim() ?? "";
  if (mt.includes("ogg")) return "voice.ogg";
  if (mt.includes("mpeg") || mt === "audio/mp3") return "voice.mp3";
  if (mt.includes("mp4") || mt.includes("m4a")) return "voice.m4a";
  if (mt.includes("wav")) return "voice.wav";
  if (mt.includes("webm")) return "voice.webm";
  if (mt.includes("aac")) return "voice.aac";
  if (mt.includes("flac")) return "voice.flac";
  return "voice.ogg";
}

export async function transcribeVoice(opts: TranscribeOptions): Promise<TranscribeResult> {
  const startedAt = Date.now();
  const endTimer = aiRequestDuration.startTimer({ analysis_type: ANALYSIS_TYPE });
  const apiKey = getGlobalOpenAIApiKey();
  if (!apiKey) {
    endTimer();
    aiCallsTotal.inc({ status: "error", analysis_type: ANALYSIS_TYPE });
    return { ok: false, reason: "missing_key", durationMs: Date.now() - startedAt };
  }

  const model = getTranscriptionModel();
  const filename = guessAudioFilename(opts.mimeType);
  const mime = opts.mimeType.split(";")[0]?.trim() || "application/octet-stream";

  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(opts.buffer)], { type: mime }),
    filename,
  );
  form.append("model", model);
  if (opts.language) form.append("language", opts.language.slice(0, 2).toLowerCase());

  let res: Response;
  try {
    res = await fetch(TRANSCRIPTION_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
  } catch (err) {
    endTimer();
    aiCallsTotal.inc({ status: "error", analysis_type: ANALYSIS_TYPE });
    console.warn(
      "[ai/transcribe] network error",
      err instanceof Error ? err.message : err,
    );
    return { ok: false, reason: "request_failed", durationMs: Date.now() - startedAt };
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const errJson = (await res.json()) as { error?: { message?: string } };
      detail = errJson?.error?.message ?? detail;
    } catch {
      /* ignore */
    }
    endTimer();
    aiCallsTotal.inc({ status: "error", analysis_type: ANALYSIS_TYPE });
    console.warn("[ai/transcribe] api error", res.status, detail);
    return { ok: false, reason: "request_failed", durationMs: Date.now() - startedAt };
  }

  let text = "";
  try {
    const data = (await res.json()) as { text?: string };
    text = typeof data.text === "string" ? data.text.trim() : "";
  } catch {
    text = "";
  }

  endTimer();
  if (!text) {
    aiCallsTotal.inc({ status: "error", analysis_type: ANALYSIS_TYPE });
    return { ok: false, reason: "empty", durationMs: Date.now() - startedAt };
  }
  aiCallsTotal.inc({ status: "success", analysis_type: ANALYSIS_TYPE });
  return { ok: true, text, durationMs: Date.now() - startedAt, model };
}
