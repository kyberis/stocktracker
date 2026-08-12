import { fetchGatewayChatCompletions } from "@/lib/ai/gateway";

import type { AnomalyExplainResult, AnomalyScanFinding } from "./types";

function buildDeterministicExplanation(findings: AnomalyScanFinding[]): AnomalyExplainResult {
  const codes = [...new Set(findings.map((f) => f.code))];
  const errors = findings.filter((f) => f.severity === "error").length;
  const warns = findings.filter((f) => f.severity === "warn").length;
  const autoFixable = findings.filter((f) => f.autoFixable).length;

  const aiExplanation =
    `Detected ${findings.length} portfolio data issue(s) (${errors} error, ${warns} warn). ` +
    `Codes: ${codes.join(", ") || "none"}. ` +
    `${autoFixable} finding(s) look safe to auto-fix. ` +
    `AI-generated narrative unavailable; this summary is deterministic.`;

  const steps: string[] = [];
  if (autoFixable > 0) {
    steps.push("1. Click Apply safe fix (Telegram or admin) to run auto-fixable repairs.");
  }
  if (findings.some((f) => f.code === "ledger_holdings_mismatch")) {
    steps.push("2. Review ledger vs holdings; rebuild holdings if SnapTrade is not the source of truth.");
  }
  if (findings.some((f) => f.code === "snapshot_spike")) {
    steps.push("3. Inspect recent snapshots and backfill if values look corrupt.");
  }
  if (findings.some((f) => !f.autoFixable)) {
    steps.push("4. Open the user in admin and manually review non-auto-fixable findings.");
  }
  if (steps.length === 0) {
    steps.push("1. Open the anomaly in admin and review evidence.");
  }

  return {
    aiExplanation,
    remediationPrompt: steps.join("\n"),
  };
}

/**
 * LLM explanation + remediation prompt for staff. Falls back to deterministic text.
 */
export async function explainAnomalyFindings(args: {
  findings: AnomalyScanFinding[];
  username?: string;
  headers?: Headers;
}): Promise<AnomalyExplainResult> {
  const fallback = buildDeterministicExplanation(args.findings);
  if (args.findings.length === 0) {
    return {
      aiExplanation: "No findings.",
      remediationPrompt: "Nothing to do.",
    };
  }

  const compact = args.findings.slice(0, 25).map((f) => ({
    severity: f.severity,
    code: f.code,
    ticker: f.ticker,
    message: f.message,
    autoFixable: f.autoFixable,
    fixAction: f.fixAction,
  }));

  try {
    const res = await fetchGatewayChatCompletions(
      {
        model: "openai/gpt-4o-mini",
        temperature: 0.2,
        max_tokens: 360,
        messages: [
          {
            role: "system",
            content:
              "You are a staff-only portfolio data-quality assistant for trefolio ops. " +
              "Given anomaly findings, return JSON with keys aiExplanation (2-4 short sentences) " +
              "and remediationPrompt (numbered steps for an admin: which safe fix to apply, what to check). " +
              "Do not give investment advice. Say the text is AI-generated and may be inaccurate. " +
              "Never invent holdings that are not in the findings.",
          },
          {
            role: "user",
            content: JSON.stringify({
              username: args.username || "unknown",
              findings: compact,
            }),
          },
        ],
      },
      { headers: args.headers },
    );
    if (!res.ok) return fallback;
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content?.trim() || "";
    if (!content) return fallback;

    const parsed = tryParseExplainJson(content);
    if (parsed) return parsed;

    return {
      aiExplanation: content.slice(0, 800),
      remediationPrompt: fallback.remediationPrompt,
    };
  } catch {
    return fallback;
  }
}

function tryParseExplainJson(content: string): AnomalyExplainResult | null {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const obj = JSON.parse(content.slice(start, end + 1)) as {
      aiExplanation?: unknown;
      remediationPrompt?: unknown;
    };
    const aiExplanation = String(obj.aiExplanation || "").trim();
    const remediationPrompt = String(obj.remediationPrompt || "").trim();
    if (!aiExplanation) return null;
    return {
      aiExplanation: aiExplanation.slice(0, 1200),
      remediationPrompt: remediationPrompt.slice(0, 1200) || "Open admin and review findings.",
    };
  } catch {
    return null;
  }
}

export { buildDeterministicExplanation };
