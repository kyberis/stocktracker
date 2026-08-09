/**
 * Deterministic educational thesis for screening candidate cards.
 *
 * The Compiler may supply a short lead sentence; this builder expands it into
 * beginner-friendly paragraphs grounded only in numbers and agent outputs
 * already on the card. Never invents prices, news, or recommendations.
 */

export interface ThesisBuilderInput {
  locale: string;
  companyName: string;
  ticker: string;
  /** Short Compiler / Hard Data lead (optional). */
  lead?: string | null;
  businessOneLiner?: string | null;
  catalyst?: string | null;
  catalystDate?: string | null;
  fwdPe?: number | null;
  ownHistPe?: number | null;
  evEbitda?: number | null;
  ndEbitda?: number | null;
  dividendYield?: number | null;
  netCash?: boolean | null;
  upsidePct?: number | null;
  moatScore?: number | null;
  growthNote?: string | null;
  sentimentSummary?: string | null;
  insiderBias?: "buying" | "selling" | "mixed" | "none" | null;
  positionKind?: "new_position" | "top_up_existing" | null;
  suitability?: "fit" | "stretch" | "poor_fit" | null;
  concentrationImpact?: string | null;
  score?: number | null;
  stepsPassed?: number[] | null;
  stepsFailed?: number[] | null;
  technicals?: {
    distanceTo52wHighPct?: number | null;
    distanceTo52wLowPct?: number | null;
    aboveMa200?: boolean | null;
    return1yPct?: number | null;
    return3mPct?: number | null;
    volatilityAnnPct?: number | null;
  } | null;
}

function isEs(locale: string): boolean {
  return locale.toLowerCase().startsWith("es");
}

/** Heuristic: catalyst text looks like M&A / merger / acquisition. */
export function isMergerOrAcquisitionCatalyst(catalyst: string): boolean {
  const t = catalyst.toLowerCase();
  return (
    /\bmerg(er|e|ing)\b/.test(t) ||
    /\bacquisit(ion|ions)\b/.test(t) ||
    /\bacquire[ds]?\b/.test(t) ||
    /\btakeover\b/.test(t) ||
    /\bfusi[oó]n\b/.test(t) ||
    /\badquisici[oó]n\b/.test(t) ||
    /\bcombinaci[oó]n\b/.test(t) ||
    /\bdeal\b/.test(t) && /\b(unilever|buy|sell|stock)\b/.test(t)
  );
}

function fmtMult(n: number): string {
  return `${n.toFixed(1)}x`;
}

function fmtPct(n: number, digits = 0): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}

function fmtYield(n: number): string {
  // Stored as fraction (0.036) or already percent — treat >1 as percent points.
  const pct = n > 1 ? n : n * 100;
  return `${pct.toFixed(1)}%`;
}

/**
 * Build a multi-paragraph educational thesis. Returns plain text with
 * blank lines between paragraphs for `whitespace-pre-line` rendering.
 */
