import type { ScreeningAgentOutputRow } from "@/lib/db/screening";
import {
  thesisEvaluateOutputSchema,
  thesisHardDataOutputSchema,
  thesisIrOutputSchema,
  thesisQaOutputSchema,
  thesisReportSchema,
  thesisWebOutputSchema,
  type ThesisReport,
  type ThesisSoftAssessment,
} from "@/lib/screening/thesis/schemas";
import { THESIS_RULESET_VERSION } from "@/lib/screening/thesis/schemas";

const DISCLAIMER_EN =
  "This analysis is informational and does not constitute investment advice. AI output may be incomplete.";
const DISCLAIMER_ES =
  "Este análisis es informativo y no constituye asesoramiento de inversión. La salida de IA puede estar incompleta.";

export function composeThesisReport(opts: {
  runId: string;
  locale?: string;
  outputs: ScreeningAgentOutputRow[];
}): ThesisReport | null {
  const latest = new Map<string, ScreeningAgentOutputRow>();
  for (const o of opts.outputs) {
    const prev = latest.get(o.agentKind);
    if (!prev || Date.parse(o.createdAt) >= Date.parse(prev.createdAt)) {
      latest.set(o.agentKind, o);
    }
  }
  const hdRaw = latest.get("thesis_hard_data");
  const evRaw = latest.get("thesis_evaluate");
  if (!hdRaw || !evRaw) return null;
  const hd = thesisHardDataOutputSchema.safeParse(JSON.parse(hdRaw.outputJson));
  const ev = thesisEvaluateOutputSchema.safeParse(JSON.parse(evRaw.outputJson));
  if (!hd.success || !ev.success) return null;
  const qaRaw = latest.get("thesis_qa");
  const qa = qaRaw
    ? thesisQaOutputSchema.safeParse(JSON.parse(qaRaw.outputJson))
    : null;

  const irSoft: ThesisSoftAssessment[] = [];
  const webSoft: ThesisSoftAssessment[] = [];
  for (const o of opts.outputs) {
    if (o.agentKind === "thesis_ir") {
      const parsed = thesisIrOutputSchema.safeParse(JSON.parse(o.outputJson));
      if (parsed.success) irSoft.push(...parsed.data.soft_assessments);
    }
    if (o.agentKind === "thesis_web") {
      const parsed = thesisWebOutputSchema.safeParse(JSON.parse(o.outputJson));
      if (parsed.success) webSoft.push(...parsed.data.soft_assessments);
    }
  }

  const degraded = new Set(
    (qa?.success ? qa.data.degradedTickers : []).map((t) => t.toUpperCase()),
  );

  const cards = ev.data.evaluations
    .filter((e) => !degraded.has(e.ticker.toUpperCase()) || ev.data.evaluations.length === 1)
    .map((e) => ({
      ticker: e.ticker,
      companyName: e.companyName,
      assessment: e.assessment,
      thesis_draft: e.thesis_draft,
      facts: hd.data.facts
        .filter((f) => f.asset_id.toUpperCase() === e.ticker.toUpperCase())
        .slice(0, 80),
      soft_assessments: [...irSoft, ...webSoft].filter(
        (s) => s.asset_id.toUpperCase() === e.ticker.toUpperCase(),
      ),
      gaps: e.thesis_draft?.gaps ?? [],
    }));

  const parsed = thesisReportSchema.safeParse({
    kind: "thesis",
    runId: opts.runId,
    locale: opts.locale ?? ev.data.locale,
    generatedAt: new Date().toISOString(),
    ruleset_version: THESIS_RULESET_VERSION,
    cards,
    disclaimer: (opts.locale ?? ev.data.locale).startsWith("es")
      ? DISCLAIMER_ES
      : DISCLAIMER_EN,
    qa: qa?.success ? qa.data : null,
  });
  return parsed.success ? parsed.data : null;
}
