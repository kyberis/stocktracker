import { fetchGatewayChatCompletions } from "@/lib/ai/gateway";
import { listExperiments } from "@/lib/db/experiments";

export const PRODOPS_STAFF_INTENTS = [
  "ops_digest",
  "latest_user_created",
  "latest_feedbacks",
  "latest_user_interaction",
  "experiments_overview",
  "help",
] as const;

export type ProdOpsStaffIntent = (typeof PRODOPS_STAFF_INTENTS)[number];

export type StaffQueryClassification = {
  intent: ProdOpsStaffIntent;
  experimentKey: string | null;
  source: "heuristic" | "llm" | "fallback";
};

const INTENT_SET = new Set<string>(PRODOPS_STAFF_INTENTS);

function normalizeStaffText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function firstCommand(normalized: string): string {
  return normalized.split(" ")[0]?.replace(/@\w+$/, "") || "";
}

/**
 * Cheap deterministic mapping for slash commands and common phrasing (EN/ES).
 * Numbers still come from SQL — this only picks the query.
 */
export function matchStaffQueryHeuristic(text: string): StaffQueryClassification | null {
  const normalized = normalizeStaffText(text);
  if (!normalized) return null;

  const cmd = firstCommand(normalized);
  if (cmd === "/help" || cmd === "/menu" || normalized === "help") {
    return { intent: "help", experimentKey: null, source: "heuristic" };
  }
  if (
    cmd === "/snapshot" ||
    cmd === "/digest" ||
    normalized === "snapshot" ||
    normalized === "digest"
  ) {
    return { intent: "ops_digest", experimentKey: null, source: "heuristic" };
  }
  if (cmd === "/experiments" || cmd === "/experiment") {
    return { intent: "experiments_overview", experimentKey: null, source: "heuristic" };
  }

  if (
    normalized.includes("latest user created") ||
    normalized.includes("last user") ||
    normalized.includes("newest signup") ||
    normalized.includes("ultimo usuario") ||
    normalized.includes("último usuario") ||
    normalized.includes("ultimo alta") ||
    normalized.includes("última alta")
  ) {
    return { intent: "latest_user_created", experimentKey: null, source: "heuristic" };
  }

  if (
    normalized.includes("latest feedbacks") ||
    normalized.includes("last feedback") ||
    normalized.includes("recent feedback") ||
    normalized.includes("ultimos feedback") ||
    normalized.includes("últimos feedback") ||
    normalized.includes("ultimo feedback") ||
    normalized.includes("último feedback")
  ) {
    return { intent: "latest_feedbacks", experimentKey: null, source: "heuristic" };
  }

  if (
    normalized.includes("latest user interaction") ||
    normalized.includes("last interaction") ||
    normalized.includes("latest activity") ||
    normalized.includes("ultima interaccion") ||
    normalized.includes("última interacción")
  ) {
    return { intent: "latest_user_interaction", experimentKey: null, source: "heuristic" };
  }

  const mentionsExperimentSurface =
    /\b(experiments?|experimentos?|experimento|tratamiento|tratamientos|treatments?|variants?|variantes?|a\/b|asignad)/i.test(
      normalized,
    );

  if (mentionsExperimentSurface) {
    return { intent: "experiments_overview", experimentKey: null, source: "heuristic" };
  }

  return null;
}

function parseClassifierJson(raw: string): { intent: string; experimentKey: string | null } | null {
  const trimmed = raw.trim();
  const jsonStart = trimmed.indexOf("{");
  const jsonEnd = trimmed.lastIndexOf("}");
  if (jsonStart < 0 || jsonEnd <= jsonStart) return null;
  try {
    const parsed = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1)) as {
      intent?: unknown;
      experimentKey?: unknown;
    };
    const intent = typeof parsed.intent === "string" ? parsed.intent : "";
    const experimentKey =
      typeof parsed.experimentKey === "string" && parsed.experimentKey.trim()
        ? parsed.experimentKey.trim()
        : null;
    return { intent, experimentKey };
  } catch {
    return null;
  }
}

async function classifyStaffQueryWithLlm(
  text: string,
): Promise<StaffQueryClassification | null> {
  const experiments = await listExperiments().catch(() => []);
  const catalog = experiments.slice(0, 20).map((e) => ({
    key: e.key,
    name: e.name,
    status: e.status,
  }));

  const res = await fetchGatewayChatCompletions({
    model: "openai/gpt-4o-mini",
    temperature: 0,
    max_tokens: 120,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You classify staff operational questions for trefolio ProdOps. " +
          "Return JSON only: {\"intent\":\"...\",\"experimentKey\":null}. " +
          `intent must be one of: ${PRODOPS_STAFF_INTENTS.join(", ")}. ` +
          "Use experiments_overview for questions about A/B tests, treatments, variants, or how many users are assigned. " +
          "Set experimentKey to a catalog key when the question names one experiment; otherwise null. " +
          "Use help when the question is unrelated or asks to change data. " +
          "Never invent metrics. Classification only.",
      },
      {
        role: "user",
        content: JSON.stringify({
          question: text.slice(0, 500),
          experiments: catalog,
        }),
      },
    ],
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = json.choices?.[0]?.message?.content || "";
  const parsed = parseClassifierJson(content);
  if (!parsed || !INTENT_SET.has(parsed.intent)) return null;

  const allowedKeys = new Set(catalog.map((e) => e.key));
  const experimentKey =
    parsed.experimentKey && allowedKeys.has(parsed.experimentKey)
      ? parsed.experimentKey
      : null;

  return {
    intent: parsed.intent as ProdOpsStaffIntent,
    experimentKey,
    source: "llm",
  };
}

/**
 * Resolve a staff Telegram message to a closed intent. Heuristic first; LLM
 * only for leftover natural language. On LLM failure, return help.
 */
export async function classifyStaffQuery(text: string): Promise<StaffQueryClassification> {
  const heuristic = matchStaffQueryHeuristic(text);
  if (heuristic) {
    if (heuristic.intent === "experiments_overview") {
      const experiments = await listExperiments().catch(() => []);
      const normalized = normalizeStaffText(text);
      const named = experiments.find(
        (e) =>
          normalized.includes(e.key.toLowerCase()) ||
          normalized.includes(e.name.toLowerCase()),
      );
      return {
        ...heuristic,
        experimentKey: named?.key ?? null,
      };
    }
    return heuristic;
  }

  try {
    const llm = await classifyStaffQueryWithLlm(text);
    if (llm) return llm;
  } catch (error) {
    console.warn(
      "[prodops-staff-query] llm classify failed",
      error instanceof Error ? error.message : error,
    );
  }

  return { intent: "help", experimentKey: null, source: "fallback" };
}