export function buildEducationalThesis(input: ThesisBuilderInput): string {
  const es = isEs(input.locale);
  const paras: string[] = [];
  const name = input.companyName || input.ticker;

  const lead = (input.lead ?? "").trim();
  const business = (input.businessOneLiner ?? "").trim();
  if (lead && lead.length >= 40) {
    paras.push(lead);
  } else if (business) {
    paras.push(
      es
        ? `${name} (${input.ticker}): ${business}`
        : `${name} (${input.ticker}): ${business}`,
    );
  } else {
    paras.push(
      es
        ? `${name} (${input.ticker}) aparece en la shortlist porque encaja con el brief de búsqueda.`
        : `${name} (${input.ticker}) made the shortlist because it fits the search brief.`,
    );
  }

  // Valuation
  const pe = input.fwdPe ?? input.ownHistPe;
  const valBits: string[] = [];
  if (pe != null && pe > 0) {
    valBits.push(
      es
        ? `El PER (precio / beneficio) está en ${fmtMult(pe)}. En lenguaje sencillo: cuántos años de beneficios “paga” el precio actual; un PER más bajo suele verse como más barato, aunque depende del sector y del crecimiento — y de si el beneficio es recurrente o incluye extraordinarios.`
        : `The P/E (price-to-earnings) is ${fmtMult(pe)}. In plain terms: how many years of earnings the current share price is paying for; a lower P/E often reads as cheaper, though it depends on the sector and growth — and on whether earnings are recurring or include one-offs.`,
    );
  }
  if (input.evEbitda != null && input.evEbitda > 0) {
    valBits.push(
      es
        ? `El EV/EBITDA está en ${fmtMult(input.evEbitda)}. Compara el valor de la empresa (incluido el endeudamiento) con su beneficio operativo aproximado; es útil para comparar negocios con distinta deuda.`
        : `EV/EBITDA is ${fmtMult(input.evEbitda)}. It compares the whole firm value (including debt) with approximate operating profit; useful when comparing companies with different leverage.`,
    );
  }
  if (input.upsidePct != null) {
    valBits.push(
      es
        ? `Respecto al precio objetivo de consenso hay un ${fmtPct(input.upsidePct)} de diferencia. Eso no es una promesa de retorno: es la distancia entre el precio de mercado y la media de analistas.`
        : `Versus the consensus target price there is a ${fmtPct(input.upsidePct)} gap. That is not a return promise — only the distance between the market price and the analyst average.`,
    );
  }
  if (valBits.length > 0) paras.push(valBits.join(" "));

  // Balance sheet / income to shareholder
  const balBits: string[] = [];
  if (input.ndEbitda != null) {
    balBits.push(
      es
        ? `La deuda neta / EBITDA es ${fmtMult(input.ndEbitda)}. Mide cuántos años de beneficio operativo harían falta, a grandes rasgos, para pagar la deuda neta; por debajo de ~3x suele leerse como más cómoda.`
        : `Net debt / EBITDA is ${fmtMult(input.ndEbitda)}. Roughly: how many years of operating profit it would take to pay off net debt; under ~3x is often read as more comfortable.`,
    );
  }
  if (input.netCash === true) {
    balBits.push(
      es
        ? `La compañía aparece con posición de caja neta (más caja que deuda).`
        : `The company shows a net-cash position (more cash than debt).`,
    );
  }
  if (input.dividendYield != null && input.dividendYield > 0) {
    balBits.push(
      es
        ? `La rentabilidad por dividendo es del ${fmtYield(input.dividendYield)}: lo que el dividendo anual representa respecto al precio, si se mantiene.`
        : `Dividend yield is ${fmtYield(input.dividendYield)}: annual dividends as a share of the price, if maintained.`,
    );
  }
  if (input.moatScore != null) {
    balBits.push(
      es
        ? `La puntuación MOAT de trefolio es ${input.moatScore.toFixed(0)}/100 (ventaja competitiva estimada a partir de datos internos; no es una garantía).`
        : `trefolio’s MOAT score is ${input.moatScore.toFixed(0)}/100 (estimated competitive advantage from internal data — not a guarantee).`,
    );
  }
  if (input.growthNote) {
    balBits.push(
      es
        ? `Nota de crecimiento: ${input.growthNote.trim()}`
        : `Growth note: ${input.growthNote.trim()}`,
    );
  }
  if (balBits.length > 0) paras.push(balBits.join(" "));

  // Technicals
  const t = input.technicals;
  if (t) {
    const techBits: string[] = [];
    if (t.return1yPct != null) {
      techBits.push(
        es
          ? `En 12 meses la acción lleva ${fmtPct(t.return1yPct)} (rentabilidad pasada, no predicción).`
          : `Over 12 months the share is ${fmtPct(t.return1yPct)} (past performance, not a forecast).`,
      );
    }
    if (t.return3mPct != null) {
      techBits.push(
        es
          ? `En 3 meses: ${fmtPct(t.return3mPct)}.`
          : `Over 3 months: ${fmtPct(t.return3mPct)}.`,
      );
    }
    if (t.distanceTo52wHighPct != null) {
      techBits.push(
        es
          ? `Está ${fmtPct(t.distanceTo52wHighPct)} respecto a su máximo de 52 semanas.`
          : `It sits ${fmtPct(t.distanceTo52wHighPct)} from its 52-week high.`,
      );
    }
    if (t.aboveMa200 != null) {
      techBits.push(
        es
          ? t.aboveMa200
            ? `Cotiza por encima de su media de 200 días (tendencia de medio plazo más constructiva en lectura técnica simple).`
            : `Cotiza por debajo de su media de 200 días (en lectura técnica simple, la tendencia de medio plazo sigue débil).`
          : t.aboveMa200
            ? `It trades above its 200-day average (a simple medium-term technical read that leans constructive).`
            : `It trades below its 200-day average (a simple medium-term technical read that still looks soft).`,
      );
    }
    if (t.volatilityAnnPct != null) {
      techBits.push(
        es
          ? `La volatilidad anualizada estimada es ~${t.volatilityAnnPct.toFixed(0)}%: cómo de “movida” ha sido la cotización.`
          : `Estimated annualised volatility is ~${t.volatilityAnnPct.toFixed(0)}%: how choppy the share price has been.`,
      );
    }
    if (techBits.length > 0) {
      paras.push(
        (es
          ? "Lectura técnica (solo contexto de precio, no un consejo): "
          : "Technical read (price context only, not advice): ") +
          techBits.join(" "),
      );
    }
  }

  // Catalyst / IR
  if (input.catalyst) {
    const when = input.catalystDate ? ` (${input.catalystDate})` : "";
    paras.push(
      es
        ? `Catalizador señalado por la investigación: ${input.catalyst}${when}. Un catalizador es un evento con fecha que podría cambiar cómo el mercado valora el negocio; hay que contrastarlo con fuentes oficiales.`
        : `Catalyst flagged by research: ${input.catalyst}${when}. A catalyst is a dated event that could change how the market values the business — always check official sources.`,
    );
    if (isMergerOrAcquisitionCatalyst(input.catalyst)) {
      paras.push(
        es
          ? "Riesgo de estructura del acuerdo (M&A/fusión): una fusión o adquisición grande puede diluir al accionista actual, cambiar el control (p. ej. pasar a minoritario) y añadir apalancamiento al balance combinado. El cierre suele tardar meses; no es una adquisición “simple” hasta verificar términos, canje y calendario en fuentes oficiales."
          : "Deal-structure risk (M&A/merger): a large merger or acquisition can dilute today’s shareholders, change control (e.g. becoming a minority holder) and add leverage to the combined balance sheet. Closing often takes many months — treat it as a structural event and verify exchange terms, ownership split and timeline in official sources.",
      );
    }
  }

  // Sentiment
  const sentBits: string[] = [];
  if (input.sentimentSummary) {
    sentBits.push(input.sentimentSummary.trim());
  }
  if (input.insiderBias && input.insiderBias !== "none") {
    const biasEs =
      input.insiderBias === "buying"
        ? "sesgo comprador"
        : input.insiderBias === "selling"
          ? "sesgo vendedor"
          : "señal mixta";
    const biasEn =
      input.insiderBias === "buying"
        ? "buying bias"
        : input.insiderBias === "selling"
          ? "selling bias"
          : "mixed signal";
    sentBits.push(
      es
        ? `Insiders (directivos/accionistas significativos en filings): ${biasEs}. No implica que debas comprar o vender.`
        : `Insiders (executives / significant holders in filings): ${biasEn}. This does not mean you should buy or sell.`,
    );
  }
  if (sentBits.length > 0) paras.push(sentBits.join(" "));

  // Fit / risk
  const fitBits: string[] = [];
  if (input.positionKind === "new_position") {
    fitBits.push(
      es
        ? "En tu cartera figura como posible posición nueva (no aparece solapamiento fuerte con un holding existente)."
        : "In your portfolio context this looks like a possible new position (no strong overlap with an existing holding).",
    );
  } else if (input.positionKind === "top_up_existing") {
    fitBits.push(
      es
        ? "En tu cartera figura como posible ampliación de una posición ya existente."
        : "In your portfolio context this looks like a possible top-up of an existing holding.",
    );
  }
  if (input.suitability) {
    const suitEs =
      input.suitability === "fit"
        ? "encaja"
        : input.suitability === "stretch"
          ? "estira el perfil"
          : "encaja mal";
    const suitEn =
      input.suitability === "fit"
        ? "fits"
        : input.suitability === "stretch"
          ? "stretches"
          : "fits poorly with";
    fitBits.push(
      es
        ? `Respecto al perfil de riesgo del brief, la lectura es que ${suitEs}.`
        : `Against the brief’s risk profile, the read is that it ${suitEn} it.`,
    );
  }
  if (input.concentrationImpact) {
    fitBits.push(input.concentrationImpact.trim());
  }
  if (fitBits.length > 0) paras.push(fitBits.join(" "));

  // Methodology score
  if (input.score != null) {
    const passed = input.stepsPassed?.length ?? 0;
    paras.push(
      es
        ? `En la checklist de metodología trefolio suma ${input.score} criterios cumplidos (de los evaluables). Eso ordena la investigación; no es una recomendación de compra ni una nota crediticia.`
        : `On the trefolio methodology checklist it meets ${input.score} scored criteria (of those that could be evaluated${passed ? `; ${passed} marked as met` : ""}). That ranks research — it is not a buy recommendation or a credit rating.`,
    );
  }

  paras.push(
    es
      ? "Esto es investigación automatizada con posibles errores. No es asesoramiento financiero; verifica siempre los datos en fuentes oficiales antes de decidir."
      : "This is automated research and may contain errors. It is not financial advice — always verify figures with official sources before deciding.",
  );

  return paras
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 4000);
}
