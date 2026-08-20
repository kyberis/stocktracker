import {
  ADVICE_LANGUAGE,
  thesisDraftSchema,
  type ThesisDraft,
  type ThesisFact,
} from "@/lib/screening/thesis/schemas";
import { maxConvictionForAssessment } from "@/lib/screening/thesis/score-assessment";

const DISCLAIMER_EN =
  "This analysis is informational and does not constitute investment advice. AI output may be incomplete.";
const DISCLAIMER_ES =
  "Este análisis es informativo y no constituye asesoramiento de inversión. La salida de IA puede estar incompleta.";

export function fallbackThesisDraft(
  ticker: string,
  locale: string,
  assessment: Parameters<typeof maxConvictionForAssessment>[0],
  facts: ThesisFact[],
): ThesisDraft | null {
  const d1 = facts.find((f) => f.field_id === "EQ:D1");
  const gaps: string[] = [];
  if (d1?.value == null) {
    gaps.push("EQ:D1 missing — cannot bind a cash-conversion kill criterion.");
  }
  const kill =
    d1?.value != null
      ? [
          {
            metric_field_id: "EQ:D1" as const,
            operator: "<" as const,
            threshold: 0.6,
            window: "TTM 3y average",
            action: "review" as const,
            label: "FCF/NI average falls below 0.6",
          },
        ]
      : [];
  if (kill.length === 0) {
    gaps.push("No code-evaluable kill criterion available from facts.");
  }
  const es = locale.toLowerCase().startsWith("es");
  const raw = {
    ticker,
    statement: es
      ? `Creo que la calidad de negocio publicada de ${ticker} puede seguir en pie 36 meses si la conversión de caja y el apalancamiento se sostienen; el mercado ya descuenta parte de esa calidad.`
      : `I believe ${ticker} can sustain its published business quality over 36 months if cash conversion and leverage stay in line with history; the market already prices some of that quality.`,
    variant_perception: {
      consensus_view:
        "Consensus estimates were not fetched in this pipeline version (I1–I3 gap).",
      our_view:
        "Quality and balance-sheet facts are scored independently of price targets.",
      why_mispricing_persists:
        "Insufficient measured consensus — this is a gap, not a hidden edge.",
    },
    horizon_months: 36,
    conviction: Math.min(2, maxConvictionForAssessment(assessment)),
    conviction_rationale: "Fallback draft without a full LLM narrative pass.",
    kill_criteria: kill,
    premortem:
      "It is 2029 and this position is down 50 percent. The most likely causes are a broken cash-conversion story, a refinancing wall, or a thesis that was never falsifiable because consensus was not measured.",
    scenarios: [
      {
        label: "bear" as const,
        probability: 0.25,
        value: 0,
        key_assumptions: [{ driver: "fcf_ni", assumption: "breaks below 0.6" }],
      },
      {
        label: "base" as const,
        probability: 0.5,
        value: 0,
        key_assumptions: [{ driver: "fcf_ni", assumption: "stays near history" }],
      },
      {
        label: "bull" as const,
        probability: 0.25,
        value: 0,
        key_assumptions: [{ driver: "multiple", assumption: "mean reversion" }],
      },
    ],
    status: assessment.verdict === "watchlist_gate_failed" ? "watchlist" : "draft",
    gaps,
    disclaimer: es ? DISCLAIMER_ES : DISCLAIMER_EN,
  };
  if (ADVICE_LANGUAGE.test(`${raw.statement} ${raw.premortem}`)) {
    return null;
  }
  const parsed = thesisDraftSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
