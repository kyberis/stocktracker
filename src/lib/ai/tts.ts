/**
 * OpenAI text-to-speech wrapper used by the Telegram voice-note pipeline.
 *
 * Returns an OGG/Opus buffer that can be passed straight to Telegram's
 * `sendVoice` (no transcoding). Honors:
 *   - `OPENAI_TTS_MODEL` (default `gpt-4o-mini-tts`)
 *   - `OPENAI_TTS_VOICE` (default `alloy`)
 *
 * The TTS reply is best-effort: callers always send the text reply first,
 * so a `null` return just means the user hears nothing — never that they
 * lose the answer.
 */

import { getGlobalOpenAIApiKey } from "@/lib/db";
import { aiCallsTotal, aiRequestDuration } from "@/lib/metrics";

const SPEECH_ENDPOINT = "https://api.openai.com/v1/audio/speech";
const ANALYSIS_TYPE = "warren_tts";

/** Hard cap on TTS input — protects cost and Telegram's voice duration cap. */
export const TTS_MAX_INPUT_CHARS = 800;

export type SynthesizeResult =
  | { ok: true; buffer: Buffer; mime: "audio/ogg"; durationMs: number; model: string }
  | {
      ok: false;
      reason: "missing_key" | "empty_input" | "request_failed";
      durationMs: number;
    };

export interface SynthesizeOptions {
  text: string;
  /** ISO 639-1 (e.g. "es"). Used to pick voice instructions only. */
  language?: string;
  /** Override the default OpenAI voice (otherwise from env or `alloy`). */
  voice?: string;
}

export function getTtsModel(): string {
  return process.env.OPENAI_TTS_MODEL?.trim() || "gpt-4o-mini-tts";
}

export function getTtsVoice(override?: string): string {
  if (override?.trim()) return override.trim();
  return process.env.OPENAI_TTS_VOICE?.trim() || "alloy";
}

function modelSupportsInstructions(model: string): boolean {
  return model !== "tts-1" && model !== "tts-1-hd";
}

function instructionsFor(language?: string): string {
  const head = (language || "en").slice(0, 2).toLowerCase();
  if (head === "es") {
    return "Habla en español con tono cálido, calmado y conversacional, sin acento inglés.";
  }
  return "Speak in a calm, warm, conversational tone with neutral pronunciation.";
}

/** Trim + cap to the configured max so the request stays cheap. */
export function prepareTtsInput(text: string): string {
  return text.trim().slice(0, TTS_MAX_INPUT_CHARS);
}

export async function synthesizeSpeech(opts: SynthesizeOptions): Promise<SynthesizeResult> {
  const startedAt = Date.now();
  const endTimer = aiRequestDuration.startTimer({ analysis_type: ANALYSIS_TYPE });

  const input = prepareTtsInput(opts.text);
  if (!input) {
    endTimer();
    return { ok: false, reason: "empty_input", durationMs: Date.now() - startedAt };
  }

  const apiKey = getGlobalOpenAIApiKey();
  if (!apiKey) {
    endTimer();
    aiCallsTotal.inc({ status: "error", analysis_type: ANALYSIS_TYPE });
    return { ok: false, reason: "missing_key", durationMs: Date.now() - startedAt };
  }

  const model = getTtsModel();
  const voice = getTtsVoice(opts.voice);

  const body: Record<string, unknown> = {
    model,
    voice,
    input,
    response_format: "opus",
  };
  if (modelSupportsInstructions(model)) {
    body.instructions = instructionsFor(opts.language);
  }

  let res: Response;
  try {
    res = await fetch(SPEECH_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    endTimer();
    aiCallsTotal.inc({ status: "error", analysis_type: ANALYSIS_TYPE });
    console.warn("[ai/tts] network error", err instanceof Error ? err.message : err);
    return { ok: false, reason: "request_failed", durationMs: Date.now() - startedAt };
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const err = (await res.json()) as { error?: { message?: string } };
      detail = err?.error?.message ?? detail;
    } catch {
      /* ignore */
    }
    endTimer();
    aiCallsTotal.inc({ status: "error", analysis_type: ANALYSIS_TYPE });
    console.warn("[ai/tts] api error", res.status, detail);
    return { ok: false, reason: "request_failed", durationMs: Date.now() - startedAt };
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  endTimer();
  aiCallsTotal.inc({ status: "success", analysis_type: ANALYSIS_TYPE });
  return {
    ok: true,
    buffer,
    mime: "audio/ogg",
    durationMs: Date.now() - startedAt,
    model,
  };
}
