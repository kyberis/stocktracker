import {
  BRIEF_SOURCES,
  INTAKE_AGENT_STATUSES,
  SCREENING_INTENTS,
  intakeAgentOutputSchema,
  screeningBriefSchema,
  type IntakeAgentOutput,
  type ScreeningBrief,
  type ScreeningIntent,
} from "./schemas";

/**
 * LLMs often return almost-valid envelopes (null arrays, stringy numbers,
 * unknown criterion sources). This module coerces those into something Zod
 * will accept instead of failing the whole turn with rejected_shape.
 */

const ALLOWED_SOURCES = new Set<string>(BRIEF_SOURCES);
const ALLOWED_STATUSES = new Set<string>(INTAKE_AGENT_STATUSES);
const ALLOWED_INTENTS = new Set<string>(SCREENING_INTENTS);

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => asString(v).trim())
    .filter((s) => s.length > 0)
    .slice(0, 20);
}

function asInt(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.trim());
    if (Number.isFinite(n)) return Math.round(n);
  }
  return fallback;
}

function coerceCriteria(raw: unknown): ScreeningBrief["criteria"] {
  if (!Array.isArray(raw)) return [];
  const out: ScreeningBrief["criteria"] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const key = asString(row.key).trim().slice(0, 64);
    const condition = asString(row.condition).trim().slice(0, 120);
    if (!key || !condition) continue;
    const sourceRaw = asString(row.source, "chat");
    const source = ALLOWED_SOURCES.has(sourceRaw)
      ? (sourceRaw as ScreeningBrief["criteria"][number]["source"])
      : "chat";
    out.push({ key, condition, source });
    if (out.length >= 30) break;
  }
  return out;
}

function coerceSuggestions(raw: unknown): IntakeAgentOutput["suggestions"] {
  if (!Array.isArray(raw)) return [];
  const out: IntakeAgentOutput["suggestions"] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const label = asString(row.label).trim().slice(0, 80);
    const say = asString(row.say || row.label).trim().slice(0, 200);
    if (!label || !say) continue;
    out.push({ label, say });
    if (out.length >= 5) break;
  }
  return out;
}

function coerceStringList(raw: unknown, maxLen: number, maxItems: number): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((v) => asString(v).trim().slice(0, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

export interface CoerceIntakeOptions {
  intent: ScreeningIntent;
  locale: string;
  currentBrief?: Partial<ScreeningBrief> | null;
}

/**
 * Best-effort coerce of a raw LLM JSON object into `IntakeAgentOutput`.
 * Returns null only when the payload is not an object at all.
 */
export function coerceIntakeAgentPayload(
  raw: unknown,
  opts: CoerceIntakeOptions,
): IntakeAgentOutput | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const statusRaw = asString(obj.status, "needs_clarification");
  const status = ALLOWED_STATUSES.has(statusRaw)
    ? (statusRaw as IntakeAgentOutput["status"])
    : "needs_clarification";

  const assistantText = asString(obj.assistantText || obj.message || obj.reply)
    .trim()
    .slice(0, 2000);
  if (!assistantText) return null;

  const briefRaw =
    obj.brief && typeof obj.brief === "object"
      ? (obj.brief as Record<string, unknown>)
      : {};

  const base = opts.currentBrief ?? {};
  const candidateCount = Math.min(
    5,
    Math.max(3, asInt(briefRaw.candidateCount ?? base.candidateCount, 5)),
  );

  const briefIntentRaw = asString(briefRaw.intent, opts.intent);
  const briefIntent = ALLOWED_INTENTS.has(briefIntentRaw)
    ? (briefIntentRaw as ScreeningIntent)
    : opts.intent;

  const briefCandidate = {
    intent: briefIntent,
    includeSectors:
      briefRaw.includeSectors != null
        ? asStringArray(briefRaw.includeSectors)
        : (base.includeSectors ?? []),
    excludeSectors:
      briefRaw.excludeSectors != null
        ? asStringArray(briefRaw.excludeSectors)
        : (base.excludeSectors ?? []),
    regions:
      briefRaw.regions != null ? asStringArray(briefRaw.regions) : (base.regions ?? []),
    candidateCount,
    criteria:
      briefRaw.criteria != null ? coerceCriteria(briefRaw.criteria) : (base.criteria ?? []),
    endedEarly: Boolean(briefRaw.endedEarly ?? base.endedEarly ?? false),
    locale: opts.locale,
  };

  const brief = screeningBriefSchema.parse(briefCandidate);

  const coerced = {
    status,
    assistantText,
    brief,
    questions: coerceStringList(obj.questions, 300, 3),
    suggestions: coerceSuggestions(obj.suggestions),
    warnings: coerceStringList(obj.warnings, 300, 10),
    inferredFields: coerceStringList(obj.inferredFields, 64, 20),
  };

  // Final gate — should always pass after coerce.
  const parsed = intakeAgentOutputSchema.safeParse(coerced);
  if (parsed.success) return parsed.data;

  // Extremely defensive fallback: drop optional lists and retry.
  const minimal = intakeAgentOutputSchema.safeParse({
    status: coerced.status,
    assistantText: coerced.assistantText,
    brief,
    questions: [],
    suggestions: [],
    warnings: ["coerce_trimmed"],
    inferredFields: [],
  });
  return minimal.success ? minimal.data : null;
}

/** Extract a JSON object string from model output (fences / preamble tolerant). */
export function extractJsonPayload(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    return trimmed.slice(first, last + 1);
  }
  return null;
}

/** Repair truncated JSON by closing open braces/brackets when the model hit max_tokens. */
export function tryRepairTruncatedJson(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let repaired =
    extractJsonPayload(trimmed) ??
    (() => {
      const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (fenced) return fenced[1].trim();
      const first = trimmed.indexOf("{");
      if (first === -1) return null;
      // No closing brace yet — take everything from the first `{`.
      return trimmed.slice(first);
    })();

  if (!repaired) return null;

  try {
    JSON.parse(repaired);
    return repaired;
  } catch {
    // continue to repair
  }

  repaired = repaired.trim().replace(/,\s*$/, "");

  const opens = (repaired.match(/\{/g) ?? []).length;
  const closes = (repaired.match(/\}/g) ?? []).length;
  const openArr = (repaired.match(/\[/g) ?? []).length;
  const closeArr = (repaired.match(/\]/g) ?? []).length;

  // Close strings if odd number of quotes (rough heuristic; ignores escapes).
  const quoteCount = (repaired.match(/"/g) ?? []).length;
  if (quoteCount % 2 === 1) repaired += '"';

  for (let i = 0; i < openArr - closeArr; i++) repaired += "]";
  for (let i = 0; i < opens - closes; i++) repaired += "}";

  try {
    JSON.parse(repaired);
    return repaired;
  } catch {
    return null;
  }
}

