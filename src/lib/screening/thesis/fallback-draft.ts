import type { HardDataCandidate } from "@/lib/screening/schemas";
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

function numFact(facts: ThesisFact[], fieldId: string): number | null {
  const v = facts.find((f) => f.field_id === fieldId)?.value;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function fmt(n: number, digits = 2): string {
  return n.toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
}

export interface FallbackThesisExtras {
  candidate?: HardDataCandidate;
}

export function fallbackThesisDraft(
  ticker: string,
  locale: string,
  assessment: Parameters<typeof maxConvictionForAssessment>[0],
  facts: ThesisFact[],
  extras?: FallbackThesisExtras,
): ThesisDraft | null {
  const d1 = facts.find((f) => f.field_id === "EQ:D1");
  const d1n = numFact(facts, "EQ:D1");
  const e1n = numFact(facts, "EQ:E1");
  const fwdPe = numFact(facts, "calc:fwd_pe");
  const histPe = numFact(facts, "calc:hist_pe_avg");
  const upside = numFact(facts, "calc:upside_pct");
  const target = numFact(facts, "calc:target_price");
  const consensusEps = numFact(facts, "calc:consensus_eps");
  const name = extras?.candidate?.name?.trim() || ticker;
  const industry = extras?.candidate?.industry?.trim();
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
  const qualityBits = [
    d1n != null ? `FCF/NI ${fmt(d1n)}` : null,
    e1n != null ? `ND/EBITDA ${fmt(e1n)}x` : null,
    industry ?? null,
  ].filter(Boolean);
  const qualityPhrase =
    qualityBits.length > 0 ? qualityBits.join(", ") : "published filings";
  const pePhrase =
    fwdPe != null && histPe != null
      ? es
        ? `PER a futuro ${fmt(fwdPe)}x frente a una media histórica de ${fmt(histPe)}x`
        : `forward P/E ${fmt(fwdPe)}x vs a ${fmt(histPe)}x multi-year average`
      : fwdPe != null
        ? es
          ? `PER a futuro ${fmt(fwdPe)}x`
          : `forward P/E ${fmt(fwdPe)}x`
        : null;
  const consensusBits: string[] = [];
  if (upside != null) {
    consensusBits.push(
      es
        ? `el precio objetivo publicado implica unos ${fmt(upside, 1)}% frente al último precio`
        : `the published analyst target implies about ${fmt(upside, 1)}% vs the last price`,
    );
  } else if (target != null) {
    consensusBits.push(
      es
        ? `hay un precio objetivo de consenso en ${fmt(target)}`
        : `a consensus target price sits at ${fmt(target)}`,
    );
  }
  if (consensusEps != null) {
    consensusBits.push(
      es
        ? `BPA estimado de consenso ${fmt(consensusEps)}`
        : `street EPS estimate ${fmt(consensusEps)}`,
    );
  }
  if (pePhrase) consensusBits.push(pePhrase);
  const consensusView =
    consensusBits.length > 0
      ? `${consensusBits.join("; ")}. ${
          es
            ? "Eso es consenso de analistas, no guidance de la empresa."
            : "That is street consensus, not company-issued guidance."
        }`
      : es
        ? "No hay precio objetivo ni PER a futuro en el paquete FMP de este nombre."
        : "No target price or forward P/E was present in this FMP bundle.";
  const ourView = es
    ? `Calidad y balance se puntúan con hechos de cuentas (${qualityPhrase}), no con el precio objetivo.`
    : `Quality and the balance sheet are scored from filing facts (${qualityPhrase}), independent of the target.`;
  const statement = es
    ? `Creo que ${name} (${ticker}) puede seguir en pie 36 meses si la conversión de caja y el apalancamiento publicados se sostienen cerca de ${qualityPhrase}; el mercado ya descuenta parte de esa calidad${pePhrase ? ` (${pePhrase})` : ""}.`
    : `I believe ${name} (${ticker}) can sustain published cash conversion and leverage near ${qualityPhrase} over 36 months; the market already prices some of that quality${pePhrase ? ` (${pePhrase})` : ""}.`;
  const raw = {
    ticker,
    statement: statement.slice(0, 800),
    variant_perception: {
      consensus_view: consensusView.slice(0, 600),
      our_view: ourView.slice(0, 600),
      why_mispricing_persists: es
        ? "El mercado puede estar descontando dilución, crecimiento o un múltiplo distinto al de las cuentas."
        : "The market may be discounting dilution, growth, or a multiple that differs from the filings.",
    },
    horizon_months: 36,
    conviction: Math.min(2, maxConvictionForAssessment(assessment)),
    conviction_rationale: "Fallback draft grounded in FMP facts without a full LLM pass.",
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
