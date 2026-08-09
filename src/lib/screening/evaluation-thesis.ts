import type { ArtOfInvestingEvaluation } from "@/lib/screening/schemas";

/** Render Estebaranz structured evaluation into a readable thesis string. */
export function renderEvaluationThesis(
  evaluation: ArtOfInvestingEvaluation,
): string {
  const gaps =
    evaluation.informationGaps.length > 0
      ? evaluation.informationGaps.map((g) => `- ${g}`).join("\n")
      : "- (none listed)";
  const parts = [
    `1. VEREDICTO DEL FILTRO — ${evaluation.filterVerdict}: ${evaluation.filterReason}`,
    `2. EL NEGOCIO EN 3 FRASES\n${evaluation.businessThreeSentences}`,
    `3. TIPO DE EMPRESA — ${evaluation.companyType}`,
    `4. MOAT\n${evaluation.moat}`,
    `5. DIRECTIVA\n${evaluation.management}`,
    `6. NÚMEROS\n${evaluation.financials}`,
    `7. CRECIMIENTO\n${evaluation.growth}`,
    `8. VALORACIÓN\n${evaluation.valuation}`,
    `9. CATALIZADORES\n${evaluation.catalysts}`,
    `10. RIESGOS Y PRE-MORTEM\n${evaluation.risksAndPremortem}`,
    `11. QUÉ INVALIDA LA TESIS\n${evaluation.thesisInvalidation}`,
    `12. LAGUNAS DE INFORMACIÓN\n${gaps}`,
    `13. NIVEL DE CONVICCIÓN — ${evaluation.conviction}: ${evaluation.convictionReason}`,
    evaluation.disclaimer,
  ];
  return parts.join("\n\n").slice(0, 4000);
}
