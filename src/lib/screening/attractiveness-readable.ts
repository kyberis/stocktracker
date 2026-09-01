import type { ThesisFact } from "@/lib/screening/thesis/schemas";
import {
  formatMetricValue,
  metricLocaleFromTag,
} from "@/lib/screening/thesis/metrics/format";
import { grahamFairPe } from "@/lib/screening/attractiveness";

export type CheckDisplayStatus = "pass" | "fail" | "unknown" | "skipped";

function factNum(facts: ThesisFact[], fieldId: string): number | null {
  const v = facts.find((f) => f.field_id === fieldId)?.value;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function factBool(facts: ThesisFact[], fieldId: string): boolean | null {
  const v = facts.find((f) => f.field_id === fieldId)?.value;
  return typeof v === "boolean" ? v : null;
}

function pctFromFact(facts: ThesisFact[], fieldId: string): number | null {
  const raw = factNum(facts, fieldId);
  if (raw == null) return null;
  return Math.abs(raw) <= 2 ? raw * 100 : raw;
}

function fmt(n: number | null, unit: "x" | "pct" | "pp" | "count", locale: string): string {
  if (n == null) return locale === "es" ? "n/d" : "n/a";
  return formatMetricValue(n, unit, metricLocaleFromTag(locale));
}

export interface FormattedAttractivenessCheck {
  data: string;
  meaning: string;
  interpretation: string;
}

export function formatAttractivenessCheck(opts: {
  checkId: string;
  locale: string;
  facts: ThesisFact[];
  status: CheckDisplayStatus;
}): FormattedAttractivenessCheck {
  const es = opts.locale.startsWith("es");
  const loc = es ? "es" : "en";

  switch (opts.checkId) {
    case "pe_vs_history":
      return formatPeVsHistory(opts.facts, opts.status, loc);
    case "eps_growth":
      return formatEpsGrowth(opts.facts, opts.status, loc);
    case "margin_trend":
      return formatMarginTrend(opts.facts, opts.status, loc);
    case "graham_rule":
      return formatGraham(opts.facts, opts.status, loc);
    case "balance_sheet":
      return formatBalanceSheet(opts.facts, opts.status, loc);
    case "moat":
      return formatMoat(opts.facts, opts.status, loc);
    case "capital_allocation":
      return formatCapitalAllocation(opts.facts, opts.status, loc);
    case "price_to_book":
      return formatPriceToBook(opts.facts, opts.status, loc);
    default:
      return {
        data: es ? "Sin datos" : "No data",
        meaning: "",
        interpretation: es ? "Check no reconocido." : "Unknown check.",
      };
  }
}

function formatPeVsHistory(
  facts: ThesisFact[],
  status: CheckDisplayStatus,
  loc: "es" | "en",
): FormattedAttractivenessCheck {
  const pe = factNum(facts, "calc:pe_current") ?? factNum(facts, "calc:fwd_pe");
  const hist = factNum(facts, "calc:hist_pe_avg");
  const peer = factNum(facts, "calc:peer_pe");
  const vsHist = pe != null && hist != null && hist > 0 ? pe / hist : null;
  const vsPeer = pe != null && peer != null && peer > 0 ? pe / peer : null;

  const meaning = loc === "es"
    ? "Compara el PER actual con la media de los últimos 5 años y con el sector. Por debajo del 90% suele leerse como descuento; por encima del 120%, prima cara."
    : "Compares current P/E with the 5-year average and sector. Below 90% of history/peers often reads as a discount; above 120% as expensive.";

  if (pe == null) {
    return {
      data: loc === "es" ? "PER actual: sin dato" : "Current P/E: not available",
      meaning,
      interpretation:
        loc === "es"
          ? "Sin PER fiable no podemos juzgar si cotiza barata o cara vs su historia."
          : "Without a reliable P/E we cannot judge cheap vs expensive vs history.",
    };
  }

  const parts: string[] = [
    loc === "es"
      ? `PER actual (TTM): ${fmt(pe, "x", loc)}`
      : `Current P/E (TTM): ${fmt(pe, "x", loc)}`,
  ];
  if (hist != null) {
    parts.push(
      loc === "es"
        ? `media 5 años ${fmt(hist, "x", loc)}${vsHist != null ? ` → ${Math.round(vsHist * 100)}% de su historia` : ""}`
        : `5y average ${fmt(hist, "x", loc)}${vsHist != null ? ` → ${Math.round(vsHist * 100)}% of its history` : ""}`,
    );
  }
  if (peer != null) {
    parts.push(
      loc === "es"
        ? `sector ~${fmt(peer, "x", loc)}${vsPeer != null ? ` → ${Math.round(vsPeer * 100)}% del sector` : ""}`
        : `sector ~${fmt(peer, "x", loc)}${vsPeer != null ? ` → ${Math.round(vsPeer * 100)}% of sector` : ""}`,
    );
  }

  const interpretation =
    status === "pass"
      ? loc === "es"
        ? "Cotiza con descuento frente a su propia historia o al sector — señal de posible baratura si la calidad se mantiene."
        : "Trades at a discount vs its own history or sector — potentially cheap if quality holds."
      : status === "fail"
        ? loc === "es"
          ? "Cotiza con prima alta (≥120% de historia o sector) — el mercado ya paga un múltiplo exigente."
          : "Trades at a rich premium (≥120% of history or sector) — the market already pays a demanding multiple."
        : loc === "es"
          ? "El múltiplo está en zona neutra o faltan comparables históricos/sectoriales."
          : "The multiple is neutral or historical/sector comparables are missing.";

  return { data: parts.join(". "), meaning, interpretation };
}

function formatEpsGrowth(
  facts: ThesisFact[],
  status: CheckDisplayStatus,
  loc: "es" | "en",
): FormattedAttractivenessCheck {
  const cagr = pctFromFact(facts, "calc:eps_cagr");
  const meaning = loc === "es"
    ? "Crecimiento anual compuesto del beneficio por acción (BPA). ≥8% sostenido es favorable; negativo indica contracción de beneficios."
    : "Compound annual growth in earnings per share. ≥8% sustained is favorable; negative means shrinking earnings.";

  const data =
    cagr != null
      ? loc === "es"
        ? `BPA creció ${fmt(cagr, "pct", loc)} anual compuesto en la ventana analizada.`
        : `EPS grew ${fmt(cagr, "pct", loc)} per year compounded over the analyzed window.`
      : loc === "es"
        ? "CAGR del BPA: sin serie suficiente (se necesitan ≥4 años)."
        : "EPS CAGR: insufficient annual series (need ≥4 years).";

  const interpretation =
    status === "pass"
      ? loc === "es"
        ? "Beneficio por acción en expansión — suele acompañar revalorización a largo plazo."
        : "Earnings per share are expanding — often supports long-term appreciation."
      : status === "fail"
        ? loc === "es"
          ? "BPA en caída — los beneficios no acompañan; vigilar si es temporal o estructural."
          : "EPS is falling — earnings are not keeping up; watch whether this is temporary or structural."
        : loc === "es"
          ? "Crecimiento moderado o datos incompletos — no confirma ni descarta calidad de beneficios."
          : "Moderate growth or incomplete data — neither confirms nor rules out earnings quality.";

  return { data, meaning, interpretation };
}

function formatMarginTrend(
  facts: ThesisFact[],
  status: CheckDisplayStatus,
  loc: "es" | "en",
): FormattedAttractivenessCheck {
  const op = factNum(facts, "calc:op_margin_delta_pp");
  const net = factNum(facts, "calc:net_margin_delta_pp");
  const years = factNum(facts, "calc:margin_years");
  const delta = op ?? net;
  const label = op != null ? (loc === "es" ? "margen operativo" : "operating margin") : loc === "es" ? "margen neto" : "net margin";

  const meaning = loc === "es"
    ? "Cambio del margen en puntos porcentuarios (pp) en varios años. Expansión o estabilidad indica poder de precios; caídas >2 pp son alerta."
    : "Margin change in percentage points (pp) over several years. Expansion or stability signals pricing power; drops beyond 2 pp are a warning.";

  const data =
    delta != null
      ? loc === "es"
        ? `El ${label} ${delta >= 0 ? "subió" : "bajó"} ${fmt(Math.abs(delta), "pp", loc)}${years != null ? ` en ~${Math.round(years)} años` : ""}.`
        : `${label.charAt(0).toUpperCase()}${label.slice(1)} ${delta >= 0 ? "rose" : "fell"} ${fmt(Math.abs(delta), "pp", loc)}${years != null ? ` over ~${Math.round(years)} years` : ""}.`
      : loc === "es"
        ? "Tendencia de márgenes: sin serie anual suficiente."
        : "Margin trend: not enough annual data.";

  const interpretation =
    status === "pass"
      ? delta != null && delta >= 0.5
        ? loc === "es"
          ? "Márgenes en expansión — buena señal de eficiencia o pricing power."
          : "Margins expanding — a good sign of efficiency or pricing power."
        : loc === "es"
          ? "Márgenes estables — el negocio defiende su rentabilidad."
          : "Margins stable — the business is defending profitability."
      : status === "fail"
        ? loc === "es"
          ? "Márgenes en contracción material — presión competitiva o de costes."
          : "Material margin compression — competitive or cost pressure."
        : loc === "es"
          ? "Lectura mixta o datos limitados — conviene cruzar con el sector."
          : "Mixed read or limited data — compare with the sector.";

  return { data, meaning, interpretation };
}

function formatGraham(
  facts: ThesisFact[],
  status: CheckDisplayStatus,
  loc: "es" | "en",
): FormattedAttractivenessCheck {
  const pe = factNum(facts, "calc:pe_current") ?? factNum(facts, "calc:fwd_pe");
  const growth = pctFromFact(facts, "calc:eps_cagr");
  const fair = grahamFairPe(growth);

  const meaning = loc === "es"
    ? "Regla de Graham: PER justo ≈ 8,5 + 2× crecimiento esperado (%). PER por debajo del justo sugiere margen de seguridad; muy por encima exige crecimiento alto."
    : "Graham rule: fair P/E ≈ 8.5 + 2× expected growth (%). P/E below fair suggests margin of safety; far above requires high growth.";

  const data =
    pe != null && fair != null
      ? loc === "es"
        ? `PER ${fmt(pe, "x", loc)} vs justo estimado ${fmt(fair, "x", loc)} (crecimiento BPA ${fmt(growth, "pct", loc)}).`
        : `P/E ${fmt(pe, "x", loc)} vs estimated fair ${fmt(fair, "x", loc)} (EPS growth ${fmt(growth, "pct", loc)}).`
      : loc === "es"
        ? "Múltiplo Graham: faltan PER o crecimiento del BPA."
        : "Graham multiple: missing P/E or EPS growth.";

  const interpretation =
    status === "pass"
      ? loc === "es"
        ? "El PER no supera el múltiplo justo (con margen) — valoración razonable para el crecimiento esperado."
        : "P/E does not exceed fair multiple (with margin) — reasonable valuation for expected growth."
      : status === "fail"
        ? loc === "es"
          ? "PER por encima del justo de Graham — el mercado exige mucho crecimiento futuro."
          : "P/E above Graham fair — the market demands a lot of future growth."
        : loc === "es"
          ? "Sin crecimiento o PER fiable, la regla de Graham no aplica con confianza."
          : "Without reliable growth or P/E, Graham rule does not apply confidently.";

  return { data, meaning, interpretation };
}

function formatBalanceSheet(
  facts: ThesisFact[],
  status: CheckDisplayStatus,
  loc: "es" | "en",
): FormattedAttractivenessCheck {
  const netCash = factBool(facts, "calc:net_cash");
  const nd = factNum(facts, "EQ:E1");
  const coverage = factNum(facts, "EQ:E2");

  const meaning = loc === "es"
    ? "Solidez financiera: caja neta, deuda neta/EBITDA <2,5× o cobertura de intereses >4× es sana; deuda ≥3,5× o cobertura <2× es frágil."
    : "Financial strength: net cash, net debt/EBITDA <2.5× or interest coverage >4× is healthy; debt ≥3.5× or coverage <2× is fragile.";

  const parts: string[] = [];
  if (netCash === true) {
    parts.push(loc === "es" ? "Caja neta (más caja que deuda)" : "Net cash (cash exceeds debt)");
  }
  if (nd != null) {
    parts.push(
      loc === "es"
        ? `deuda neta/EBITDA ${fmt(nd, "x", loc)}`
        : `net debt/EBITDA ${fmt(nd, "x", loc)}`,
    );
  }
  if (coverage != null) {
    parts.push(
      loc === "es"
        ? `cobertura de intereses ${fmt(coverage, "x", loc)}`
        : `interest coverage ${fmt(coverage, "x", loc)}`,
    );
  }

  const data =
    parts.length > 0
      ? parts.join("; ")
      : loc === "es"
        ? "Balance: sin métricas de apalancamiento disponibles."
        : "Balance sheet: leverage metrics not available.";

  const interpretation =
    status === "pass"
      ? loc === "es"
        ? "Balance conservador — puede absorber shocks de tipos, costes o demanda."
        : "Conservative balance sheet — can absorb rate, cost or demand shocks."
      : status === "fail"
        ? loc === "es"
          ? "Apalancamiento elevado o cobertura débil — menor colchón ante imprevistos."
          : "High leverage or weak coverage — less cushion against surprises."
        : loc === "es"
          ? "Apalancamiento en zona intermedia — vigilar evolución de tipos y refinanciación."
          : "Leverage in a middle zone — watch rates and refinancing.";

  return { data, meaning, interpretation };
}

function formatMoat(
  facts: ThesisFact[],
  status: CheckDisplayStatus,
  loc: "es" | "en",
): FormattedAttractivenessCheck {
  const score = factNum(facts, "calc:moat_score_pct");

  const meaning = loc === "es"
    ? "Puntuación 0–100 de ventaja competitiva (poder de precios, márgenes estables, barreras). ≥55 indica foso claro; <40, poco protegido. No es opinión de analistas."
    : "0–100 competitive advantage score (pricing power, stable margins, barriers). ≥55 indicates a clear moat; <40, little protection. Not an analyst opinion.";

  const data =
    score != null
      ? loc === "es"
        ? `Ventaja competitiva: ${fmt(score, "count", loc)}/100.`
        : `Competitive advantage: ${fmt(score, "count", loc)}/100.`
      : loc === "es"
        ? "Puntuación de foso: sin dato (se usa evidencia cualitativa si existe)."
        : "Moat score: not available (qualitative evidence used if present).";

  const interpretation =
    status === "pass"
      ? loc === "es"
        ? "Ventaja competitiva sólida — mejor defensa frente a competencia e inflación."
        : "Solid competitive advantage — better defense vs competition and inflation."
      : status === "fail"
        ? loc === "es"
          ? "Poco foso — márgenes y cuota de mercado más expuestos a la rivalidad."
          : "Weak moat — margins and share more exposed to rivalry."
        : score != null && score >= 40
          ? loc === "es"
            ? "Ventaja moderada — no es líder claro pero tampoco desprotegido."
            : "Moderate advantage — not a clear leader but not unprotected."
          : loc === "es"
            ? "Dato insuficiente para puntuar el foso con números."
            : "Insufficient data to score the moat numerically.";

  return { data, meaning, interpretation };
}

function formatCapitalAllocation(
  facts: ThesisFact[],
  status: CheckDisplayStatus,
  loc: "es" | "en",
): FormattedAttractivenessCheck {
  const shareCagr = pctFromFact(facts, "EQ:D7");
  const buyback = factBool(facts, "calc:buyback");
  const severe = factBool(facts, "calc:severe_dilution");

  const meaning = loc === "es"
    ? "Cómo la empresa reparte capital: recompras (CAGR de acciones negativo) elevan valor por acción; dilución >3% anual reduce tu parte del negocio."
    : "How the company allocates capital: buybacks (negative share-count CAGR) lift per-share value; dilution above 3% per year shrinks your slice of the business.";

  let data: string;
  if (buyback === true || (shareCagr != null && shareCagr < -2)) {
    data = loc === "es"
      ? `Recompras activas — acciones ${fmt(Math.abs(shareCagr ?? 0), "pct", loc)}/año de reducción.`
      : `Active buybacks — share count shrinking ${fmt(Math.abs(shareCagr ?? 0), "pct", loc)}/year.`;
  } else if (shareCagr != null) {
    data =
      shareCagr > 0
        ? loc === "es"
          ? `Dilución: acciones +${fmt(shareCagr, "pct", loc)}/año (cada acción es una porción menor).`
          : `Dilution: shares +${fmt(shareCagr, "pct", loc)}/year (each share is a smaller slice).`
        : loc === "es"
          ? `Acciones ${fmt(shareCagr, "pct", loc)}/año — dilución leve o estable.`
          : `Share count ${fmt(shareCagr, "pct", loc)}/year — mild or stable dilution.`;
  } else {
    data = loc === "es" ? "Asignación de capital: sin serie de acciones." : "Capital allocation: no share-count series.";
  }

  const interpretation =
    severe === true || status === "fail"
      ? loc === "es"
        ? "Dilución material — los accionistas existentes pierden peso en el negocio."
        : "Material dilution — existing shareholders lose weight in the business."
      : status === "pass"
        ? loc === "es"
          ? "Capital devuelto o acciones estables — favorable para el accionista a largo plazo."
          : "Capital returned or stable share count — favorable for long-term holders."
        : loc === "es"
          ? "Sin recompras claras ni dilución severa — lectura neutra."
          : "No clear buybacks nor severe dilution — neutral read.";

  return { data, meaning, interpretation };
}

function formatPriceToBook(
  facts: ThesisFact[],
  status: CheckDisplayStatus,
  loc: "es" | "en",
): FormattedAttractivenessCheck {
  const pb = factNum(facts, "calc:price_to_book");

  const meaning = loc === "es"
    ? "Precio / valor contable (P/B). Relevante en bancos, aseguradoras y negocios patrimoniales. <1,5× suele ser barato; >3×, exigente."
    : "Price-to-book (P/B). Relevant for banks, insurers and asset-heavy businesses. <1.5× often cheap; >3× demanding.";

  const data =
    pb != null
      ? loc === "es"
        ? `P/B ${fmt(pb, "x", loc)} (precio de mercado vs valor contable por acción).`
        : `P/B ${fmt(pb, "x", loc)} (market price vs book value per share).`
      : loc === "es"
        ? "P/B: sin dato."
        : "P/B: not available.";

  const interpretation =
    status === "skipped"
      ? loc === "es"
        ? "Este check no aplica al tipo de negocio (no es financiera/conglomerado patrimonial)."
        : "This check does not apply to this business type (not financial/asset-heavy)."
      : status === "pass"
        ? loc === "es"
          ? "Cotiza con descuento o prima moderada sobre el valor contable."
          : "Trades at a discount or moderate premium to book value."
        : status === "fail"
          ? loc === "es"
            ? "Prima alta sobre el valor contable — el mercado paga mucho por activo."
            : "High premium to book — the market pays a lot per dollar of assets."
          : loc === "es"
            ? "P/B en zona intermedia o sin benchmark claro."
            : "P/B in a middle zone or without a clear benchmark.";

  return { data, meaning, interpretation };
}
